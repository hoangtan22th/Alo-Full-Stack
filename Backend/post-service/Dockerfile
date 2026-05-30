FROM node:20-alpine AS builder
WORKDIR /app

COPY Backend/post-service/package*.json ./
RUN npm ci

COPY Backend/post-service/ ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app

COPY Backend/post-service/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=8088

EXPOSE 8088
CMD ["npm", "start"]
