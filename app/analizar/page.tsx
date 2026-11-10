'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import '../../src/i18n';
import { FileDropzone } from '../../src/components/FileDropzone';
import {
  ContractApiError,
  uploadAndAnalyzeContract,
  type ContractAnalysisResult,
} from '../../src/services/contracts';

const ResultsViewer = dynamic(() => import('./results-view').then((module) => module.ResultsView), {
  loading: () => <p>Cargando visor de resultados…</p>,
  ssr: false,
});

/**
 * CSR: shell minimo estatico; los datos privados se obtienen en el navegador
 * autenticado (token solo en memoria, como el SPA) y el visor carga diferido.
 */
export default function AnalizarPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [result, setResult] = useState<ContractAnalysisResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const signIn = async (): Promise<void> => {
    setAuthError(null);
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        setAuthError('Credenciales inválidas.');
        return;
      }
      const body = (await response.json()) as { accessToken?: unknown };
      if (typeof body.accessToken !== 'string') {
        setAuthError('Respuesta de sesión inválida.');
        return;
      }
      setToken(body.accessToken);
    } catch {
      setAuthError('No se pudo iniciar sesión.');
    }
  };

  const analyze = async (file: File): Promise<void> => {
    if (!token) return;
    setIsUploading(true);
    setUploadError(null);
    setResult(null);
    try {
      const analysis = await uploadAndAnalyzeContract(file, 'es', token, setStage);
      setResult(analysis);
    } catch (error) {
      setUploadError(error instanceof ContractApiError ? error.messageKey : 'errors.api_error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1rem' }}>
      <h1>Analizar contrato</h1>
      {!token ? (
        <section>
          <label>
            Correo
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button type="button" onClick={() => void signIn()}>
            Iniciar sesión
          </button>
          {authError ? <p role="alert">{authError}</p> : null}
        </section>
      ) : (
        <section>
          <FileDropzone isUploading={isUploading} stage={stage} onFile={(file) => void analyze(file)} />
          {stage ? <p>Etapa: {stage}</p> : null}
          {uploadError ? <p role="alert">{uploadError}</p> : null}
          {result ? <ResultsViewer result={result} /> : null}
        </section>
      )}
    </main>
  );
}
