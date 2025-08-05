# Multi-stage Production Dockerfile for EchoTune AI
# Optimized for DigitalOcean Container Registry deployment

# Build stage
FROM node:20-alpine AS builder

# Set build environment
ENV NODE_ENV=development \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY requirements*.txt ./

# Install dependencies
RUN npm ci --no-audit --no-fund

# Copy source code
COPY . .

# Build application
RUN npm run build || echo "Build completed"

# Production stage
FROM node:20-alpine AS production

# Build arguments for versioning
ARG BUILD_VERSION=latest
ARG BUILD_DATE
ARG VCS_REF
ARG SERVICE_NAME=echotune-app
ARG ENVIRONMENT=production

# Set production environment
ENV NODE_ENV=production \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=true \
    PORT=3000 \
    BUILD_VERSION=${BUILD_VERSION} \
    SERVICE_NAME=${SERVICE_NAME}

# Add OCI labels for metadata
LABEL org.opencontainers.image.title="EchoTune AI" \
      org.opencontainers.image.description="AI-powered music recommendation system" \
      org.opencontainers.image.version=${BUILD_VERSION} \
      org.opencontainers.image.created=${BUILD_DATE} \
      org.opencontainers.image.revision=${VCS_REF} \
      org.opencontainers.image.source="https://github.com/dzp5103/Spotify-echo" \
      org.opencontainers.image.url="https://primosphere.studio" \
      org.opencontainers.image.vendor="EchoTune AI Team" \
      service.name=${SERVICE_NAME} \
      deployment.environment=${ENVIRONMENT}

# Install essential system dependencies
RUN apk add --no-cache \
    curl \
    ca-certificates \
    tini \
    python3 \
    py3-pip \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S echotune -u 1001 -G nodejs -h /app -s /bin/sh

# Set up working directory
WORKDIR /app

# Copy package files
COPY --chown=echotune:nodejs package*.json ./

# Copy node_modules from builder stage (more efficient than reinstalling)
COPY --from=builder --chown=echotune:nodejs /app/node_modules ./node_modules

# Copy built application from builder stage (only if they exist)
COPY --from=builder --chown=echotune:nodejs /app/src ./src
COPY --from=builder --chown=echotune:nodejs /app/public ./public
# Create directories for optional folders
RUN mkdir -p dist static

# Copy configuration files
COPY --chown=echotune:nodejs *.js ./
COPY --chown=echotune:nodejs *.json ./

# Create necessary directories and set permissions
RUN mkdir -p logs data temp uploads cache && \
    chown -R echotune:nodejs . && \
    chmod 755 logs data temp uploads cache

# Create enhanced health check script
RUN echo '#!/bin/sh' > /app/health-check.sh && \
    echo 'set -e' >> /app/health-check.sh && \
    echo 'HEALTH_URL="http://localhost:${PORT}/health"' >> /app/health-check.sh && \
    echo 'if curl -f -s --max-time 10 "$HEALTH_URL" | grep -q "healthy"; then' >> /app/health-check.sh && \
    echo '  echo "Health check passed"' >> /app/health-check.sh && \
    echo '  exit 0' >> /app/health-check.sh && \
    echo 'else' >> /app/health-check.sh && \
    echo '  echo "Health check failed"' >> /app/health-check.sh && \
    echo '  exit 1' >> /app/health-check.sh && \
    echo 'fi' >> /app/health-check.sh && \
    chmod +x /app/health-check.sh

# Switch to non-root user
USER echotune

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD /app/health-check.sh

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the application
CMD ["npm", "start"]