import { useCallback, useEffect, useRef, useState } from 'react';
import {
  askAssistant,
  clearAssistantConversation,
  listAssistantMessages,
  type AssistantMessage,
} from '../services/assistant';
import { ContractApiError } from '../services/contracts';

export type ChatStatus = 'loading_history' | 'idle' | 'streaming';

export interface AssistantChat {
  messages: AssistantMessage[];
  /** Text of the answer being streamed; empty when idle. */
  draft: string;
  status: ChatStatus;
  errorKey: string | null;
  historyFailed: boolean;
  send: (question: string) => Promise<void>;
  clear: () => Promise<void>;
  reloadHistory: () => void;
}

const ERROR_FALLBACK = 'errors.api_error';

function errorKeyOf(error: unknown): string {
  return error instanceof ContractApiError ? error.messageKey : ERROR_FALLBACK;
}

function optimisticUserMessage(contractId: string, question: string): AssistantMessage {
  return {
    id: `pending-${Date.now()}`,
    contract_id: contractId,
    role: 'user',
    content: question,
    citations: [],
    grounded: true,
    created_at: new Date().toISOString(),
  };
}

/** Conversation state for one contract. Components render it; this hook owns the network. */
export function useAssistantChat(contractId: string, token: string | null): AssistantChat {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<ChatStatus>('loading_history');
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [historyFailed, setHistoryFailed] = useState(false);
  const [reloadCounter, setReloadCounter] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setStatus('loading_history');
    setHistoryFailed(false);
    listAssistantMessages(contractId, token)
      .then((history) => {
        if (!cancelled) setMessages(history);
      })
      .catch(() => {
        if (!cancelled) setHistoryFailed(true);
      })
      .finally(() => {
        if (!cancelled) setStatus('idle');
      });
    return () => {
      cancelled = true;
    };
  }, [contractId, token, reloadCounter]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const send = useCallback(async (question: string) => {
    const trimmed = question.trim();
    if (!token || !trimmed || status === 'streaming') return;
    setErrorKey(null);
    setDraft('');
    setStatus('streaming');
    setMessages((current) => [...current, optimisticUserMessage(contractId, trimmed)]);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const reply = await askAssistant(contractId, trimmed, token, {
        signal: controller.signal,
        onToken: (text) => setDraft((current) => current + text),
      });
      setMessages((current) => [...current, reply]);
    } catch (error) {
      if (!controller.signal.aborted) setErrorKey(errorKeyOf(error));
    } finally {
      setDraft('');
      setStatus('idle');
    }
  }, [contractId, status, token]);

  const clear = useCallback(async () => {
    if (!token) return;
    setErrorKey(null);
    try {
      await clearAssistantConversation(contractId, token);
      setMessages([]);
    } catch (error) {
      setErrorKey(errorKeyOf(error));
    }
  }, [contractId, token]);

  const reloadHistory = useCallback(() => setReloadCounter((count) => count + 1), []);

  return { messages, draft, status, errorKey, historyFailed, send, clear, reloadHistory };
}
