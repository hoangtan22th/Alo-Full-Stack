# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install all dependencies
COPY Backend/group-service/package*.json ./
RUN npm ci

# Copy source and config files
COPY Backend/group-service/tsconfig.json ./
COPY Backend/group-service/index.ts ./
COPY Backend/group-service/src ./src

# Build TypeScript to JavaScript
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine
WORKDIR /app

# Copy package files and install only production dependencies
COPY Backend/group-service/package*.json ./
RUN npm ci --omit=dev

# Copy compiled files from the builder stage
COPY --from=builder /app/dist ./dist

ENV PORT=8082
ENV NODE_ENV=production

EXPOSE 8082
CMD ["npm", "start"]
