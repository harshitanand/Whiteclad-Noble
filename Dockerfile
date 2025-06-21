# Dockerfile - Production container
FROM node:18-alpine AS base
WORKDIR /app
RUN apk add --no-cache dumb-init

# Dependencies stage
FROM base AS dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Development dependencies for building
FROM base AS dev-dependencies
COPY package*.json ./
RUN npm ci

# Build stage (if needed for any build steps)
FROM dev-dependencies AS build
COPY . .
# Add any build steps here if needed
# RUN npm run build

# Production stage
FROM base AS production
ENV NODE_ENV=production
ENV PORT=3000

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeapp -u 1001

# Copy dependencies
COPY --from=dependencies --chown=nodeapp:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodeapp:nodejs . .

# Create logs directory
RUN mkdir -p logs && chown nodeapp:nodejs logs

# Switch to non-root user
USER nodeapp

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node scripts/healthcheck.js

# Expose port
EXPOSE 3000

# Start application
CMD ["dumb-init", "node", "src/server.js"]
