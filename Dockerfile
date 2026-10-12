FROM node:22-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --production=false

COPY . .

ARG NEXT_PUBLIC_PANTRY_API_URL
ENV NEXT_PUBLIC_PANTRY_API_URL=${NEXT_PUBLIC_PANTRY_API_URL}

# next.config.ts bakes the /v1 proxy target in at build time, so the build needs it too.
ARG PANTRY_API_URL
ENV PANTRY_API_URL=${PANTRY_API_URL}

# Cloudflare Web Analytics beacon token (public — inlined into client bundle at
# build time). Must be pantry's OWN token, not shared with another host.
ARG NEXT_PUBLIC_CF_BEACON_TOKEN
ENV NEXT_PUBLIC_CF_BEACON_TOKEN=${NEXT_PUBLIC_CF_BEACON_TOKEN}

# The runner stage copies /app/public; the repository has none.
RUN mkdir -p public && npm run build

FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
