# 🚀 EchoTune AI - Modular Deployment Guide

This guide explains the new modular deployment system that allows you to install, fix permissions, deploy, manage dependencies, and analyze errors with separate, specialized scripts.

## 📋 Overview

The EchoTune AI deployment system now consists of 6 specialized scripts that can be run individually or orchestrated together:

1. **deploy-wizard.sh** - Universal orchestration wizard
2. **deploy-install.sh** - System dependencies installation
3. **deploy-permissions.sh** - User setup and permissions
4. **deploy-environment.sh** - Environment configuration
5. **deploy-app.sh** - Application deployment
6. **deploy-fix.sh** - Error analysis and repair

## 🎯 Quick Start Options

### Option 1: Complete Automated Deployment
```bash
# One command deploys everything
sudo ./deploy-wizard.sh
```

### Option 2: Step-by-Step Deployment
```bash
# Run each phase individually
sudo ./deploy-install.sh      # Install dependencies
sudo ./deploy-permissions.sh  # Fix permissions
sudo ./deploy-environment.sh  # Setup environment
sudo ./deploy-app.sh         # Deploy application
```

### Option 3: Targeted Problem Solving
```bash
# Fix specific issues
sudo ./deploy-permissions.sh  # Permission problems
sudo ./deploy-fix.sh         # Error analysis
```

## 📖 Detailed Script Documentation

### 1. deploy-wizard.sh - Universal Orchestration

**Purpose**: Complete deployment orchestration with interactive guidance

**Features**:
- Interactive configuration prompts
- Pre-deployment validation
- Phase-by-phase execution
- Error recovery options
- Post-deployment validation
- Comprehensive reporting

**Usage**:
```bash
# Interactive deployment
sudo ./deploy-wizard.sh

# Non-interactive with custom domain
sudo ./deploy-wizard.sh --domain=example.com --email=admin@example.com --non-interactive

# Skip specific phases
sudo ./deploy-wizard.sh --skip-install --skip-permissions

# Dry run (show what would be done)
sudo ./deploy-wizard.sh --dry-run --verbose
```

**Command Line Options**:
- `--domain=DOMAIN` - Set domain name
- `--email=EMAIL` - Set admin email
- `--skip-install` - Skip installation phase
- `--skip-permissions` - Skip permissions phase
- `--skip-environment` - Skip environment setup
- `--skip-deployment` - Skip application deployment
- `--dry-run` - Preview mode without execution
- `--verbose` - Enable detailed logging
- `--non-interactive` - Run without prompts

### 2. deploy-install.sh - System Dependencies

**Purpose**: Install all system dependencies and requirements

**What it installs**:
- Node.js 20.x with npm and global packages
- Python 3 with pip and essential packages
- Docker and Docker Compose with proper permissions
- Nginx web server
- Build tools (gcc, g++, make, cmake)
- System utilities (htop, vim, curl, etc.)
- Security tools (fail2ban, ufw, certbot)

**Usage**:
```bash
sudo ./deploy-install.sh
```

**Features**:
- Fully idempotent (safe to run multiple times)
- Auto-detects OS (Ubuntu/Debian/CentOS/RHEL)
- Installs latest stable versions
- Sets up deployment user and directories
- Configures permissive firewall settings

### 3. deploy-permissions.sh - User Setup and Permissions

**Purpose**: Fix all permission issues and set up proper access controls

**What it configures**:
- Creates deploy user (`echotune`) with proper groups
- Sets 777 permissions on deployment directories (as requested)
- Configures Docker socket permissions (666)
- Sets up SSL directory permissions
- Configures sudo access for deployment commands
- Fixes project file ownership

**Usage**:
```bash
sudo ./deploy-permissions.sh
```

**Features**:
- Permissive permissions for development ease
- Comprehensive permission validation
- User group management
- Sudo configuration for deployment tasks

### 4. deploy-environment.sh - Environment Configuration

**Purpose**: Fetch and configure environment files with production values

**What it does**:
- Fetches latest .env templates from repository
- Generates secure secrets and passwords
- Configures domain-specific settings
- Creates both production and development environments
- Sets up SSL certificate paths
- Configures database connections

**Usage**:
```bash
# With domain and email
sudo ./deploy-environment.sh example.com admin@example.com

# Interactive prompts
sudo ./deploy-environment.sh
```

**Features**:
- Fetches .env.production.example with filled data
- Generates cryptographically secure secrets
- Domain and email configuration
- Development and production environments
- Comprehensive documentation generation

**Files Created**:
- `/opt/echotune/.env` - Production environment
- `./env` - Development environment (in project directory)
- `/opt/echotune/ENVIRONMENT_SETUP.md` - Setup documentation

### 5. deploy-app.sh - Application Deployment

**Purpose**: Deploy the application with proper configuration and services

**What it deploys**:
- Application files to `/opt/echotune/app`
- Node.js and Python dependencies
- Systemd service configuration
- Nginx reverse proxy with SSL
- SSL certificates (Let's Encrypt or self-signed)
- Log rotation configuration
- Health monitoring

**Usage**:
```bash
sudo ./deploy-app.sh
```

**Features**:
- Complete application deployment
- SSL certificate automation
- Nginx configuration with security headers
- Service health checks
- Comprehensive deployment summary

**Services Created**:
- `echotune-ai.service` - Main application service
- Nginx virtual host for domain
- SSL certificate management
- Log rotation

### 6. deploy-fix.sh - Error Analysis and Repair

**Purpose**: Analyze deployment errors and attempt automatic fixes

**What it analyzes**:
- System health (disk, memory, CPU)
- Service status (application, Nginx, Docker)
- Application logs and error patterns
- Network connectivity and ports
- Configuration file validation
- SSL certificate status

**What it fixes**:
- Permission issues
- Service restart problems
- Dependency conflicts
- Network configuration
- File ownership problems

**Usage**:
```bash
# Full analysis and automatic fixes
sudo ./deploy-fix.sh

# Analysis only (no fixes)
sudo ./deploy-fix.sh --report-only
```

**Features**:
- Comprehensive error analysis
- Automatic fix attempts
- Detailed error reporting
- Issue prioritization
- Manual fix recommendations

**Generated Reports**:
- `/opt/echotune/ERROR_ANALYSIS_REPORT.md` - Detailed analysis
- Log file with all analysis details

## 🔧 Environment File Management

### Automatic Environment Setup

The `deploy-environment.sh` script automatically:

1. **Fetches Templates**: Downloads latest `.env.production.example`
2. **Generates Secrets**: Creates secure random strings for:
   - Session secrets
   - JWT tokens
   - Database passwords
3. **Configures Domain**: Sets up domain-specific URLs and paths
4. **Creates Documentation**: Generates setup guides

### Environment Files Created

#### Production Environment (`/opt/echotune/.env`)
- Production-ready configuration
- Secure secrets and passwords
- Domain-specific settings
- SSL and security configurations

#### Development Environment (`./env`)
- Development-friendly settings
- Mock providers enabled
- Local URLs and paths
- Debug logging enabled

### Required Spotify API Setup

After environment setup, you need to:

1. Visit [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create application or use existing
3. Add redirect URI: `https://your-domain.com/auth/callback`
4. Update environment files with:
   - `SPOTIFY_CLIENT_ID`
   - `SPOTIFY_CLIENT_SECRET`

## 📊 Monitoring and Management

### Service Management Commands

```bash
# Application service
sudo systemctl start echotune-ai
sudo systemctl stop echotune-ai
sudo systemctl restart echotune-ai
sudo systemctl status echotune-ai

# Nginx service
sudo systemctl reload nginx
sudo systemctl restart nginx

# View logs
sudo journalctl -u echotune-ai -f
tail -f /opt/echotune/logs/app.log
```

### Health Checks

```bash
# Application health
curl http://localhost:3000/health
curl https://your-domain.com/health

# Service status
sudo systemctl is-active echotune-ai nginx docker

# Port checks
sudo netstat -tlnp | grep -E ':(80|443|3000)'
```

### Log Files

- **Application**: `/opt/echotune/logs/app.log`
- **Errors**: `/opt/echotune/logs/error.log`
- **Nginx Access**: `/opt/echotune/logs/nginx-access.log`
- **Nginx Error**: `/opt/echotune/logs/nginx-error.log`
- **Systemd**: `sudo journalctl -u echotune-ai`

## 🚨 Troubleshooting Guide

### Common Issues and Solutions

#### 1. Permission Denied
**Symptoms**: Cannot write files, access denied errors
**Solution**: 
```bash
sudo ./deploy-permissions.sh
```

#### 2. Service Won't Start
**Symptoms**: Application service fails to start
**Solution**:
```bash
# Check logs first
sudo journalctl -u echotune-ai -n 50

# Run error analysis
sudo ./deploy-fix.sh

# Check environment configuration
cat /opt/echotune/.env
```

#### 3. Port Already in Use
**Symptoms**: EADDRINUSE error
**Solution**:
```bash
# Find process using port
sudo lsof -i :3000
sudo kill -9 <process_id>

# Restart service
sudo systemctl restart echotune-ai
```

#### 4. SSL Certificate Issues
**Symptoms**: HTTPS not working, certificate errors
**Solution**:
```bash
# Check SSL files
ls -la /etc/nginx/ssl/

# Regenerate certificates
sudo ./deploy-environment.sh your-domain.com admin@your-domain.com
sudo ./deploy-app.sh
```

#### 5. Dependency Issues
**Symptoms**: Module not found, import errors
**Solution**:
```bash
# Reinstall dependencies
cd /opt/echotune/app
sudo -u echotune npm install --production

# Or run complete dependency fix
sudo ./deploy-fix.sh
```

#### 6. Database Connection Issues
**Symptoms**: Cannot connect to MongoDB
**Solution**:
```bash
# Check environment configuration
grep MONGODB_URI /opt/echotune/.env

# Test connection
node -e "console.log(process.env.MONGODB_URI)" 
```

### Error Analysis Process

When issues occur:

1. **Run Error Analysis**: `sudo ./deploy-fix.sh`
2. **Check Generated Report**: `/opt/echotune/ERROR_ANALYSIS_REPORT.md`
3. **Review Logs**: Application and system logs
4. **Apply Recommended Fixes**: Follow report recommendations
5. **Re-run Analysis**: Verify fixes worked

## 🔄 Deployment Scenarios

### New Installation
```bash
# Complete fresh installation
sudo ./deploy-wizard.sh
```

### Update Existing Installation
```bash
# Update application only
sudo ./deploy-app.sh

# Fix any issues that arise
sudo ./deploy-fix.sh
```

### Fix Broken Installation
```bash
# Analyze issues first
sudo ./deploy-fix.sh --report-only

# Apply automatic fixes
sudo ./deploy-fix.sh

# Re-run specific phases if needed
sudo ./deploy-permissions.sh
sudo ./deploy-environment.sh
```

### Development Setup
```bash
# Skip installation if already done
sudo ./deploy-wizard.sh --skip-install

# Or run just environment setup
sudo ./deploy-environment.sh localhost admin@localhost
```

## 📚 Advanced Configuration

### Custom Domain Deployment
```bash
sudo ./deploy-wizard.sh --domain=mydomain.com --email=admin@mydomain.com --non-interactive
```

### Selective Phase Execution
```bash
# Skip phases you don't need
sudo ./deploy-wizard.sh --skip-install --skip-permissions
```

### Verbose Debugging
```bash
# Enable detailed logging
sudo ./deploy-wizard.sh --verbose --dry-run
```

### Non-Interactive Automation
```bash
# For automation scripts
sudo ./deploy-wizard.sh --non-interactive --domain=auto.example.com --email=deploy@example.com
```

## 🛡️ Security Considerations

### Permissive Configuration
As requested, the deployment uses permissive settings:
- **Directory Permissions**: 777 for maximum development ease
- **Firewall**: Disabled (UFW reset and disabled)
- **Docker**: Permissive socket permissions (666)
- **Sudo**: Passwordless access for deployment commands

### Production Hardening
For production environments, consider:
- Restricting directory permissions
- Enabling and configuring firewall
- Using proper SSL certificates
- Implementing monitoring and alerting
- Regular security updates

## 📞 Support and Resources

### Documentation
- **Environment Setup**: `/opt/echotune/ENVIRONMENT_SETUP.md`
- **Error Reports**: `/opt/echotune/ERROR_ANALYSIS_REPORT.md`
- **Deployment Status**: `/opt/echotune/DEPLOYMENT_STATUS.json`

### Support Channels
- **GitHub Issues**: https://github.com/dzp5103/Spotify-echo/issues
- **Documentation**: https://github.com/dzp5103/Spotify-echo#readme
- **Error Logs**: Check `/opt/echotune/logs/` directory

### Useful Commands
```bash
# Quick status check
sudo systemctl status echotune-ai nginx
curl http://localhost:3000/health

# View recent logs
sudo journalctl -u echotune-ai -n 20
tail -20 /opt/echotune/logs/app.log

# Restart everything
sudo systemctl restart echotune-ai nginx

# Full error analysis
sudo ./deploy-fix.sh
```

---

This modular deployment system provides maximum flexibility while maintaining ease of use. Each script can be run independently for targeted fixes, or use the wizard for complete automation.