import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Iniciar sesión — ContratoClaro',
};

/**
 * Marcador CSR: el login vive en el SPA Vite durante la migracion gradual
 * (usa token en memoria, sin localStorage). Esta ruta solo redirige al
 * destino de autenticacion para no duplicar el flujo a medias.
 */
export default function LoginPage() {
  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '3rem 1rem' }}>
      <h1>Iniciar sesión</h1>
      <p>
        El inicio de sesión continúa en la aplicación actual mientras migramos
        las rutas una por una.
      </p>
      <p>
        <a href="/analizar">Ir a analizar</a>
      </p>
    </main>
  );
}
