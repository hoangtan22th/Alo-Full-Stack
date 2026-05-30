# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install all dependencies
COPY Backend/realtime-service/package*.json ./
RUN npm ci

# Copy source and config files (tsconfig.json, src folder)
COPY Backend/realtime-service/tsconfig.json ./
COPY Backend/realtime-service/src ./src

# Build TypeScript to JavaScript
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine
WORKDIR /app

# Copy package files and install only production dependencies
COPY Backend/realtime-service/package*.json ./
RUN npm ci --omit=dev

# Copy compiled files from the builder stage
COPY --from=builder /app/dist ./dist

ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000
CMD ["npm", "start"]
