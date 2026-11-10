# Rendering — frontend Next.js (App Router 15.5.29)

Migración gradual del SPA Vite a Next.js **en el mismo repo** (`web/` con raíz
propia; el Vite sigue intacto y desplegado). Express conserva reglas,
autorización y datos; Next no toca PostgreSQL. Versión fijada por
compatibilidad verificada: Next 15.5.29 + TypeScript 6.0.3 (Next 15 rechaza
TS 7; Next 16 solo canary al decidir).

## Mapa de patrones (verificado en `next build`, no en apariencia)

| Ruta | Patrón | Decisión y configuración | Prueba | Limitaciones |
|---|---|---|---|---|
| `/` | SSG | `force-static`; HTML en build, sin sesión | `web/.next/server/app/index.html` existe; sin emails | Localidad `es` horneada (cookie vacía en build) |
| `/ayuda` | SSG | `force-static`; copia pública bilingüe por `cc_locale` | `ayuda.html` existe | Igual localidad que `/` |
| `/privacidad` | SSG | `force-static`; reutiliza claves `privacy.*` | `privacidad.html` existe | Igual localidad que `/` |
| `/cobertura` | ISR | `force-static` + `revalidate = 3600`; manifiesto real `legal-coverage.json` | `cobertura.html` existe; tabla muestra `1h 1y` | Sin `generateStaticParams` (ruta única); fallo de revalidación conserva última versión (semántica del runtime) |
| `/guias/[slug]` | ISR | `generateStaticParams` (2 slugs) + `revalidate = 3600` | `●` con ambas rutas en build | Contenido educativo sintético (complementa, no sustituye) |
| `/historial` | SSR | `force-dynamic` + `revalidate = 0`; canje refresh→access en memoria del request; `no-store` | Smoke: sin cookie redirige a `/login`; con cookie lista de Express | Requiere cookie `cc_refresh_token` mismo-origen (rewrites `/api`) |
| `/analizar` | CSR | Shell sin datos de servidor; login+token en memoria; visor con `dynamic(ssr:false)` | `ƒ` sin fetches de servidor; pruebas Vitest del cliente WS | Sin historial SSR aquí; el token no sale del estado React |
| `/contratos/[id]` | Streaming SSR | Autorización antes de emitir; shell + `<Suspense>` sobre hijo async; `ContractLive` invalida por WS | Smoke con stub lento: shell en chunk 1, detalle tras ~1.2 s (ver abajo) | Sin retrasos artificiales en prod; `ContractLive` necesita `NEXT_PUBLIC_API_URL` o degrada a botón |
| `/api/realtime-ticket` | BFF transporte | Route Handler: cookie→sesión→ticket 1 uso; no reglas ni DB | 401 sin cookie; 201+ticket con cookie (smoke) | Solo transporte |

## Autenticación SSR sin tokens en JS

`web/next-lib/server-auth.ts`: `exchangeRefreshForSession(cookie, apiBase)` canjea
la httpOnly contra Express y guarda el access token solo en memoria del request.
Nada en `localStorage`, nada serializado al HTML. Pruebas:
`web/next-lib/server-auth.test.ts` (4/4).

## Ruta del WebSocket

Sin `rewrite` para el upgrade (Next no lo garantiza): el navegador abre WSS
**directo a la API** (`NEXT_PUBLIC_API_URL` → `wss`), con ticket de un solo uso
del BFF y allowlist de Origin en Express (incluye `:3000` en dev). HTTP Same-origin
vía `rewrites` en `web/next.config.mjs` para que las cookies fluyan.

## ISR: caché y despliegues

Caché en `.next` (filesystem). Una sola réplica web: coherente por diseño;
tras redeploy la caché se reconstruye y la primera visita regenera. Sin
coherencia multi-instancia declarada. `standalone` en `web/Dockerfile`.

## Docker y Railway

`web/Dockerfile` (contexto = raíz del repo: necesita `package.json`, `web/` y
`src/` porque Next reutiliza servicios del SPA). Verificado de verdad:
`docker build` OK (353 MB), contenedor sirve `GET /ayuda` → 200 y
`GET /historial` sin cookie → 307 a `/login`. Detalles: standalone con
`outputFileTracing` mínimo (81 MB de `node_modules`); se elimina el
`"type": "module"` heredado en el runner porque `server.js` es CommonJS;
healthcheck contra `/ayuda`.

Cambio a Railway (manual, pendiente de autorización, sin tocar producción):
en el servicio web, `Source` sigue en `Contrato_cero_fronent`, `Root Directory`
vacío, `Dockerfile Path = web/Dockerfile`, Builder Dockerfile; variables:
`BACKEND_INTERNAL_URL` = URL privada del API
(`contratoclaro-api.railway.internal:3001` o como la exponga el proyecto),
`NEXT_PUBLIC_API_URL` = URL pública del API para el WSS directo,
`PORT` lo inyecta Railway. El servicio actual Nginx/Vite queda reemplazado
solo cuando se aplique este cambio; no hacer ambos a la vez.

## Evidencia del smoke (stub lento 1.2 s, `next start`, 14/14 SMOKE-OK)

- `GET /` → 200 (7076 B) sin `u@x.co` ni tokens.
- `GET /cobertura` → 200 con manifiesto real (CO, 20, arriendo/consumo).
- `GET /guias/leer-un-arriendo` → 200.
- `GET /historial` sin cookie → 307 a `/login`.
- `GET /historial` con `cc_refresh_token=good` → 200 con `Arriendo 2026` y `Uma`.
- `GET /contratos/c1` con cookie → 10 chunks: shell en ~12 ms,
  detalle con `Reajuste unilateral` a ~1219 ms → streaming real.
- `POST /api/realtime-ticket` sin cookie → 401; con cookie → 201 + ticket.
