import { z } from 'zod';

/**
 * Cliente del canal de progreso (docs/websocket-protocol.md en el backend).
 * Pide ticket de un solo uso por HTTP autenticado, abre el socket, concilia
 * snapshot y resuelve al llegar a estado terminal. Ante cualquier fallo del
 * socket lanza RealtimeUnavailableError para que el llamador use el fallback
 * HTTP acotado. Nunca envia el access token por el socket.
 */

const serverEventTypeSchema = z.enum([
  'snapshot',
  'stage',
  'completed',
  'failed',
  'notification',
  'error',
  'pong',
]);

const realtimeEventSchema = z.object({
  eventId: z.string().uuid(),
  schemaVersion: z.literal(1),
  type: serverEventTypeSchema,
  contractId: z.string().min(1).max(128).optional(),
  jobId: z.string().min(1).max(128).optional(),
  sequence: z.number().int().nonnegative(),
  occurredAt: z.string().datetime(),
  payload: z.record(z.string(), z.unknown()),
});

export type RealtimeEvent = z.infer<typeof realtimeEventSchema>;

const ticketResponseSchema = z.object({
  ticket: z.string().min(1),
  expiresAt: z.string().datetime(),
});

export class RealtimeUnavailableError extends Error {
  constructor(message = 'realtime unavailable') {
    super(message);
    this.name = 'RealtimeUnavailableError';
  }
}

export interface ContractProgress {
  status: 'READY' | 'FAILED';
  failureMessageKey: string | null;
  globalRiskScore?: number;
}

export interface WatchProgressOptions {
  apiUrl: string;
  token: string;
  contractId: string;
  onStage?: (stage: string) => void;
  maxWaitMs?: number;
  maxReconnects?: number;
  socketForTests?: typeof WebSocket;
}

const DEFAULT_MAX_WAIT_MS = 10 * 60 * 1000;
const DEFAULT_MAX_RECONNECTS = 8;
const BASE_RECONNECT_DELAY_MS = 500;
const SEEN_EVENT_IDS_CAP = 500;

function toWsBase(apiUrl: string): string {
  if (!apiUrl) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }
  if (apiUrl.startsWith('https://')) return `wss://${apiUrl.slice('https://'.length)}`;
  if (apiUrl.startsWith('http://')) return `ws://${apiUrl.slice('http://'.length)}`;
  throw new RealtimeUnavailableError('unsupported api url');
}

async function requestTicket(apiUrl: string, token: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}/api/v1/realtime/ticket`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new RealtimeUnavailableError('ticket request failed');
  }
  if (!response.ok) throw new RealtimeUnavailableError(`ticket status ${response.status}`);
  let body: unknown;
  try {
    body = (await response.json()) as unknown;
  } catch {
    throw new RealtimeUnavailableError('ticket bad json');
  }
  const parsed = ticketResponseSchema.safeParse(body);
  if (!parsed.success) throw new RealtimeUnavailableError('ticket bad shape');
  return parsed.data.ticket;
}

function reconnectDelayMs(attempt: number): number {
  const grown = BASE_RECONNECT_DELAY_MS * 2 ** Math.min(attempt, 6);
  return grown / 2 + Math.random() * grown;
}

/**
 * Observa el analisis por WebSocket hasta READY/FAILED. Resuelve el estado
 * terminal; el detalle se descarga por HTTP aparte.
 */
export function watchContractProgress(options: WatchProgressOptions): Promise<ContractProgress> {
  const maxWaitMs = options.maxWaitMs ?? DEFAULT_MAX_WAIT_MS;
  const maxReconnects = options.maxReconnects ?? DEFAULT_MAX_RECONNECTS;
  const SocketImpl = options.socketForTests ?? WebSocket;

  return new Promise<ContractProgress>((resolve, reject) => {
    const startedAt = Date.now();
    const seenEventIds = new Set<string>();
    let watermark = -1;
    let reconnects = 0;
    let socket: WebSocket | null = null;
    let settled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = (): void => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        if (socket.readyState === SocketImpl.OPEN || socket.readyState === SocketImpl.CONNECTING) {
          socket.close();
        }
        socket = null;
      }
    };

    const failover = (error: Error): void => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const finish = (result: ContractProgress): void => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const emitStage = (stage: string): void => {
      try {
        options.onStage?.(stage);
      } catch {
        // El progreso nunca rompe la espera por un callback del llamador.
      }
    };

    const handleEvent = (event: RealtimeEvent): void => {
      if (seenEventIds.has(event.eventId)) return;
      seenEventIds.add(event.eventId);
      if (seenEventIds.size > SEEN_EVENT_IDS_CAP) {
        const [oldest] = seenEventIds;
        if (oldest) seenEventIds.delete(oldest);
      }
      if (event.contractId && event.contractId !== options.contractId) return;

      switch (event.type) {
        case 'snapshot': {
          // Reinicio autoritativo del watermark (ver protocolo).
          watermark = -1;
          const status = (event.payload as { status?: unknown }).status;
          if (typeof status === 'string') emitStage(status);
          if (status === 'READY' || status === 'FAILED') {
            finish({
              status,
              failureMessageKey: typeof (event.payload as { failureMessageKey?: unknown }).failureMessageKey === 'string'
                ? (event.payload as { failureMessageKey: string }).failureMessageKey
                : null,
            });
          }
          return;
        }
        case 'stage': {
          if (event.sequence <= watermark) return;
          watermark = event.sequence;
          const status = (event.payload as { status?: unknown }).status;
          if (typeof status === 'string') emitStage(status);
          return;
        }
        case 'completed': {
          if (event.sequence <= watermark) return;
          watermark = event.sequence;
          const score = (event.payload as { globalRiskScore?: unknown }).globalRiskScore;
          finish({
            status: 'READY',
            failureMessageKey: null,
            globalRiskScore: typeof score === 'number' ? score : undefined,
          });
          return;
        }
        case 'failed': {
          if (event.sequence <= watermark) return;
          watermark = event.sequence;
          const key = (event.payload as { failureMessageKey?: unknown }).failureMessageKey;
          finish({
            status: 'FAILED',
            failureMessageKey: typeof key === 'string' ? key : null,
          });
          return;
        }
        case 'error': {
          const code = (event.payload as { code?: unknown }).code;
          if (code === 'FORBIDDEN' || code === 'NOT_FOUND') {
            failover(new RealtimeUnavailableError(`subscription ${String(code).toLowerCase()}`));
          }
          return;
        }
        default:
          return;
      }
    };

    const scheduleReconnect = (): void => {
      if (settled) return;
      if (Date.now() - startedAt > maxWaitMs) {
        failover(new RealtimeUnavailableError('progress timeout'));
        return;
      }
      if (reconnects >= maxReconnects) {
        failover(new RealtimeUnavailableError('reconnects exhausted'));
        return;
      }
      reconnects += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        void openSocket();
      }, reconnectDelayMs(reconnects));
    };

    const openSocket = async (): Promise<void> => {
      if (settled) return;
      let ticket: string;
      try {
        ticket = await requestTicket(options.apiUrl, options.token);
      } catch (error) {
        failover(error instanceof Error ? error : new RealtimeUnavailableError());
        return;
      }
      if (settled) return;
      let base: string;
      try {
        base = toWsBase(options.apiUrl);
      } catch (error) {
        failover(error instanceof Error ? error : new RealtimeUnavailableError());
        return;
      }
      const next = new SocketImpl(`${base}/api/v1/realtime?ticket=${encodeURIComponent(ticket)}`);
      socket = next;
      next.onopen = () => {
        next.send(JSON.stringify({ action: 'subscribe', contractId: options.contractId }));
      };
      next.onmessage = (message: MessageEvent) => {
        let raw: unknown;
        try {
          raw = JSON.parse(String(message.data)) as unknown;
        } catch {
          return;
        }
        const parsed = realtimeEventSchema.safeParse(raw);
        if (!parsed.success) return;
        handleEvent(parsed.data);
      };
      next.onerror = () => {
        // El reintento se decide en onclose para no duplicar.
      };
      next.onclose = (closeEvent: CloseEvent) => {
        if (settled || socket !== next) return;
        socket = null;
        if (closeEvent.code === 1000) {
          failover(new RealtimeUnavailableError('socket closed'));
          return;
        }
        scheduleReconnect();
      };
    };

    void openSocket();
  });
}
