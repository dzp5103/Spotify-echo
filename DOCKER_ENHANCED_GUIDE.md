# 🐳 Enhanced Docker Deployment Guide for EchoTune AI

## Overview

This document provides a comprehensive guide for deploying EchoTune AI using Docker, with special focus on Ubuntu 22.04 deployment following DigitalOcean's best practices. The deployment is optimized for both development and production environments.

## 📋 Quick Start Options

### Option 1: One-Click Deployment (Recommended)
```bash
curl -sSL https://raw.githubusercontent.com/dzp5103/Spotify-echo/main/scripts/simple-deploy.sh | bash
```

### Option 2: Manual Setup
```bash
# 1. Setup Docker for Ubuntu 22.04
./scripts/docker-ubuntu-setup.sh

# 2. Deploy EchoTune AI
./scripts/simple-deploy.sh deploy
```

### Option 3: Advanced Setup
```bash
# 1. Install Docker following DigitalOcean tutorial
./scripts/docker-ubuntu-setup.sh install

# 2. Clone repository
git clone https://github.com/dzp5103/Spotify-echo.git
cd Spotify-echo

# 3. Configure environment
cp .env.production.example .env
nano .env  # Configure your Spotify API credentials

# 4. Deploy with optimized Dockerfile
docker build -f Dockerfile.optimized -t echotune-ai .
docker-compose up -d
```

## 🛠️ Installation Methods

### Ubuntu 22.04 Docker Installation

Following the [DigitalOcean Docker tutorial](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-docker-on-ubuntu-22-04), our setup script provides:

```bash
# Enhanced setup with optimization
./scripts/docker-ubuntu-setup.sh
```

**Features:**
- ✅ Automatic Docker & Docker Compose installation
- ✅ User permission configuration
- ✅ Production optimizations
- ✅ EchoTune-specific configurations
- ✅ Helper scripts and aliases
- ✅ Monitoring tools (ctop, lazydocker)

### Development Environment

```bash
# Start development environment
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d

# Or use the simplified command
echotune-start
```

### Production Environment

```bash
# Production deployment
docker-compose -f docker-compose.yml up -d

# With optimized Dockerfile
docker build -f Dockerfile.optimized -t echotune-ai:production .
```

## 📊 Docker Optimization Features

### Performance Monitoring

```bash
# Real-time monitoring
./scripts/docker-manager.sh monitor

# Performance analysis
./scripts/docker-manager.sh analyze

# Health report
./scripts/docker-manager.sh report
```

### Resource Optimization

```bash
# Full optimization
./scripts/docker-manager.sh optimize

# Specific optimizations
./scripts/docker-manager.sh images    # Optimize images
./scripts/docker-manager.sh volumes   # Clean unused volumes
./scripts/docker-manager.sh networks  # Clean unused networks
```

## 🔧 Configuration Management

### Environment Variables

The deployment supports multiple configuration methods:

1. **`.env` file** (recommended for local development)
2. **Environment variables** (recommended for production)
3. **Docker secrets** (for sensitive data in production)

```bash
# Required Spotify API configuration
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
SPOTIFY_REDIRECT_URI=http://localhost:3000/auth/callback

# Database configuration
MONGODB_URI=mongodb://mongodb:27017/echotune
REDIS_URL=redis://redis:6379

# Security
SESSION_SECRET=your_session_secret_here
JWT_SECRET=your_jwt_secret_here
```

### Multi-Environment Support

```bash
# Development
NODE_ENV=development
docker-compose up -d

# Staging
NODE_ENV=staging
docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d

# Production
NODE_ENV=production
docker-compose -f docker-compose.yml up -d
```

## 🏗️ Docker Architecture

### Multi-Stage Builds

Our optimized Dockerfile uses multi-stage builds for:

1. **Builder stage**: Compiles and builds the application
2. **Production stage**: Minimal runtime image
3. **Development stage**: Full development environment

```dockerfile
# Build stage
FROM node:20-alpine AS builder
# ... build process

# Production stage
FROM node:20-alpine AS production
# ... optimized runtime

# Development stage
FROM node:20-alpine AS development
# ... development tools
```

### Container Services

The deployment includes:

- **App Container**: Main EchoTune AI application
- **Nginx Container**: Reverse proxy and static file serving
- **MongoDB Container**: Primary database
- **Redis Container**: Caching and session storage
- **Monitoring Container**: System metrics and health checks

### Network Architecture

```yaml
networks:
  echotune-frontend:    # External facing services
  echotune-backend:     # Application tier
  echotune-database:    # Database tier
```

## 📈 Performance Optimizations

### Docker Daemon Configuration

Our setup script configures Docker with:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "5"
  },
  "storage-driver": "overlay2",
  "features": {
    "buildkit": true
  },
  "live-restore": true
}
```

### Build Optimizations

- **BuildKit**: Enabled for parallel builds and caching
- **Layer Caching**: Optimized layer ordering for faster rebuilds
- **Multi-platform**: Support for AMD64 and ARM64 architectures
- **Security**: Non-root user execution and minimal attack surface

### Resource Management

```yaml
deploy:
  resources:
    limits:
      memory: 2G
      cpus: '2.0'
    reservations:
      memory: 1G
      cpus: '1.0'
```

## 🔐 Security Features

### Container Security

- **Non-root execution**: All containers run as non-root users
- **Read-only filesystem**: Where possible, containers use read-only filesystems
- **Security options**: `no-new-privileges` and proper capability management
- **Secret management**: Secure handling of API keys and credentials

### Network Security

- **Isolated networks**: Services are isolated in appropriate network segments
- **TLS termination**: HTTPS handled by Nginx with automated certificate management
- **Rate limiting**: Built-in protection against abuse

## 📊 Monitoring and Maintenance

### Real-time Monitoring

```bash
# Container monitoring
echotune-monitor

# Resource usage
docker stats

# Application logs
echotune-logs

# Health checks
echotune-health
```

### Automated Health Checks

All containers include comprehensive health checks:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD /app/health-check.sh
```

### Log Management

- **Structured logging**: JSON format for easy parsing
- **Log rotation**: Automatic log rotation to prevent disk space issues
- **Centralized collection**: Logs available through Docker logging drivers

## 🚀 Deployment Workflows

### Development Workflow

```bash
# 1. Start development environment
echotune-start

# 2. Make changes to code
# ... development work

# 3. Test changes
npm test

# 4. Rebuild if needed
echotune-build

# 5. View logs
echotune-logs
```

### Production Deployment

```bash
# 1. Update code
git pull origin main

# 2. Update environment
nano .env

# 3. Deploy new version
echotune-update

# 4. Verify deployment
echotune-health
```

### Backup and Recovery

```bash
# Create backup
./scripts/docker-manager.sh backup

# Database backup
docker exec echotune-mongodb mongodump --out /backup

# Volume backup
docker run --rm -v echotune_data:/data -v $(pwd):/backup alpine tar czf /backup/data-backup.tar.gz /data
```

## 🔧 Troubleshooting

### Common Issues

1. **Permission Denied**
   ```bash
   sudo usermod -aG docker $USER
   # Then logout and login again
   ```

2. **Port Already in Use**
   ```bash
   sudo lsof -i :80
   sudo lsof -i :3000
   ```

3. **Memory Issues**
   ```bash
   docker system prune -af
   ./scripts/docker-manager.sh optimize
   ```

4. **Build Failures**
   ```bash
   docker build --no-cache -f Dockerfile.optimized .
   ```

### Health Check Commands

```bash
# System health
./scripts/docker-manager.sh check

# Container status
docker-compose ps

# Service health
curl http://localhost/health

# Database connectivity
docker exec echotune-app node -e "console.log('DB test')"
```

### Performance Issues

```bash
# Analyze performance
./scripts/docker-manager.sh analyze

# Monitor resources
./scripts/docker-manager.sh monitor

# Generate report
./scripts/docker-manager.sh report
```

## 📚 Advanced Features

### Custom Docker Images

Build custom images for specific needs:

```bash
# Production optimized
docker build -f Dockerfile.optimized -t echotune:production .

# Development with hot reload
docker build -f Dockerfile.optimized --target development -t echotune:dev .

# Minimal runtime
docker build -f Dockerfile.minimal -t echotune:minimal .
```

### Multi-Platform Builds

```bash
# Build for multiple architectures
docker buildx build --platform linux/amd64,linux/arm64 -t echotune:latest .
```

### Container Orchestration

For advanced deployments, consider:

- **Docker Swarm**: For multi-node deployments
- **Kubernetes**: For enterprise-scale orchestration
- **DigitalOcean App Platform**: For managed deployments

## 🌐 DigitalOcean Integration

### App Platform Deployment

The project includes configurations for DigitalOcean App Platform:

```yaml
# app-platform.yaml
name: echotune-ai
services:
- name: app
  source_dir: /
  github:
    repo: dzp5103/Spotify-echo
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
```

### Container Registry

Push to DigitalOcean Container Registry:

```bash
# Tag image
docker tag echotune:latest registry.digitalocean.com/your-registry/echotune:latest

# Push image
docker push registry.digitalocean.com/your-registry/echotune:latest
```

## 📝 Helper Commands Reference

### Project Management
- `echotune-start` - Start all services
- `echotune-stop` - Stop all services
- `echotune-restart` - Restart all services
- `echotune-logs` - View logs
- `echotune-build` - Rebuild containers
- `echotune-status` - Check service status
- `echotune-health` - Health check
- `echotune-monitor` - Real-time monitoring

### Docker Management
- `./scripts/docker-manager.sh check` - System check
- `./scripts/docker-manager.sh optimize` - Full optimization
- `./scripts/docker-manager.sh monitor` - Resource monitoring
- `./scripts/docker-manager.sh report` - Health report
- `./scripts/docker-manager.sh backup` - Backup configurations

### Deployment
- `./scripts/simple-deploy.sh deploy` - One-click deployment
- `./scripts/simple-deploy.sh update` - Update deployment
- `./scripts/simple-deploy.sh status` - Check deployment status

This enhanced Docker deployment system provides enterprise-grade reliability while maintaining simplicity for development workflows.