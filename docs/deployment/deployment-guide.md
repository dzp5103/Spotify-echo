# 🚀 EchoTune AI - Complete Deployment Guide

This guide provides comprehensive deployment instructions for all supported platforms.

## 🎯 Quick Deployment Summary

| Platform | Time | Complexity | Cost | Best For |
|----------|------|------------|------|----------|
| [**DigitalOcean App Platform**](#digitalocean-app-platform) | 1-3 min | ⭐ Easy | $5-25/mo | Production |
| [**Docker Compose**](#docker-deployment) | 3-5 min | ⭐⭐ Medium | Server cost | Any server |
| [**Universal Script**](#universal-script) | 2-3 min | ⭐ Easy | Server cost | VPS/Dedicated |
| [**Manual Setup**](#manual-deployment) | 10-15 min | ⭐⭐⭐ Advanced | Server cost | Custom configs |

## 🌊 DigitalOcean App Platform (Recommended)

### One-Click Deploy
1. Click: [![Deploy to DigitalOcean](https://www.deploytodo.com/do-btn-blue.svg)](https://cloud.digitalocean.com/apps/new?repo=https://github.com/dzp5103/Spotify-echo/tree/main&refcode=echotuneai)
2. Configure environment variables (optional):
   - `SPOTIFY_CLIENT_ID` & `SPOTIFY_CLIENT_SECRET`
   - `GEMINI_API_KEY` or `OPENAI_API_KEY`
3. Deploy! Your app will be live at `your-app.ondigitalocean.app`

### Features
- ✅ Automatic SSL certificates
- ✅ CDN & global distribution
- ✅ Auto-scaling
- ✅ Zero maintenance
- ✅ GitHub integration for auto-deploys

## 🐳 Docker Deployment

### Quick Start
```bash
# Clone repository
git clone https://github.com/dzp5103/Spotify-echo.git
cd Spotify-echo

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Deploy with Docker Compose
docker-compose up -d --build

# Check status
docker-compose ps
```

### Production Setup
```bash
# Use production compose file
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Scale services
docker-compose up -d --scale app=3 --scale worker=2

# Monitor logs
docker-compose logs -f app
```

### Services Included
- **echotune-app**: Main Node.js application
- **echotune-nginx**: Reverse proxy with SSL
- **echotune-mongodb**: Database (optional)
- **echotune-redis**: Caching layer (optional)

## 🔮 Universal Script Deployment

### One-Command Deploy
```bash
# Download and run universal deployment script
curl -fsSL https://raw.githubusercontent.com/dzp5103/Spotify-echo/main/deploy-universal.sh | bash -s -- \
  --production \
  --domain yourdomain.com \
  --email admin@yourdomain.com
```

### What It Does
- ✅ Auto-detects your environment
- ✅ Installs dependencies (Node.js, Python, MongoDB)
- ✅ Configures SSL certificates
- ✅ Sets up security (firewall, rate limiting)
- ✅ Validates deployment health

### Advanced Options
```bash
# Custom deployment with specific options
./deploy-universal.sh \
  --production \
  --method docker \
  --domain yourdomain.com \
  --email admin@yourdomain.com \
  --install-dir /opt/echotune \
  --debug
```

## 🔧 Manual Deployment

### Prerequisites
- Ubuntu 22.04+ or Debian 11+
- Domain with DNS access (for SSL)
- 2GB+ RAM, 10GB+ storage

### Step 1: Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install additional tools
sudo apt install -y nginx certbot python3-certbot-nginx mongodb redis-server
```

### Step 2: Clone and Setup
```bash
# Clone repository
git clone https://github.com/dzp5103/Spotify-echo.git
cd Spotify-echo

# Install dependencies
npm install
pip3 install -r requirements.txt

# Configure environment
cp .env.example .env
nano .env  # Add your configuration
```

### Step 3: Configure SSL
```bash
# Setup SSL certificates
sudo certbot --nginx -d yourdomain.com
```

### Step 4: Configure Nginx
```bash
# Copy nginx configuration
sudo cp nginx/nginx.conf.template /etc/nginx/nginx.conf
sudo cp nginx/default.conf.template /etc/nginx/sites-available/echotune

# Enable site
sudo ln -s /etc/nginx/sites-available/echotune /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### Step 5: Setup System Service
```bash
# Create systemd service
sudo cp echotune.service /etc/systemd/system/
sudo systemctl enable echotune
sudo systemctl start echotune

# Check status
sudo systemctl status echotune
```

## ⚙️ Environment Configuration

### Required Variables
```env
# Spotify API (required for full functionality)
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=https://yourdomain.com/auth/callback

# Security
SESSION_SECRET=your_secure_session_secret_32_chars_min
JWT_SECRET=your_secure_jwt_secret_32_chars_min

# Application
NODE_ENV=production
DOMAIN=yourdomain.com
```

### Optional Variables
```env
# AI Providers (demo mode if not set)
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key

# Database (SQLite fallback if not set)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/

# SSL
LETSENCRYPT_EMAIL=admin@yourdomain.com
```

## 🏥 Health Check & Validation

### Basic Health Check
```bash
curl -f https://yourdomain.com/health
```

### Expected Response
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "uptime": 300.5,
  "checks": {
    "application": {"status": "healthy"},
    "database": {"status": "healthy"},
    "system": {"status": "healthy"}
  }
}
```

### Performance Validation
```bash
# Test response times
for endpoint in /health /api/chat/providers / /auth/spotify; do
  echo -n "$endpoint: "
  curl -o /dev/null -s -w "%{time_total}s\n" https://yourdomain.com$endpoint
done

# Expected: < 100ms for /health, < 500ms for others
```

## 🔒 Security Hardening

### Automatic Security (Universal Script)
The universal script automatically configures:
- SSL/TLS certificates
- Firewall rules
- Rate limiting
- Security headers
- DDoS protection

### Manual Security Setup
```bash
# Configure firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Install fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban

# Configure rate limiting in nginx
# (Handled automatically by our nginx config)
```

## 🚨 Troubleshooting

### Common Issues

**Application won't start:**
```bash
# Check logs
sudo journalctl -u echotune --lines=50
docker-compose logs app  # For Docker

# Common fixes
npm install  # Missing dependencies
sudo systemctl restart echotune  # Service restart
```

**SSL certificate issues:**
```bash
# Check domain DNS
dig yourdomain.com +short  # Should return your server IP

# Manual certificate generation
sudo certbot --nginx -d yourdomain.com
```

**Database connection failed:**
```bash
# Check MongoDB status
sudo systemctl status mongodb
# For remote MongoDB, verify connection string

# SQLite fallback works without external database
```

### Performance Issues
- Ensure 2GB+ RAM available
- Check disk space: `df -h`
- Monitor CPU: `htop`
- Restart services if needed

### Getting Help
- Health endpoint: `https://yourdomain.com/health`
- Application logs: Check system journal or Docker logs
- GitHub Issues: [Report problems](https://github.com/dzp5103/Spotify-echo/issues)

## 📊 Deployment Comparison

### Performance Benchmarks
| Metric | DigitalOcean | Docker | Universal | Manual |
|--------|--------------|--------|-----------|--------|
| Deploy Time | 1-3 min | 3-5 min | 2-3 min | 10-15 min |
| SSL Setup | Automatic | Automatic | Automatic | Manual |
| Maintenance | Zero | Low | Low | High |
| Scalability | Automatic | High | Medium | Manual |
| Cost | $5-25/mo | Server only | Server only | Server only |

### When to Use Each

**DigitalOcean App Platform:**
- ✅ Quick production deployment
- ✅ Zero maintenance required
- ✅ Professional hosting needs
- ✅ Automatic scaling required

**Docker:**
- ✅ Consistent environments
- ✅ Easy scaling and management
- ✅ Development/staging parity
- ✅ Container orchestration

**Universal Script:**
- ✅ VPS or dedicated servers
- ✅ Custom infrastructure
- ✅ Quick setup with full control
- ✅ Learning deployment process

**Manual Setup:**
- ✅ Maximum customization
- ✅ Enterprise requirements
- ✅ Specific security needs
- ✅ Educational purposes

---

## 🎯 Next Steps

After deployment:
1. **Configure API Keys**: Add Spotify, OpenAI, Gemini credentials
2. **Test Features**: Verify chat, recommendations, OAuth flow
3. **Monitor Performance**: Check health endpoint regularly
4. **Backup Setup**: Configure database backups
5. **SSL Renewal**: Verify automatic certificate renewal

**🌟 Need help?** Check our [troubleshooting guide](TROUBLESHOOTING.md) or [open an issue](https://github.com/dzp5103/Spotify-echo/issues).