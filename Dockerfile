# Imagen reproducible de la PWA (semana 10). Versión fija de Node, dependencias del lockfile.
# docker build -t pwa-inspecciones:<sha> --build-arg APP_VERSION=<version> --build-arg GIT_SHA=<sha> .
FROM node:22.22.0-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22.22.0-bookworm-slim AS build
WORKDIR /app
ARG APP_VERSION=
ARG GIT_SHA=local
ENV NEXT_TELEMETRY_DISABLED=1 BUILD_STANDALONE=1 APP_VERSION=$APP_VERSION GIT_SHA=$GIT_SHA
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# La imagen final solo lleva el servidor compilado y los archivos públicos, sin código de
# pruebas ni dependencias de desarrollo, y corre con un usuario sin privilegios.
FROM node:22.22.0-bookworm-slim AS runner
WORKDIR /app
ARG APP_VERSION=
ARG GIT_SHA=local
LABEL org.opencontainers.image.title="pwa-inspecciones" \
      org.opencontainers.image.version="$APP_VERSION" \
      org.opencontainers.image.revision="$GIT_SHA"
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
