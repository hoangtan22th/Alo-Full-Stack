# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install all dependencies
COPY Backend/voting-service/package*.json ./
RUN npm ci

# Copy source and config files
COPY Backend/voting-service/tsconfig.json ./
COPY Backend/voting-service/src ./src

# Build TypeScript to JavaScript using npx tsc since build script is missing
RUN npx tsc

# Stage 2: Runtime
FROM node:20-alpine
WORKDIR /app

# Copy package files and install only production dependencies
COPY Backend/voting-service/package*.json ./
RUN npm ci --omit=dev

# Copy compiled files from the builder stage
COPY --from=builder /app/dist ./dist

ENV PORT=8087
ENV NODE_ENV=production

EXPOSE 8087
CMD ["npm", "start"]
