import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  RealtimeUnavailableError,
  watchContractProgress,
} from './realtime';

type Handler<T> = ((event: T) => void) | null;

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readonly url: string;
  readyState = MockWebSocket.CONNECTING;
  sent: string[] = [];
  onopen: Handler<Event> = null;
  onmessage: Handler<MessageEvent> = null;
  onerror: Handler<Event> = null;
  onclose: Handler<CloseEvent> = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
  }

  open(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }

  receive(payload: unknown): void {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(payload) }));
  }

  fail(code = 1006): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close', { code }));
  }
}

const MockSocket = MockWebSocket as unknown as typeof WebSocket;

function envelope(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    eventId: '00000000-0000-4000-8000-000000000000',
    schemaVersion: 1,
    jobId: 'contract-1',
    contractId: 'contract-1',
    sequence: 0,
    occurredAt: '2026-01-01T00:00:00.000Z',
    payload: {},
    ...overrides,
  };
}

const flush = (): Promise<void> => new Promise((resolve) => {
  setTimeout(resolve, 10);
});

describe('watchContractProgress', () => {
  const realFetch = globalThis.fetch;

  beforeEach(() => {
    MockWebSocket.instances = [];
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ticket: 't-1', expiresAt: '2026-01-01T00:01:00.000Z' }),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it('pide ticket con Bearer y se suscribe al abrir', async () => {
    const pending = watchContractProgress({
      apiUrl: '',
      token: 'tok',
      contractId: 'contract-1',
      socketForTests: MockSocket,
      maxWaitMs: 2_000,
    });
    await flush();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/v1/realtime/ticket',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer tok' },
      }),
    );
    expect(MockWebSocket.instances).toHaveLength(1);
    MockWebSocket.instances[0].open();
    expect(MockWebSocket.instances[0].sent).toEqual([
      JSON.stringify({ action: 'subscribe', contractId: 'contract-1' }),
    ]);
    MockWebSocket.instances[0].receive(envelope({
      eventId: '00000000-0000-4000-8000-000000000001',
      type: 'completed',
      sequence: 2,
      payload: { status: 'READY', globalRiskScore: 35 },
    }));
    await expect(pending).resolves.toEqual({
      status: 'READY',
      failureMessageKey: null,
      globalRiskScore: 35,
    });
  });

  it('emite etapas y resuelve el fallo con su clave', async () => {
    const stages: string[] = [];
    const pending = watchContractProgress({
      apiUrl: 'https://api.test',
      token: 'tok',
      contractId: 'contract-1',
      onStage: (stage) => {
        stages.push(stage);
      },
      socketForTests: MockSocket,
      maxWaitMs: 2_000,
    });
    await flush();
    const socket = MockWebSocket.instances[0];
    expect(socket.url).toBe('wss://api.test/api/v1/realtime?ticket=t-1');
    socket.open();
    socket.receive(envelope({
      eventId: '00000000-0000-4000-8000-000000000001',
      type: 'stage',
      sequence: 1,
      payload: { status: 'ANALYZING' },
    }));
    socket.receive(envelope({
      eventId: '00000000-0000-4000-8000-000000000002',
      type: 'failed',
      sequence: 2,
      payload: { status: 'FAILED', failureMessageKey: 'errors.analysis_failed' },
    }));
    await expect(pending).resolves.toEqual({
      status: 'FAILED',
      failureMessageKey: 'errors.analysis_failed',
    });
    expect(stages).toEqual(['ANALYZING']);
  });

  it('deduplica por eventId y descarta secuencias viejas', async () => {
    const stages: string[] = [];
    const pending = watchContractProgress({
      apiUrl: '',
      token: 'tok',
      contractId: 'contract-1',
      onStage: (stage) => {
        stages.push(stage);
      },
      socketForTests: MockSocket,
      maxWaitMs: 2_000,
    });
    await flush();
    const socket = MockWebSocket.instances[0];
    socket.open();
    const stage = envelope({
      eventId: '00000000-0000-4000-8000-000000000001',
      type: 'stage',
      sequence: 3,
      payload: { status: 'ANALYZING' },
    });
    socket.receive(stage);
    socket.receive(stage);
    socket.receive({
      ...stage,
      eventId: '00000000-0000-4000-8000-000000000002',
      sequence: 1,
    });
    expect(stages).toEqual(['ANALYZING']);
    socket.receive(envelope({
      eventId: '00000000-0000-4000-8000-000000000003',
      type: 'completed',
      sequence: 4,
      payload: { status: 'READY' },
    }));
    await expect(pending).resolves.toMatchObject({ status: 'READY' });
  });

  it('el snapshot terminal resuelve sin esperar mas eventos', async () => {
    const pending = watchContractProgress({
      apiUrl: '',
      token: 'tok',
      contractId: 'contract-1',
      socketForTests: MockSocket,
      maxWaitMs: 2_000,
    });
    await flush();
    const socket = MockWebSocket.instances[0];
    socket.open();
    socket.receive(envelope({
      eventId: '00000000-0000-4000-8000-000000000001',
      type: 'snapshot',
      sequence: 0,
      payload: { status: 'FAILED', failureMessageKey: 'errors.text_extraction_failed' },
    }));
    await expect(pending).resolves.toEqual({
      status: 'FAILED',
      failureMessageKey: 'errors.text_extraction_failed',
    });
  });

  it('reconecta ante un cierre anormal con ticket nuevo', async () => {
    const pending = watchContractProgress({
      apiUrl: '',
      token: 'tok',
      contractId: 'contract-1',
      socketForTests: MockSocket,
      maxWaitMs: 10_000,
    });
    await flush();
    MockWebSocket.instances[0].open();
    MockWebSocket.instances[0].fail();
    let second: MockWebSocket | undefined;
    const started = Date.now();
    while (!second && Date.now() - started < 5_000) {
      await flush();
      second = MockWebSocket.instances[1];
    }
    expect(second).toBeDefined();
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    second?.open();
    expect(second?.sent).toEqual([
      JSON.stringify({ action: 'subscribe', contractId: 'contract-1' }),
    ]);
    second?.receive(envelope({
      eventId: '00000000-0000-4000-8000-000000000009',
      type: 'completed',
      sequence: 5,
      payload: { status: 'READY' },
    }));
    await expect(pending).resolves.toMatchObject({ status: 'READY' });
  });

  it('agota reintentos y cede al fallback HTTP', async () => {
    const pending = watchContractProgress({
      apiUrl: '',
      token: 'tok',
      contractId: 'contract-1',
      socketForTests: MockSocket,
      maxWaitMs: 10_000,
      maxReconnects: 0,
    });
    await flush();
    MockWebSocket.instances[0].open();
    MockWebSocket.instances[0].fail();
    await expect(pending).rejects.toBeInstanceOf(RealtimeUnavailableError);
  });
});
