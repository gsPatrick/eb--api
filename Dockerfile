FROM node:20-alpine AS base

WORKDIR /app

RUN apk add --no-cache tini

FROM base AS deps

COPY package.json package-lock.json* ./

RUN npm install --omit=dev && npm cache clean --force

FROM base AS runner

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN mkdir -p public/uploads/avatars

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/v1/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "app.js"]
