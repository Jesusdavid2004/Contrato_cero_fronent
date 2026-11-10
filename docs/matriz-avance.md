# Matriz de avance — frontend (rama feat/realtime-client)

Repo `Contrato_cero_fronent`. Solo hechos verificados.

| Requisito | Estado | Commit | Prueba |
|---|---|---|---|
| Cliente WS: ticket, backoff+jitter, dedup eventId, watermark por job, snapshot reinicia | Hecho | `0232237` Observa el analisis por WebSocket… | `src/services/realtime.test.ts` 6/6 |
| Sustituir polling por WS + fallback HTTP acotado (mismo backoff, 10 min, terminal) | Hecho | `0232237` | `npm test` 19/19; `type-check` pasa; contrato real contra backend pendiente |
| Pruebas del cliente (suscripcion, etapas, fallo, snapshot terminal, reconexion, agotamiento) | Hecho | commit pruebas | 6/6 con socket simulado |
| Compatibilidad ES/EN, tema, rutas | Sin cambios | — | `i18n:check` 143 claves OK |
| Mensaje `errors.staging_expired` ES/EN | Hecho | `01dd4d0` | Paridad 143 claves |
| Mensajes fase 6 (datos, cláusula, propuesta) ES/EN | Hecho | `1d2abb6` | Paridad 147 claves |

## Fase 4 — Next.js App Router en `web/` (raíz propia)

| Requisito | Estado | Commit | Prueba |
|---|---|---|---|
| Base Next 15.5.29 + TS 6.0.3 (15 rechaza TS 7; 16 solo canary) | Hecho | dep + `498d30d` | `next build` OK |
| SSG `/`, `/ayuda`, `/privacidad` sin sesión | Hecho | `7ffce75`+`169a26e` | `.html` en build; smoke sin fugas |
| ISR `/cobertura` (1h) y `/guias/[slug]` con manifiesto real | Hecho | `1c01060`+`af7feb1` | `cobertura.html` + `1h 1y` en tabla; `●` con 2 slugs |
| SSR `/historial` con canje refresh en servidor, `no-store` | Hecho | `93aeb09`+`65da59a` | Unit 4/4; smoke 307 sin cookie, lista con cookie |
| CSR `/analizar` (shell, token en memoria, visor diferido) | Hecho | `035eb2b`+`3b1e0b0` | `ƒ` sin fetches de servidor; suite Vite intacta |
| Streaming `/contratos/[id]` + `ContractLive` (WSS directo, BFF ticket) | Hecho | `26f5a44` | Smoke: shell ~12 ms, detalle ~1219 ms, 10 chunks |
| `docs/rendering.md` + `web/Dockerfile` verificado | Hecho | `4f2fc7e` | `docker build` OK (353 MB); contenedor sirve 200/307 |
| Aislamiento en `web/` (raíz Vite intacta) | Hecho | `d55cd86` | Vite 26/26 + type-check verdes |
| Origen `:3000` en WS dev (backend) | Hecho | backend `cf23eeb` | Suite backend 11/11 intacta |

## Pendientes honestos

- **Integración real**: `uploadAndAnalyzeContract` contra backend con WS no
  ejecutada (requiere ambos servicios corriendo). Hacer con `npm run dev`
  + backend antes de declarar el requisito cerrado.
- **Railway Next**: `web/Dockerfile` verificado localmente; el cambio de
  servicio (Dockerfile Path + variables) es manual y no ejecutado.
- **SSG bilingüe**: páginas estáticas hornean `es` (cookie vacía en build);
  `en` estático por locale pendiente.
- **Siguientes fases sin empezar**: cobertura/fuentes/RAG por scope,
  resumen/propuestas, carta selectiva, chat con citas, diff, agenda `.ics`,
  informe/revisión humana, retención total, hardening E2E.
- Push a `origin` no realizado (solo commits locales).
