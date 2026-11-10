# Next.js web (standalone). Contexto: raiz del repo (necesita package.json,
# web/ y src/ porque la app Next reutiliza servicios del SPA).
FROM node:22-alpine AS deps

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder

ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json ./
COPY web ./web
COPY src ./src
RUN npm run build:next

FROM node:22-alpine AS runner

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
COPY --from=builder --chown=nextjs:nextjs /app/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/web/.next/static ./web/.next/static
# El standalone genera server.js en CommonJS pero hereda "type": "module" del
# package.json raiz (Vite lo exige); sin esto node lo interpreta como ESM y cae.
RUN node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('/app/package.json','utf8'));delete p.type;fs.writeFileSync('/app/package.json',JSON.stringify(p));"
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/ayuda || exit 1
CMD ["node", "web/server.js"]
