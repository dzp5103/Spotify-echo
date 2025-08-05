# 🚀 DigitalOcean App Platform Deployment Guide

This guide provides step-by-step instructions for deploying EchoTune AI on DigitalOcean App Platform, which offers a more streamlined deployment experience compared to traditional droplet setup.

## 📋 Prerequisites

### Required Accounts and Information
- DigitalOcean account with App Platform access
- GitHub account with repository access
- Spotify Developer account with app configured
- Domain name (optional but recommended)

### Required Environment Variables
```env
# Spotify API (REQUIRED)
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=https://your-app.ondigitalocean.app/auth/callback

# Production Settings
NODE_ENV=production
PORT=3000

# Security (REQUIRED for production)
SESSION_SECRET=generate_secure_32_char_random_string
JWT_SECRET=generate_secure_32_char_random_string

# Optional: Database Configuration
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/echotune
REDIS_URL=redis://redis-url:6379

# Optional: AI Providers
OPENAI_API_KEY=sk-your-openai-key
GEMINI_API_KEY=your-gemini-key
LLM_PROVIDER=openai
```

## 🏗️ App Platform Configuration

### Deployment Settings

**Build Configuration:**
- **Build Command**: `npm install && npm run build`
- **Run Command**: `npm start`
- **Environment**: Node.js
- **Node Version**: 20.x

**App Specification (app.yaml):**
```yaml
name: echotune-ai
services:
- name: web
  source_dir: /
  github:
    repo: dzp5103/Spotify-echo
    branch: main
  run_command: npm start
  build_command: npm install --production
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  routes:
  - path: /
  envs:
  - key: NODE_ENV
    value: production
  - key: PORT
    value: "3000"
  - key: SPOTIFY_CLIENT_ID
    value: ${SPOTIFY_CLIENT_ID}
  - key: SPOTIFY_CLIENT_SECRET
    value: ${SPOTIFY_CLIENT_SECRET}
    type: SECRET
  - key: SPOTIFY_REDIRECT_URI
    value: https://echotune-ai-YOUR_APP_ID.ondigitalocean.app/auth/callback
  - key: SESSION_SECRET
    value: ${SESSION_SECRET}
    type: SECRET
  - key: JWT_SECRET
    value: ${JWT_SECRET}
    type: SECRET
```

### Entry Point Files

The repository includes multiple entry point options for maximum compatibility:

1. **`server.js`** (root) - Primary entry point for App Platform
2. **`index.js`** (root) - Alternative entry point
3. **`src/index.js`** - Original entry point

All three files point to the same server implementation in `src/server.js`.

## 🚀 Deployment Steps

### Step 1: Prepare Repository
Ensure your repository has the necessary entry point files (already included):
- ✅ `server.js` (root level)
- ✅ `index.js` (root level) 
- ✅ `package.json` with correct start script

### Step 2: Create App on DigitalOcean

1. **Access App Platform:**
   - Log into DigitalOcean Console
   - Navigate to "Apps" in the sidebar
   - Click "Create App"

2. **Connect Repository:**
   - Choose "GitHub" as source
   - Authorize DigitalOcean to access your repositories
   - Select `dzp5103/Spotify-echo` repository
   - Choose `main` branch
   - Enable "Autodeploy" for automatic updates

3. **Configure Build Settings:**
   - **Environment**: Node.js
   - **Build Command**: `npm install --production`
   - **Run Command**: `npm start`
   - **Output Directory**: Leave empty
   - **Source Directory**: `/` (root)

### Step 3: Configure Environment Variables

Add the following environment variables in the App Platform console:

**Required Variables:**
```
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret (mark as SECRET)
SPOTIFY_REDIRECT_URI=https://your-app.ondigitalocean.app/auth/callback
NODE_ENV=production
SESSION_SECRET=your_32_char_secret (mark as SECRET)
JWT_SECRET=your_32_char_secret (mark as SECRET)
```

**Optional Variables:**
```
MONGODB_URI=your_mongodb_connection_string (mark as SECRET)
REDIS_URL=your_redis_url
OPENAI_API_KEY=your_openai_key (mark as SECRET)
GEMINI_API_KEY=your_gemini_key (mark as SECRET)
LLM_PROVIDER=openai
```

### Step 4: Configure Spotify App

Update your Spotify app settings:
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Select your app
3. Click "Edit Settings"
4. Add redirect URI: `https://your-app.ondigitalocean.app/auth/callback`
5. Save changes

### Step 5: Deploy Application

1. **Review Configuration:**
   - Verify all environment variables are set
   - Check build and run commands
   - Confirm repository connection

2. **Deploy:**
   - Click "Create Resources"
   - Wait for build to complete (5-10 minutes)
   - Monitor build logs for any errors

3. **Verify Deployment:**
   - Check app status in console
   - Test health endpoint: `https://your-app.ondigitalocean.app/health`
   - Test Spotify login flow

## 🔧 Build Optimization

### Docker Build Issues (Resolved)

The repository's Dockerfile has been updated to handle Playwright/Puppeteer dependencies:

**Key Improvements:**
- ✅ Installs browser dependencies as root before switching users
- ✅ Uses system Chromium instead of downloading during build
- ✅ Handles Playwright installation with `--with-deps` flag
- ✅ Optimized for production deployment environments

**Environment Variables for Browser Automation:**
```env
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
PLAYWRIGHT_BROWSERS_PATH=/app/.cache/playwright
```

### Performance Optimization

**App Platform Specific Settings:**
```yaml
# Recommended instance sizes:
# - basic-xxs: Development/testing ($5/month)
# - basic-xs: Small production ($12/month)  
# - basic-s: Medium production ($25/month)

services:
- name: web
  instance_size_slug: basic-xs  # Adjust based on needs
  instance_count: 1             # Scale horizontally as needed
```

## 🛡️ Security Configuration

### Environment Variables Security
- Mark sensitive variables as "SECRET" in App Platform
- Use strong, randomly generated secrets
- Rotate secrets regularly

### CORS Configuration
The app automatically configures CORS for your App Platform domain:
```javascript
// Automatically configured based on deployment
origin: process.env.NODE_ENV === 'production' 
  ? [`https://${process.env.DOMAIN || 'your-app.ondigitalocean.app'}`]
  : ['http://localhost:3000']
```

### SSL/TLS
- ✅ Automatic SSL certificates provided by App Platform
- ✅ HTTPS enforced by default
- ✅ Security headers configured in application

## 📊 Monitoring and Logs

### App Platform Monitoring
Access built-in monitoring via console:
- **Runtime Logs**: Real-time application logs
- **Build Logs**: Deployment and build process logs
- **Metrics**: CPU, memory, and request metrics
- **Alerts**: Configure alerts for downtime or errors

### Health Checks
The application provides multiple health check endpoints:
- `/health` - Comprehensive system health
- `/health/application` - Application-specific checks
- `/health/database` - Database connectivity
- `/ready` - Readiness probe
- `/alive` - Liveness probe

### Custom Monitoring
```bash
# Check application health
curl https://your-app.ondigitalocean.app/health

# Monitor specific components
curl https://your-app.ondigitalocean.app/health/database
curl https://your-app.ondigitalocean.app/health/application
```

## 🔄 Continuous Deployment

### Automatic Deployments
With "Autodeploy" enabled, the app automatically redeploys when:
- Code is pushed to the main branch
- Environment variables are updated
- App configuration changes

### Manual Deployments
Force deployment via console:
1. Go to your app in DigitalOcean Console
2. Click "Actions" → "Force Rebuild and Deploy"
3. Monitor build progress in logs

### Rollback Process
If issues occur after deployment:
1. Go to "Activity" tab in app console
2. Find previous successful deployment
3. Click "Rollback" next to that deployment

## 🌍 Custom Domain Setup

### Step 1: Add Domain
1. In app console, go to "Settings" tab
2. Click "Domains" section
3. Click "Add Domain"
4. Enter your domain name

### Step 2: Configure DNS
Point your domain to App Platform:
```
Type: CNAME
Name: @ (or subdomain)
Value: your-app.ondigitalocean.app
TTL: 300
```

### Step 3: Update Environment Variables
Update Spotify redirect URI and app configuration:
```env
SPOTIFY_REDIRECT_URI=https://yourdomain.com/auth/callback
FRONTEND_URL=https://yourdomain.com
DOMAIN=yourdomain.com
```

## 🚨 Troubleshooting

### Common Build Issues

**Issue: "Cannot find module" errors**
```bash
# Solution: Ensure all dependencies are in package.json
npm install --save missing-package
```

**Issue: Playwright/Puppeteer install fails**
```bash
# Already resolved in updated Dockerfile
# The build now uses system browsers instead of downloading
```

**Issue: "ENOENT: no such file or directory, open 'server.js'"**
```bash
# Resolved: Root-level server.js now exists
# App Platform will use: npm start -> node server.js
```

### Runtime Issues

**Issue: Spotify authentication fails**
```bash
# Check redirect URI matches exactly:
# App Platform: https://your-app.ondigitalocean.app/auth/callback
# Custom domain: https://yourdomain.com/auth/callback
```

**Issue: Environment variables not loaded**
```bash
# Verify in App Platform console:
# - All required variables are set
# - Sensitive variables marked as SECRET
# - No typos in variable names
```

**Issue: Health check fails**
```bash
# Check application logs in console
# Test health endpoint manually
# Verify database connections if configured
```

### Emergency Procedures

**Application Down:**
1. Check app status in console
2. Review runtime logs for errors
3. Check resource usage (CPU/memory)
4. Force rebuild if necessary
5. Rollback to previous version if needed

**Build Failures:**
1. Review build logs in console
2. Check for dependency issues
3. Verify package.json configuration
4. Test build locally if possible
5. Check for repository access issues

## 💰 Cost Estimation

### App Platform Pricing (as of 2024)
| Tier | CPU/Memory | Price/Month | Use Case |
|------|------------|-------------|----------|
| Basic XXS | 0.25 vCPU, 0.5 GB | $5 | Development/Testing |
| Basic XS | 0.5 vCPU, 1 GB | $12 | Small Production |
| Basic S | 1 vCPU, 2 GB | $25 | Medium Production |
| Basic M | 2 vCPU, 4 GB | $50 | High Traffic |

### Additional Costs
- **Custom Domain**: Free
- **SSL Certificate**: Free (automatic)
- **Bandwidth**: 1TB included, then $0.01/GB
- **Build Minutes**: 400 included, then $0.007/minute

### Cost Optimization Tips
1. Start with Basic XS and scale as needed
2. Use efficient build processes to minimize build time
3. Implement proper caching to reduce CPU usage
4. Monitor usage in console and optimize accordingly

## 📚 Resources

### Documentation
- [DigitalOcean App Platform Docs](https://docs.digitalocean.com/products/app-platform/)
- [Node.js App Deployment](https://docs.digitalocean.com/products/app-platform/languages-frameworks/nodejs/)
- [Environment Variables](https://docs.digitalocean.com/products/app-platform/how-to/use-environment-variables/)

### Support
- [DigitalOcean Community](https://www.digitalocean.com/community/)
- [App Platform Status](https://status.digitalocean.com/)
- [Submit Support Ticket](https://cloud.digitalocean.com/support)

---

## 🎉 Success!

Your EchoTune AI application should now be successfully deployed on DigitalOcean App Platform with:

✅ **Automatic SSL/TLS**  
✅ **Scalable Infrastructure**  
✅ **Continuous Deployment**  
✅ **Built-in Monitoring**  
✅ **Professional Reliability**  

Access your application at: `https://your-app.ondigitalocean.app`

For additional configuration or issues, refer to the troubleshooting section above.