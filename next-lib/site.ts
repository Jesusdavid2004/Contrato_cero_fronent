/** Base HTTP del API Express vista desde el servidor Next. */
export function backendBaseUrl(): string {
  return process.env.BACKEND_INTERNAL_URL ?? 'http://127.0.0.1:3001';
}

/** Revalidacion ISR de contenido publico (s); configurable sin codigo. */
export function coverageRevalidateSeconds(): number {
  const parsed = Number(process.env.COVERAGE_REVALIDATE_SECONDS ?? '3600');
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 3600;
}
