# Stage 1: Build NextJS
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install all dependencies
COPY Web/alo-chat-admin/package*.json ./
RUN npm ci

# Copy configuration and source files
COPY Web/alo-chat-admin/tsconfig.json ./
COPY Web/alo-chat-admin/next.config.ts ./
COPY Web/alo-chat-admin/postcss.config.mjs ./
COPY Web/alo-chat-admin/eslint.config.mjs ./
COPY Web/alo-chat-admin/components.json ./
COPY Web/alo-chat-admin/public ./public
COPY Web/alo-chat-admin/src ./src

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the NextJS application
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PORT=3002

# Copy package files and install only production dependencies
COPY Web/alo-chat-admin/package*.json ./
RUN npm ci --omit=dev

# Copy build artifacts and configs from builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./

EXPOSE 3002
CMD ["npm", "start", "--", "-p", "3002"]
