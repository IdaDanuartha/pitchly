# syntax=docker/dockerfile:1

FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Avatar portrait image URLs are inlined at build time (NEXT_PUBLIC_*).
ARG NEXT_PUBLIC_AVATAR_TEKNIS=""
ARG NEXT_PUBLIC_AVATAR_DAMPAK=""
ARG NEXT_PUBLIC_AVATAR_SKEPTIS=""
ENV NEXT_PUBLIC_AVATAR_TEKNIS=$NEXT_PUBLIC_AVATAR_TEKNIS
ENV NEXT_PUBLIC_AVATAR_DAMPAK=$NEXT_PUBLIC_AVATAR_DAMPAK
ENV NEXT_PUBLIC_AVATAR_SKEPTIS=$NEXT_PUBLIC_AVATAR_SKEPTIS
RUN pnpm build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
