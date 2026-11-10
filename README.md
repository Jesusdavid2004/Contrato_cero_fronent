# Contrato_cero_fronent

Frontend (React 19 + Vite + Tailwind 4) de ContratoClaro.

Backend: https://github.com/Jesusdavid2004/Contrato_ceroO (este repo quedará como solo-backend).

## Dev local

```powershell
npm ci
npm run dev
```

Vite proxea `/api` a `http://127.0.0.1:3001` (ver `vite.config.js`).
Para apuntar a otro backend:

```powershell
$env:VITE_API_URL="https://tu-backend.onrender.com"; npm run dev
```

## Build

```powershell
npm ci
npm run build
```
