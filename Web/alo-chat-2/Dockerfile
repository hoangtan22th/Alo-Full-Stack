# Stage 1: Build NextJS
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install all dependencies
COPY Web/alo-chat-2/package*.json ./
RUN npm ci

# Copy configuration and source files
COPY Web/alo-chat-2/tsconfig.json ./
COPY Web/alo-chat-2/next.config.ts ./
COPY Web/alo-chat-2/postcss.config.mjs ./
COPY Web/alo-chat-2/eslint.config.mjs ./
COPY Web/alo-chat-2/public ./public
COPY Web/alo-chat-2/src ./src

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the NextJS application
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PORT=3001

# Copy package files and install only production dependencies
COPY Web/alo-chat-2/package*.json ./
RUN npm ci --omit=dev

# Copy build artifacts and configs from builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./

EXPOSE 3001
CMD ["npm", "start", "--", "-p", "3001"]
