# 🚀 DigitalOcean Deployment Guide for EchoTune AI

Comprehensive guide for deploying EchoTune AI to DigitalOcean using GitHub Actions, Container Registry, and App Platform.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Secrets Configuration](#secrets-configuration)
- [Workflow Usage](#workflow-usage)
- [Container Registry Setup](#container-registry-setup)
- [App Platform Configuration](#app-platform-configuration)
- [Monitoring and Troubleshooting](#monitoring-and-troubleshooting)
- [Advanced Configuration](#advanced-configuration)

## 🚀 Quick Start

Deploy EchoTune AI to DigitalOcean in under 10 minutes:

1. **Fork the repository** to your GitHub account
2. **Set up DigitalOcean accounts** and get API tokens
3. **Configure GitHub secrets** (see [Secrets Configuration](#secrets-configuration))
4. **Push to main branch** or trigger workflow manually
5. **Monitor deployment** in GitHub Actions tab

## 📋 Prerequisites

### Required Accounts
- [GitHub account](https://github.com) with repository access
- [DigitalOcean account](https://digitalocean.com) with billing enabled
- [Spotify Developer account](https://developer.spotify.com) for music integration

### Required Services
- **DigitalOcean Container Registry** (DOCR)
- **DigitalOcean App Platform** 
- **DigitalOcean Managed Database** (optional, MongoDB)

### Local Tools (for manual setup)
- [doctl CLI](https://docs.digitalocean.com/reference/doctl/how-to/install/) 
- [Docker](https://docs.docker.com/get-docker/) (for local testing)
- [Node.js 20+](https://nodejs.org/) (for local development)

## 🔧 Initial Setup

### 1. DigitalOcean Account Setup

1. **Create DigitalOcean Account**
   ```bash
   # Visit https://cloud.digitalocean.com/registrations/new
   # Add payment method and verify account
   ```

2. **Generate API Token**
   ```bash
   # Navigate to: API → Personal access tokens → Generate New Token
   # Name: "EchoTune-AI-Deployment"
   # Scopes: Read and Write
   # Save token securely - you'll need it for GitHub secrets
   ```

3. **Create Container Registry**
   ```bash
   # Via DigitalOcean Console:
   # Container Registry → Create Registry
   # Name: echotune-registry
   # Region: Choose closest to your users
   # Plan: Basic ($5/month) or Professional ($20/month)
   
   # Via doctl CLI:
   doctl registry create echotune-registry --region nyc3
   ```

4. **Generate Registry Token**
   ```bash
   # Via doctl CLI:
   doctl registry docker-config --expiry-seconds 31536000
   
   # This generates a token valid for 1 year
   # Save the token for GitHub secrets
   ```

### 2. Spotify Developer Setup

1. **Create Spotify App**
   ```bash
   # Visit https://developer.spotify.com/dashboard
   # Create App → Name: "EchoTune AI" → Type: Web API
   ```

2. **Configure App Settings**
   ```bash
   # Redirect URIs: https://your-domain.com/auth/callback
   # Website: https://your-domain.com
   # Note Client ID and Client Secret
   ```

### 3. Database Setup (Optional)

1. **Create MongoDB Database**
   ```bash
   # Via DigitalOcean Console:
   # Databases → Create Database → MongoDB 7
   # Name: echotune-production
   # Region: Same as your app
   # Size: Basic ($15/month minimum)
   
   # Via doctl CLI:
   doctl databases create echotune-production --engine mongodb --version 7 --region nyc3 --size db-s-1vcpu-1gb
   ```

## 🔐 Secrets Configuration

Configure the following secrets in your GitHub repository:

### Repository Secrets Setup

1. **Navigate to Repository Settings**
   ```
   GitHub Repository → Settings → Secrets and variables → Actions
   ```

2. **Add Required Secrets**

#### Core DigitalOcean Secrets
```bash
# DigitalOcean API Access Token
DIGITALOCEAN_ACCESS_TOKEN=dop_v1_xxxxxxxxxxxxxxxxxxxx

# DigitalOcean Container Registry Token  
DO_REGISTRY_TOKEN=dop_v1_xxxxxxxxxxxxxxxxxxxx

# App Platform App ID (optional for new deployments)
DIGITALOCEAN_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

#### Spotify API Secrets
```bash
# Spotify Client Credentials
SPOTIFY_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SPOTIFY_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### Security Secrets
```bash
# Application Security Keys (generate secure random strings)
SESSION_SECRET=your_super_secure_session_secret_here
JWT_SECRET=your_super_secure_jwt_secret_here
```

#### Database Secrets (if using managed database)
```bash
# MongoDB Connection String
MONGODB_URI=mongodb://username:password@host:port/database?ssl=true
```

#### AI/LLM Secrets (optional)
```bash
# Google Gemini API Key
GEMINI_API_KEY=AIza...

# OpenAI API Key  
OPENAI_API_KEY=sk-...

# Default LLM Provider
DEFAULT_LLM_PROVIDER=mock
```

### 3. Environment Variables

Update `app-platform.yaml` with your specific configuration:

```yaml
envs:
- key: DOMAIN
  value: your-domain.com  # Replace with your domain
- key: FRONTEND_URL
  value: https://your-domain.com  # Replace with your URL
- key: SPOTIFY_REDIRECT_URI
  value: https://your-domain.com/auth/callback  # Replace with your callback URL
```

## 🔄 Workflow Usage

### Automatic Deployment

The deployment workflow triggers automatically on:
- **Push to main branch** (excludes documentation changes)
- **Manual dispatch** via GitHub Actions UI

### Manual Deployment

1. **Navigate to GitHub Actions**
   ```
   Repository → Actions → DigitalOcean Production Deployment
   ```

2. **Run Workflow**
   ```bash
   # Click "Run workflow"
   # Select environment: production/staging
   # Options:
   # - Force rebuild: Rebuild all images from scratch
   # - Skip tests: Skip test suite for faster deployment
   ```

### Deployment Process

The workflow performs these steps:

1. **Validation** - Validates configuration and secrets
2. **Testing** - Runs unit, integration, and security tests
3. **Building** - Builds Docker images for all services
4. **Registry Push** - Pushes images to DigitalOcean Container Registry
5. **Security Scan** - Scans images for vulnerabilities
6. **Deployment** - Deploys to DigitalOcean App Platform
7. **Health Check** - Verifies application is running correctly

## 📦 Container Registry Setup

### Registry Configuration

1. **Login to Registry**
   ```bash
   # Using doctl
   doctl registry login
   
   # Using Docker directly
   docker login registry.digitalocean.com -u <your-token> -p <your-token>
   ```

2. **Test Image Push**
   ```bash
   # Tag local image
   docker tag echotune-ai:latest registry.digitalocean.com/echotune-registry/echotune-app:latest
   
   # Push to registry
   docker push registry.digitalocean.com/echotune-registry/echotune-app:latest
   ```

3. **Registry Management**
   ```bash
   # List repositories
   doctl registry repository list
   
   # List tags
   doctl registry repository list-tags echotune-app
   
   # Delete old images (cleanup)
   doctl registry repository delete-manifest echotune-app sha256:digest
   ```

### Image Optimization

Our Dockerfiles are optimized for DigitalOcean:

- **Multi-stage builds** for smaller production images
- **Alpine Linux base** for security and size
- **Non-root user** for enhanced security
- **Health checks** for proper load balancing
- **Cache optimization** for faster builds

## 🎯 App Platform Configuration

### Service Architecture

EchoTune AI deploys with multiple services:

```yaml
services:
  - web           # Main application (Node.js/React)
  - mcp-server    # Model Context Protocol server
  - docs          # Documentation (static site)

databases:
  - echotune-db   # MongoDB database

jobs:
  - data-sync     # Background data processing

functions:
  - analytics     # Serverless analytics processing
```

### Resource Configuration

```yaml
# Production resource recommendations
web:
  instance_count: 2
  instance_size_slug: basic-s  # 1 vCPU, 2GB RAM
  autoscaling:
    min_instance_count: 1
    max_instance_count: 5

mcp-server:
  instance_count: 1  
  instance_size_slug: basic-xs  # 0.5 vCPU, 1GB RAM

database:
  size: db-s-1vcpu-1gb  # 1 vCPU, 1GB RAM, 10GB storage
```

### Custom Domains

1. **Add Domain to App**
   ```bash
   # Via doctl
   doctl apps update-domain <app-id> <domain-name>
   
   # Example
   doctl apps update-domain 12345678 primosphere.studio
   ```

2. **Configure DNS**
   ```bash
   # Add CNAME record pointing to your app
   # CNAME: primosphere.studio → yourapp.ondigitalocean.app
   ```

3. **SSL Certificate**
   ```bash
   # DigitalOcean automatically provides SSL certificates
   # via Let's Encrypt for custom domains
   ```

## 📊 Monitoring and Troubleshooting

### Application Monitoring

1. **Health Checks**
   ```bash
   # Application health endpoint
   curl https://your-domain.com/health
   
   # Expected response:
   {
     "status": "healthy",
     "version": "2.1.0",
     "uptime": 3600,
     "database": "connected"
   }
   ```

2. **App Platform Metrics**
   ```bash
   # Via doctl
   doctl apps get <app-id>
   doctl apps list-deployments <app-id>
   
   # Via DigitalOcean Console
   # Apps → Your App → Insights tab
   ```

3. **Container Registry Monitoring**
   ```bash
   # Registry usage
   doctl registry get
   
   # Repository sizes
   doctl registry repository list
   ```

### Common Issues and Solutions

#### Deployment Failures

1. **Build Failures**
   ```bash
   # Check GitHub Actions logs
   # Common causes:
   # - Missing dependencies in package.json
   # - Docker build context issues
   # - Registry authentication failures
   
   # Solutions:
   # - Verify all dependencies are listed
   # - Check Dockerfile syntax
   # - Regenerate registry token
   ```

2. **Registry Push Failures**
   ```bash
   # Check registry token expiration
   doctl registry docker-config
   
   # Regenerate if expired
   doctl registry docker-config --expiry-seconds 31536000
   ```

3. **App Platform Deployment Issues**
   ```bash
   # Check app logs
   doctl apps logs <app-id>
   
   # Check deployment status
   doctl apps get-deployment <app-id> <deployment-id>
   ```

#### Application Issues

1. **Health Check Failures**
   ```bash
   # Common causes:
   # - Port configuration mismatch
   # - Missing health endpoint
   # - Database connection issues
   
   # Check app configuration
   curl https://your-domain.com/health
   
   # Check environment variables
   doctl apps get <app-id>
   ```

2. **Database Connection Issues**
   ```bash
   # Verify MongoDB URI format
   # mongodb://username:password@host:port/database?ssl=true
   
   # Test connection
   mongosh "your-connection-string"
   ```

3. **Spotify Integration Issues**
   ```bash
   # Verify Spotify app configuration
   # - Client ID and Secret are correct
   # - Redirect URI matches exactly
   # - Required scopes are enabled
   
   # Test Spotify API
   curl -X POST "https://accounts.spotify.com/api/token" \
     -H "Authorization: Basic $(echo -n 'client_id:client_secret' | base64)" \
     -d "grant_type=client_credentials"
   ```

### Debugging Commands

```bash
# View application logs
doctl apps logs <app-id> --type run

# View build logs  
doctl apps logs <app-id> --type build

# Get app information
doctl apps get <app-id>

# List all deployments
doctl apps list-deployments <app-id>

# Get specific deployment
doctl apps get-deployment <app-id> <deployment-id>

# Monitor deployment in real-time
watch doctl apps get-deployment <app-id> <deployment-id>
```

## ⚙️ Advanced Configuration

### Multi-Environment Setup

Create separate environments for development, staging, and production:

1. **Create Environment-Specific App Specs**
   ```bash
   # app-staging.yaml
   # app-production.yaml
   # app-development.yaml
   ```

2. **Environment-Specific Secrets**
   ```bash
   # Use GitHub Environments feature
   # Repository → Settings → Environments
   # Create: production, staging, development
   # Add environment-specific secrets
   ```

3. **Branch-Based Deployment**
   ```yaml
   # .github/workflows/deploy-staging.yml
   on:
     push:
       branches: [develop]
   
   # .github/workflows/deploy-production.yml
   on:
     push:
       branches: [main]
   ```

### Custom Registry Namespace

```bash
# Create custom registry namespace
doctl registry create my-custom-registry --region nyc3

# Update workflow environment variables
DO_REGISTRY_NAMESPACE=my-custom-registry
```

### Blue-Green Deployment

```bash
# Deploy to staging slot first
doctl apps create app-staging.yaml

# Test staging deployment
curl https://staging.your-domain.com/health

# Promote to production
doctl apps update <production-app-id> --spec app-staging.yaml
```

### Backup and Disaster Recovery

1. **Database Backup**
   ```bash
   # Automated backups (enabled by default)
   doctl databases backup list <database-id>
   
   # Manual backup
   doctl databases backup create <database-id>
   ```

2. **Application Backup**
   ```bash
   # Container images are automatically backed up in registry
   # Configuration is version controlled in Git
   # Environment variables should be documented
   ```

3. **Disaster Recovery Plan**
   ```bash
   # 1. Restore database from backup
   # 2. Redeploy application from last known good commit
   # 3. Update DNS if necessary
   # 4. Verify all integrations are working
   ```

## 🔧 Optimization Tips

### Cost Optimization

1. **Right-Size Resources**
   ```yaml
   # Start small and scale up
   instance_size_slug: basic-xs  # $5/month
   # Monitor usage and upgrade as needed
   ```

2. **Registry Cleanup**
   ```bash
   # Regularly clean old images
   doctl registry repository delete-manifest <repo> <digest>
   
   # Set up automated cleanup
   doctl registry options set-subscription-tier basic
   ```

3. **Database Optimization**
   ```bash
   # Use connection pooling
   # Implement caching (Redis)
   # Monitor query performance
   ```

### Performance Optimization

1. **CDN Configuration**
   ```yaml
   # Enable DigitalOcean Spaces CDN
   # Configure static asset caching
   # Optimize image delivery
   ```

2. **Database Performance**
   ```bash
   # Index optimization
   # Query optimization
   # Connection pooling
   ```

3. **Application Performance**
   ```bash
   # Enable compression
   # Implement caching
   # Optimize bundle size
   ```

## 📚 Additional Resources

### Documentation
- [DigitalOcean App Platform Docs](https://docs.digitalocean.com/products/app-platform/)
- [Container Registry Docs](https://docs.digitalocean.com/products/container-registry/)
- [doctl CLI Reference](https://docs.digitalocean.com/reference/doctl/)

### Community
- [DigitalOcean Community](https://www.digitalocean.com/community)
- [GitHub Discussions](https://github.com/dzp5103/Spotify-echo/discussions)
- [Discord Server](https://discord.gg/echotune-ai)

### Support
- [DigitalOcean Support](https://www.digitalocean.com/support/)
- [GitHub Issues](https://github.com/dzp5103/Spotify-echo/issues)
- Email: support@primosphere.studio

---

## 🚨 Important Notes

1. **Security**: Never commit secrets to Git. Always use GitHub secrets or environment variables.
2. **Costs**: Monitor your DigitalOcean usage to avoid unexpected charges.
3. **Backups**: Regularly backup your database and test restore procedures.
4. **Updates**: Keep dependencies and base images updated for security.
5. **Monitoring**: Set up alerts for application health and performance metrics.

---

**🎵 Ready to deploy your music discovery platform?**

Follow this guide step by step, and you'll have EchoTune AI running on DigitalOcean in no time! If you encounter any issues, check the troubleshooting section or open an issue on GitHub.

*Happy deploying! 🚀*