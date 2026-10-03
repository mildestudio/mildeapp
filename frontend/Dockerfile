FROM node:22.16.0-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

FROM node:22.16.0-alpine AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /app/build ./build
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
USER node
EXPOSE 3000
CMD ["node", "build"]
