'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { RealtimeUnavailableError, watchContractProgress } from '../../../src/services/realtime';

const bffTicketSchema = z.object({
  ticket: z.string().min(1),
});

function apiHttpBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? '';
}

/**
 * Componente cliente pequeno: sigue el progreso por WSS directo a la API e
 * invalida los datos del servidor al terminar. Sin URL del API configurada
 * ofrece solo actualizacion manual (degradacion honesta).
 */
export function ContractLive({ contractId, initialStatus }: { contractId: string; initialStatus: string }) {
  const router = useRouter();
  const [stage, setStage] = useState<string | null>(null);
  const [live, setLive] = useState<boolean>(true);

  useEffect(() => {
    if (initialStatus === 'READY' || initialStatus === 'FAILED') return;
    const base = apiHttpBase();
    if (!base) {
      setLive(false);
      return;
    }
    let cancelled = false;
    const getTicket = async (): Promise<string> => {
      const response = await fetch('/api/realtime-ticket', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new RealtimeUnavailableError('bff ticket failed');
      const body = (await response.json()) as unknown;
      const parsed = bffTicketSchema.safeParse(body);
      if (!parsed.success) throw new RealtimeUnavailableError('bff ticket bad shape');
      return parsed.data.ticket;
    };
    watchContractProgress({
      apiUrl: base,
      token: '',
      contractId,
      onStage: (next) => {
        if (!cancelled) setStage(next);
      },
      getTicket,
    }).then(
      () => {
        if (!cancelled) router.refresh();
      },
      () => {
        if (!cancelled) setLive(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [contractId, initialStatus, router]);

  if (initialStatus === 'READY' || initialStatus === 'FAILED') return null;
  return (
    <p aria-live="polite">
      {stage ? `Etapa en vivo: ${stage}` : live ? 'Conectando progreso en vivo…' : 'Progreso en vivo no disponible.'}{' '}
      <button type="button" onClick={() => router.refresh()}>
        Actualizar
      </button>
    </p>
  );
}
