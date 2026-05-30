# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install all dependencies (including devDependencies for typescript compilation)
COPY Backend/message-service/package*.json ./
RUN npm ci

# Copy source and config files
COPY Backend/message-service/tsconfig.json ./
COPY Backend/message-service/index.ts ./
COPY Backend/message-service/src ./src

# Build TypeScript to JavaScript
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine
WORKDIR /app

# Copy package files and install only production dependencies
COPY Backend/message-service/package*.json ./
RUN npm ci --omit=dev

# Copy compiled files from the builder stage
COPY --from=builder /app/dist ./dist

ENV PORT=8083
ENV NODE_ENV=production

EXPOSE 8083
CMD ["npm", "start"]
