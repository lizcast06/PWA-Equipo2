import { readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Solo el Dockerfile activa la salida standalone; en local y en CI se usa next start.
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  // Identidad de la versión, fija al compilar (src/lib/version.ts).
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.APP_VERSION || version,
    NEXT_PUBLIC_GIT_SHA: process.env.GIT_SHA || "local",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
          },
          {
            // Solo tiene efecto sobre HTTPS; en http://localhost el navegador lo ignora.
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), geolocation=(self), microphone=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
