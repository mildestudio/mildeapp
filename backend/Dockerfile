FROM node:22.16.0-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npx prisma generate && npm run build

FROM node:22.16.0-alpine AS production-dependencies
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22.16.0-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app

COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/prisma.config.ts ./prisma.config.ts
COPY --from=build --chown=node:node /app/package.json ./package.json

USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
