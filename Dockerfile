FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json .npmrc ./
COPY packages/ ./packages/
COPY apps/ ./apps/
COPY content/ ./content/

RUN pnpm install --frozen-lockfile
RUN pnpm build

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

CMD ["node", "apps/server/dist/server.js"]
