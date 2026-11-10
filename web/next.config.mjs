// HTTP hacia Express por el mismo origen (las cookies de sesion fluyen).
// En Railway prod sera la URL privada del API; en dev, localhost.
const BACKEND_URL = process.env.BACKEND_INTERNAL_URL ?? 'http://127.0.0.1:3001';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Servidor Node (no export estatico): SSR/ISR/streaming requieren runtime.
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
