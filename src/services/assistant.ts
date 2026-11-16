import { z } from 'zod';
import { ContractApiError, getErrorKey } from './contracts';

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? '';
const EVENT_STREAM = 'text/event-stream';

const citationSchema = z.object({
  source_id: z.string(),
  kind: z.enum(['clause', 'fact', 'legal', 'update', 'news']),
  label: z.string(),
  quote: z.string(),
  source_url: z.string().nullable(),
  verified_at: z.string().nullable(),
});

const assistantMessageSchema = z.object({
  id: z.string(),
  contract_id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  citations: z.array(citationSchema),
  grounded: z.boolean(),
  created_at: z.string(),
});

const guidanceItemSchema = z.object({
  id: z.string(),
  kind: z.string(),
  priority: z.number().optional(),
  message_key: z.string(),
  params: z.record(z.string(), z.union([z.string(), z.number()])),
  clause_id: z.string().nullable(),
});

const guidanceSchema = z.object({
  contract_id: z.string(),
  locale: z.string(),
  global_risk_score: z.number(),
  pending_legal_updates: z.number(),
  steps: z.array(guidanceItemSchema),
  narration: z.array(guidanceItemSchema),
});

const legalUpdateSchema = z.object({
  id: z.string(),
  source_id: z.string(),
  tema: z.string(),
  kind: z.enum(['norm_change', 'news']),
  title: z.string(),
  source_url: z.string(),
  detected_at: z.string(),
});

export type AssistantCitation = z.infer<typeof citationSchema>;
export type AssistantMessage = z.infer<typeof assistantMessageSchema>;
export type GuidanceItem = z.infer<typeof guidanceItemSchema>;
export type ContractGuidance = z.infer<typeof guidanceSchema>;
export type LegalUpdate = z.infer<typeof legalUpdateSchema>;

export interface SseEvent {
  event: string;
  data: string;
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json() as unknown;
  } catch {
    throw new ContractApiError('errors.api_error');
  }
}

async function requestJson(url: string, token: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, {
    credentials: 'include',
    ...init,
    headers: { ...init?.headers, ...authHeaders(token) },
  });
  const body = await readJson(response);
  if (!response.ok) throw new ContractApiError(getErrorKey(body));
  return body;
}

function parseWith<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new ContractApiError('errors.api_error');
  return parsed.data;
}

/** Splits a text/event-stream body into events. Handles chunks that cut an event in half. */
export async function* parseSseStream(body: ReadableStream<Uint8Array>): AsyncGenerator<SseEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const flushBlock = (block: string): SseEvent | null => {
    let event = 'message';
    const data: string[] = [];
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) event = line.slice('event:'.length).trim();
      else if (line.startsWith('data:')) data.push(line.slice('data:'.length).trim());
    }
    return data.length > 0 ? { event, data: data.join('\n') } : null;
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
    let separator = buffer.indexOf('\n\n');
    while (separator >= 0) {
      const parsed = flushBlock(buffer.slice(0, separator));
      buffer = buffer.slice(separator + 2);
      if (parsed) yield parsed;
      separator = buffer.indexOf('\n\n');
    }
  }
  const tail = flushBlock(buffer.trim());
  if (tail) yield tail;
}

export interface AskCallbacks {
  onToken: (text: string) => void;
  signal?: AbortSignal;
}

/**
 * Streams the assistant answer. Resolves with the stored message from the final
 * `done` event; rejects with a ContractApiError carrying a translatable key.
 */
export async function askAssistant(
  contractId: string,
  question: string,
  token: string,
  callbacks: AskCallbacks,
): Promise<AssistantMessage> {
  const response = await fetch(
    `${API_URL}/api/contracts/${encodeURIComponent(contractId)}/assistant/messages`,
    {
      method: 'POST',
      credentials: 'include',
      signal: callbacks.signal,
      headers: { ...authHeaders(token), 'Content-Type': 'application/json', Accept: EVENT_STREAM },
      body: JSON.stringify({ question }),
    },
  );
  if (!response.ok) throw new ContractApiError(getErrorKey(await readJson(response)));
  if (!response.body) throw new ContractApiError('errors.api_error');

  for await (const { event, data } of parseSseStream(response.body)) {
    const payload = JSON.parse(data) as unknown;
    if (event === 'token') {
      const text = parseWith(z.object({ text: z.string() }), payload).text;
      callbacks.onToken(text);
    } else if (event === 'done') {
      return parseWith(assistantMessageSchema, payload);
    } else if (event === 'error') {
      throw new ContractApiError(getErrorKey(payload));
    }
  }
  throw new ContractApiError('errors.api_error');
}

export async function listAssistantMessages(contractId: string, token: string): Promise<AssistantMessage[]> {
  const body = await requestJson(
    `${API_URL}/api/contracts/${encodeURIComponent(contractId)}/assistant/messages`,
    token,
  );
  return parseWith(z.array(assistantMessageSchema), body);
}

export async function clearAssistantConversation(contractId: string, token: string): Promise<void> {
  await requestJson(
    `${API_URL}/api/contracts/${encodeURIComponent(contractId)}/assistant/messages`,
    token,
    { method: 'DELETE' },
  );
}

export async function getContractGuidance(contractId: string, token: string): Promise<ContractGuidance> {
  const body = await requestJson(
    `${API_URL}/api/contracts/${encodeURIComponent(contractId)}/guidance`,
    token,
  );
  return parseWith(guidanceSchema, body);
}

export async function listLegalUpdates(token: string, tema?: string): Promise<LegalUpdate[]> {
  const query = tema ? `?tema=${encodeURIComponent(tema)}` : '';
  const body = await requestJson(`${API_URL}/api/legal/updates${query}`, token);
  return parseWith(z.array(legalUpdateSchema), body);
}
