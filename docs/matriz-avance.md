# Matriz de avance — frontend (rama feat/realtime-client)

Repo `Contrato_cero_fronent`. Solo hechos verificados.

| Requisito | Estado | Commit | Prueba |
|---|---|---|---|
| Cliente WS: ticket, backoff+jitter, dedup eventId, watermark por job, snapshot reinicia | Hecho | `0232237` Observa el analisis por WebSocket… | `src/services/realtime.test.ts` 6/6 |
| Sustituir polling por WS + fallback HTTP acotado (mismo backoff, 10 min, terminal) | Hecho | `0232237` | `npm test` 19/19; `type-check` pasa; contrato real contra backend pendiente |
| Pruebas del cliente (suscripcion, etapas, fallo, snapshot terminal, reconexion, agotamiento) | Hecho | commit pruebas | 6/6 con socket simulado |
| Compatibilidad ES/EN, tema, rutas | Sin cambios | — | `i18n:check` 142 claves OK |

## Pendientes honestos

- **Integración real**: `uploadAndAnalyzeContract` contra backend con WS no
  ejecutada (requiere ambos servicios corriendo). Hacer con `npm run dev`
  + backend antes de declarar el requisito cerrado.
- **Siguientes fases sin empezar**: migración Next.js + 5 patrones, hook
  pequeño en página de resultados, cobertura, carta selectiva, chat, diff,
  agenda, informe, a11y manual, despliegue Railway del server Node.
- Push a `origin` no realizado (solo commits locales).
