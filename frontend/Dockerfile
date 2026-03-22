FROM node:22-trixie-slim AS builder

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build


FROM nginxinc/nginx-unprivileged:1.29-alpine

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080
