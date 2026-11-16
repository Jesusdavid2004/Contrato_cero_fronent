import { describe, expect, it, vi, afterEach } from 'vitest';
import { askAssistant, getContractGuidance, parseSseStream } from './assistant';
import { ContractApiError } from './contracts';

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

async function collect(chunks: string[]) {
  const events = [];
  for await (const event of parseSseStream(streamOf(chunks))) events.push(event);
  return events;
}

const MESSAGE = {
  id: 'm1',
  contract_id: 'c1',
  role: 'assistant',
  content: 'Hola [S1]',
  citations: [{ source_id: 'S1', kind: 'clause', label: 'clause:c1', quote: 'q', source_url: null, verified_at: null }],
  grounded: true,
  created_at: '2026-11-16T00:00:00.000Z',
};

function sseResponse(chunks: string[], status = 200): Response {
  return new Response(streamOf(chunks), { status, headers: { 'Content-Type': 'text/event-stream' } });
}

afterEach(() => vi.unstubAllGlobals());

describe('parseSseStream', () => {
  it('reassembles events split across chunks and ignores incomplete tails', async () => {
    const events = await collect(['event: token\nda', 'ta: {"text":"a"}\n\nevent: done\ndata: {"x":1}\n\nevent: tok']);
    expect(events).toEqual([
      { event: 'token', data: '{"text":"a"}' },
      { event: 'done', data: '{"x":1}' },
    ]);
  });

  it('handles CRLF line endings', async () => {
    const events = await collect(['event: token\r\ndata: {"text":"b"}\r\n\r\n']);
    expect(events).toEqual([{ event: 'token', data: '{"text":"b"}' }]);
  });
});

describe('askAssistant', () => {
  it('forwards tokens and resolves with the validated final message', async () => {
    const fetchMock = vi.fn(async () => sseResponse([
      'event: token\ndata: {"text":"Hola "}\n\n',
      'event: token\ndata: {"text":"[S1]"}\n\n',
      `event: done\ndata: ${JSON.stringify(MESSAGE)}\n\n`,
    ]));
    vi.stubGlobal('fetch', fetchMock);
    const tokens: string[] = [];
    const message = await askAssistant('c1', 'Pregunta?', 'tok', { onToken: (text) => tokens.push(text) });
    expect(tokens.join('')).toBe('Hola [S1]');
    expect(message.citations[0].source_id).toBe('S1');
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Accept).toBe('text/event-stream');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('maps an HTTP error body to its message key', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ code: 'AssistantQuotaExceededError', message_key: 'errors.assistant_quota_exceeded' }),
      { status: 429 },
    )));
    await expect(askAssistant('c1', 'q', 't', { onToken: () => undefined }))
      .rejects.toMatchObject({ messageKey: 'errors.assistant_quota_exceeded' });
  });

  it('maps a stream error event to its message key', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => sseResponse([
      'event: error\ndata: {"code":"X","message_key":"errors.ai_provider_unavailable"}\n\n',
    ])));
    await expect(askAssistant('c1', 'q', 't', { onToken: () => undefined }))
      .rejects.toMatchObject({ messageKey: 'errors.ai_provider_unavailable' });
  });

  it('fails when the stream ends without a done event or sends an invalid message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => sseResponse(['event: token\ndata: {"text":"x"}\n\n'])));
    await expect(askAssistant('c1', 'q', 't', { onToken: () => undefined })).rejects.toBeInstanceOf(ContractApiError);
    vi.stubGlobal('fetch', vi.fn(async () => sseResponse(['event: done\ndata: {"id":1}\n\n'])));
    await expect(askAssistant('c1', 'q', 't', { onToken: () => undefined })).rejects.toBeInstanceOf(ContractApiError);
  });
});

describe('getContractGuidance', () => {
  it('validates the response shape', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      contract_id: 'c1', locale: 'es', global_risk_score: 50, pending_legal_updates: 0,
      steps: [{ id: 's', kind: 'k', priority: 1, message_key: 'assistant.plan.x', params: { position: 1 }, clause_id: 'c1' }],
      narration: [],
    }), { status: 200 })));
    const guidance = await getContractGuidance('c1', 't');
    expect(guidance.steps[0].params.position).toBe(1);

    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ steps: 'bad' }), { status: 200 })));
    await expect(getContractGuidance('c1', 't')).rejects.toBeInstanceOf(ContractApiError);
  });
});
