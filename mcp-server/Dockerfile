# Dockerfile for EchoTune AI MCP Server
# Optimized for DigitalOcean Container Registry deployment
FROM node:20-alpine

# Set environment variables
ENV NODE_ENV=production \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false \
    MCP_SERVER_PORT=3001

# Install system dependencies
RUN apk add --no-cache \
    curl \
    ca-certificates \
    tini \
    python3 \
    py3-pip \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S mcpuser && \
    adduser -S mcpuser -u 1001 -G mcpuser -h /app -s /bin/sh

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production --no-audit --no-fund && \
    npm cache clean --force

# Copy application source
COPY . .

# Create necessary directories and set permissions
RUN mkdir -p logs temp && \
    chown -R mcpuser:mcpuser . && \
    chmod 755 logs temp

# Create health check script
RUN echo '#!/bin/sh' > /app/health-check.sh && \
    echo 'curl -f http://localhost:${MCP_SERVER_PORT}/health || exit 1' >> /app/health-check.sh && \
    chmod +x /app/health-check.sh

# Switch to non-root user
USER mcpuser

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD /app/health-check.sh

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Start the MCP server
CMD ["npm", "start"]