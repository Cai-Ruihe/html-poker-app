FROM node:24-alpine@sha256:d32cdf619f63fe0471182d08996dd516c6275bb5fd31ae06e55a570bd9e1ad43 AS build

WORKDIR /source

RUN corepack enable && corepack prepare pnpm@11.19.0 --activate

COPY . .

RUN pnpm install --frozen-lockfile --prod=false \
    && pnpm build:service \
    && pnpm --filter @html-poker/connection-service deploy --prod --legacy /release

FROM node:24-alpine@sha256:d32cdf619f63fe0471182d08996dd516c6275bb5fd31ae06e55a570bd9e1ad43

WORKDIR /app

ENV NODE_ENV=production \
    POKER_CONNECTION_HOST=0.0.0.0 \
    POKER_CONNECTION_PORT=8787

COPY --from=build --chown=node:node /release/package.json ./package.json
COPY --from=build --chown=node:node /release/node_modules ./node_modules
COPY --from=build --chown=node:node /release/dist ./dist

USER node

EXPOSE 8787

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8787/health').then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1));"

CMD ["node", "dist/server.js"]
