# 🚀 EchoTune AI - DigitalOcean Production Deployment Guide

This guide provides complete instructions for deploying EchoTune AI to DigitalOcean with Docker, Nginx, SSL certificates, and production optimization.

## 📋 Prerequisites

### DigitalOcean Setup
- **Domain**: primosphere.studio
- **Primary IP**: 159.223.207.187
- **Reserved IP**: 209.38.5.39
- **Minimum Droplet**: 2 GB RAM, 2 vCPUs, 50 GB SSD (Basic Droplet)
- **Recommended**: 4 GB RAM, 2 vCPUs, 80 GB SSD (General Purpose)

### Required Information
- Spotify API credentials (Client ID & Secret)
- Database credentials (MongoDB Atlas or DigitalOcean Managed Database)
- AI provider API keys (Gemini, OpenAI, etc.)
- SSL email for Let's Encrypt certificates

### Domain Configuration
Ensure your domain DNS is configured:
```bash
A Record: primosphere.studio → 159.223.207.187
A Record: www.primosphere.studio → 159.223.207.187
```

## 🛠️ Quick Deployment (Automated)

### Option 1: One-Command Deployment

```bash
# Download and run the automated deployment script
curl -fsSL https://raw.githubusercontent.com/dzp5103/Spotify-echo/main/deploy-digitalocean-production.sh | sudo bash
```

### Option 2: Manual Download and Run

```bash
# Clone the repository
git clone https://github.com/dzp5103/Spotify-echo.git
cd Spotify-echo

# Make the script executable
chmod +x deploy-digitalocean-production.sh

# Run the deployment
sudo ./deploy-digitalocean-production.sh
```

The automated script will:
- ✅ Install all system dependencies
- ✅ Configure Docker and Docker Compose
- ✅ Set up firewall and security (UFW, fail2ban)
- ✅ Create SSL certificates with Let's Encrypt
- ✅ Deploy the application with production settings
- ✅ Configure automatic service startup
- ✅ Set up log rotation and monitoring

## 📝 Manual Deployment (Step-by-Step)

If you prefer manual control or need to customize the deployment:

### Step 1: Server Preparation

```bash
# Update the system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release ufw fail2ban

# Create deployment user
sudo useradd -r -s /bin/bash -d /opt/echotune -m echotune
sudo mkdir -p /opt/echotune/{ssl,logs,data,backups}
sudo chown -R echotune:echotune /opt/echotune
```

### Step 2: Install Docker

```bash
# Add Docker repository
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start Docker and add user to docker group
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker echotune
```

### Step 3: Configure Firewall

```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
sudo ufw --force enable
```

### Step 4: Deploy Application

```bash
# Switch to deployment user
sudo -u echotune bash

# Navigate to deployment directory
cd /opt/echotune

# Clone the repository
git clone https://github.com/dzp5103/Spotify-echo.git .

# Copy production environment template
cp .env.production .env

# Edit configuration (see Configuration section below)
nano .env
```

### Step 5: SSL Certificates

```bash
# Install certbot
sudo apt install -y certbot

# Obtain SSL certificate
sudo certbot certonly --standalone --non-interactive --agree-tos --email admin@primosphere.studio --domains primosphere.studio,www.primosphere.studio

# Copy certificates
sudo cp /etc/letsencrypt/live/primosphere.studio/fullchain.pem /opt/echotune/ssl/primosphere.studio.crt
sudo cp /etc/letsencrypt/live/primosphere.studio/privkey.pem /opt/echotune/ssl/primosphere.studio.key
sudo chown -R echotune:echotune /opt/echotune/ssl
sudo chmod 600 /opt/echotune/ssl/*
```

### Step 6: Deploy with Docker

```bash
# Switch back to deployment user
sudo -u echotune bash
cd /opt/echotune

# Build and start services
docker compose -f docker-compose.yml --profile production build
docker compose -f docker-compose.yml --profile production up -d

# Check status
docker compose ps
```

## ⚙️ Configuration

### Environment Variables (.env)

Edit `/opt/echotune/.env` with your production values:

```bash
# Domain and Server Configuration
DOMAIN=primosphere.studio
DIGITALOCEAN_IP_PRIMARY=159.223.207.187
DIGITALOCEAN_IP_RESERVED=209.38.5.39

# Security (CHANGE THESE!)
SESSION_SECRET=your_super_secure_session_secret_64_chars_minimum
JWT_SECRET=your_super_secure_jwt_secret_64_chars_minimum

# Spotify API (REQUIRED)
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=https://primosphere.studio/auth/callback

# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/echotune_prod
REDIS_URL=redis://username:password@redis-cluster.ondigitalocean.com:25061

# AI Provider API Keys
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key

# SSL Configuration
SSL_CERT_PATH=/etc/nginx/ssl/primosphere.studio.crt
SSL_KEY_PATH=/etc/nginx/ssl/primosphere.studio.key
LETSENCRYPT_EMAIL=admin@primosphere.studio
```

### Database Setup Options

#### Option 1: MongoDB Atlas (Recommended)
1. Create MongoDB Atlas account
2. Create a new cluster
3. Configure network access (add your server IP)
4. Create database user
5. Get connection string

#### Option 2: DigitalOcean Managed Database
1. Create MongoDB database in DigitalOcean
2. Configure trusted sources
3. Get connection details

#### Option 3: Self-Hosted (Included in docker-compose)
The docker-compose.yml includes MongoDB and Redis containers for development/testing.

## 🧪 Testing and Validation

### Automated Testing Script

Create a testing script to validate your deployment:

```bash
#!/bin/bash
# save as test-deployment.sh

echo "🧪 Testing EchoTune AI Deployment..."

# Test 1: Check if containers are running
echo "📦 Checking container status..."
docker compose ps

# Test 2: HTTP Health Check
echo "🔍 Testing HTTP health check..."
if curl -f http://localhost/health; then
    echo "✅ HTTP health check passed"
else
    echo "❌ HTTP health check failed"
fi

# Test 3: HTTPS Health Check
echo "🔒 Testing HTTPS health check..."
if curl -f -k https://localhost/health; then
    echo "✅ HTTPS health check passed"
else
    echo "❌ HTTPS health check failed"
fi

# Test 4: Domain Health Check
echo "🌐 Testing domain health check..."
if curl -f https://primosphere.studio/health; then
    echo "✅ Domain health check passed"
else
    echo "❌ Domain health check failed"
fi

# Test 5: SSL Certificate Check
echo "🔐 Checking SSL certificate..."
echo | openssl s_client -servername primosphere.studio -connect primosphere.studio:443 2>/dev/null | openssl x509 -noout -dates

# Test 6: Database Connectivity
echo "💾 Testing database connectivity..."
docker exec echotune-app node -e "
const { MongoClient } = require('mongodb');
MongoClient.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connection successful'))
  .catch(err => console.log('❌ MongoDB connection failed:', err.message));
"

# Test 7: Redis Connectivity
echo "📨 Testing Redis connectivity..."
docker exec echotune-redis redis-cli --no-auth-warning -a "$REDIS_PASSWORD" ping

# Test 8: API Endpoints
echo "🔌 Testing API endpoints..."
curl -f https://primosphere.studio/api/health && echo "✅ API health check passed" || echo "❌ API health check failed"

echo "🎉 Testing complete!"
```

### Manual Testing Commands

```bash
# Check container status
docker compose ps

# Check logs
docker compose logs -f app
docker compose logs -f nginx

# Test health endpoints
curl http://localhost/health
curl https://localhost/health -k
curl https://primosphere.studio/health

# Check SSL certificate
openssl s_client -servername primosphere.studio -connect primosphere.studio:443

# Monitor resource usage
docker stats

# Check database connectivity
docker exec echotune-mongodb mongosh --eval "db.adminCommand('ping')"
docker exec echotune-redis redis-cli ping
```

### Performance Testing

```bash
# Install Apache Bench for load testing
sudo apt install apache2-utils

# Basic load test (100 requests, 10 concurrent)
ab -n 100 -c 10 https://primosphere.studio/

# API load test
ab -n 50 -c 5 https://primosphere.studio/api/health

# WebSocket test (requires wscat)
npm install -g wscat
wscat -c wss://primosphere.studio/socket.io/
```

## 🔧 Management and Maintenance

### Service Management

```bash
# Start all services
sudo systemctl start echotune

# Stop all services
sudo systemctl stop echotune

# Restart services
sudo systemctl restart echotune

# Check service status
sudo systemctl status echotune

# View service logs
journalctl -u echotune -f
```

### Docker Management

```bash
# View running containers
docker compose ps

# View logs
docker compose logs -f
docker compose logs -f app
docker compose logs -f nginx

# Restart specific service
docker compose restart app
docker compose restart nginx

# Update and redeploy
git pull origin main
docker compose build --no-cache
docker compose up -d
```

### SSL Certificate Renewal

```bash
# Manual renewal
sudo certbot renew

# Check auto-renewal setup
sudo systemctl status certbot.timer
sudo certbot renew --dry-run

# Copy renewed certificates
sudo cp /etc/letsencrypt/live/primosphere.studio/fullchain.pem /opt/echotune/ssl/primosphere.studio.crt
sudo cp /etc/letsencrypt/live/primosphere.studio/privkey.pem /opt/echotune/ssl/primosphere.studio.key
sudo chown echotune:echotune /opt/echotune/ssl/*
docker compose restart nginx
```

### Backup and Restore

```bash
# Manual backup
sudo -u echotune bash -c "
cd /opt/echotune
docker exec echotune-mongodb mongodump --uri=\"$MONGODB_URI\" --out /backup/mongodb_$(date +%Y%m%d_%H%M%S)
tar -czf /opt/echotune/backups/app_data_$(date +%Y%m%d_%H%M%S).tar.gz -C data .
"

# Restore from backup
docker exec echotune-mongodb mongorestore --uri="$MONGODB_URI" /backup/mongodb_YYYYMMDD_HHMMSS/
```

### Monitoring and Logs

```bash
# Application logs
tail -f /opt/echotune/logs/*.log

# Nginx logs
tail -f /opt/echotune/nginx/logs/*.log

# Docker logs
docker compose logs -f --tail=100

# System resource monitoring
htop
df -h
free -h

# Network monitoring
netstat -tlnp
ss -tlnp
```

## 🔐 Security Best Practices

### 1. Update Default Passwords
- Change SESSION_SECRET and JWT_SECRET in .env
- Update MongoDB and Redis passwords
- Use strong, unique passwords (64+ characters)

### 2. Firewall Configuration
```bash
# Review current rules
sudo ufw status verbose

# Add specific IP restrictions if needed
sudo ufw allow from YOUR_OFFICE_IP to any port 22
```

### 3. SSL Security
- Monitor certificate expiration
- Use strong cipher suites (already configured)
- Enable HSTS headers (already configured)

### 4. Regular Updates
```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Update Docker images
docker compose pull
docker compose up -d

# Update application
git pull origin main
docker compose build --no-cache
docker compose up -d
```

### 5. Security Monitoring
```bash
# Check fail2ban status
sudo fail2ban-client status
sudo fail2ban-client status sshd

# Monitor auth logs
sudo tail -f /var/log/auth.log

# Check for unauthorized access
sudo lastlog
sudo last
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Containers Not Starting
```bash
# Check logs
docker compose logs
docker compose logs app

# Check disk space
df -h

# Check memory usage
free -h

# Restart Docker
sudo systemctl restart docker
```

#### 2. SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -in /opt/echotune/ssl/primosphere.studio.crt -text -noout

# Renew certificate
sudo certbot renew --force-renewal

# Check certificate chain
echo | openssl s_client -servername primosphere.studio -connect primosphere.studio:443 | openssl x509 -noout -text
```

#### 3. Database Connection Issues
```bash
# Test MongoDB connection
docker exec echotune-mongodb mongosh --eval "db.adminCommand('ping')"

# Check MongoDB logs
docker compose logs mongodb

# Test Redis connection
docker exec echotune-redis redis-cli ping
```

#### 4. Domain/DNS Issues
```bash
# Check DNS resolution
nslookup primosphere.studio
dig primosphere.studio

# Test from external servers
curl -I https://primosphere.studio/health
```

#### 5. Performance Issues
```bash
# Check resource usage
docker stats

# Monitor system resources
htop
iotop
nethogs

# Check application logs for errors
docker compose logs app | grep -i error
```

### Log Analysis

```bash
# Find errors in application logs
grep -i "error" /opt/echotune/logs/*.log

# Find slow requests in nginx logs
awk '$NF > 5.0' /opt/echotune/nginx/logs/access.log

# Check for 500 errors
grep " 50[0-9] " /opt/echotune/nginx/logs/access.log
```

### Recovery Procedures

#### 1. Complete Service Restart
```bash
sudo systemctl stop echotune
docker compose down
docker system prune -f
sudo systemctl start echotune
```

#### 2. Database Recovery
```bash
# Stop application
docker compose stop app

# Restore from backup
docker exec echotune-mongodb mongorestore --drop --uri="$MONGODB_URI" /backup/latest/

# Start application
docker compose start app
```

#### 3. Rollback Deployment
```bash
# Revert to previous commit
git log --oneline
git checkout PREVIOUS_COMMIT_HASH

# Rebuild and redeploy
docker compose build --no-cache
docker compose up -d
```

## 📞 Support and Resources

### Documentation
- [EchoTune AI GitHub Repository](https://github.com/dzp5103/Spotify-echo)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

### Monitoring Endpoints
- **Health Check**: https://primosphere.studio/health
- **API Health**: https://primosphere.studio/api/health
- **Application**: https://primosphere.studio/

### Log Locations
- **Application Logs**: `/opt/echotune/logs/`
- **Nginx Logs**: `/opt/echotune/nginx/logs/`
- **System Logs**: `/var/log/`
- **Docker Logs**: `docker compose logs`

### Emergency Contacts
- **Server Status**: Check DigitalOcean dashboard
- **Domain Status**: Check DNS provider dashboard
- **SSL Status**: Check certificate expiration dates

---

## 🎉 Deployment Complete!

Your EchoTune AI application should now be running at:
- **Primary URL**: https://primosphere.studio
- **Health Check**: https://primosphere.studio/health
- **API**: https://primosphere.studio/api/

Remember to:
1. ✅ Configure your Spotify API credentials
2. ✅ Set up your database connections
3. ✅ Configure AI provider API keys
4. ✅ Test all functionality thoroughly
5. ✅ Set up monitoring and alerts
6. ✅ Schedule regular backups

For ongoing support and updates, refer to the project repository and documentation.