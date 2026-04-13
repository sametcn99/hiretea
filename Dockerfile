FROM oven/bun:latest AS base
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM base AS development
COPY . .
RUN bun run db:generate
CMD ["bun", "run", "dev", "--hostname", "0.0.0.0", "--port", "3000"]

FROM base AS builder
COPY . .
RUN bun run db:generate && bun run build

FROM oven/bun:latest AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/.next/standalone/server.js ./server.js
COPY --from=builder /app/bun.lock ./bun.lock
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./tsconfig.json
CMD ["bun", "run", "start"]
