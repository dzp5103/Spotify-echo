# 🚀 EchoTune AI - One-Click Deployment Setup Guide

This guide will help you set up the one-click deployment for EchoTune AI to DigitalOcean App Platform using GitHub Actions.

## 📋 Prerequisites

- GitHub repository with admin access
- DigitalOcean account
- Basic understanding of GitHub Actions and secrets

## 🔐 Required Secrets Configuration

To enable one-click deployment, you need to configure the following secrets in your GitHub repository.

### 1. DigitalOcean App Platform Deployment

Navigate to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

#### Required Secret:
```
Name: DIGITALOCEAN_ACCESS_TOKEN
Value: [Your DigitalOcean API Token]
```

#### How to get your DigitalOcean API Token:

1. **Log in to DigitalOcean Control Panel**
   - Visit: https://cloud.digitalocean.com/

2. **Navigate to API Section**
   - Click on "API" in the left sidebar
   - Or visit: https://cloud.digitalocean.com/account/api/tokens

3. **Generate New Token**
   - Click "Generate New Token"
   - Name: `GitHub Actions - EchoTune AI`
   - Scopes: **Read and Write** (required for app platform management)
   - Expiration: Choose based on your preference (30 days recommended for security)

4. **Copy Token**
   - Copy the generated token immediately (it won't be shown again)
   - Add it to GitHub secrets as `DIGITALOCEAN_ACCESS_TOKEN`

### 2. Optional Secrets (for additional deployment methods)

#### For Docker Hub Deployment:
```
Name: DOCKER_USERNAME
Value: [Your Docker Hub username]

Name: DOCKER_PASSWORD  
Value: [Your Docker Hub password or access token]
```

#### For DigitalOcean Droplet Deployment:
```
Name: DROPLET_SSH_KEY
Value: [Your private SSH key for droplet access]

Name: DROPLET_IP
Value: [Your droplet's IP address]
```

#### For Enhanced Security:
```
Name: SESSION_SECRET
Value: [A random 32+ character string for session encryption]

Name: JWT_SECRET
Value: [A random 32+ character string for JWT signing]
```

## 🚀 How to Deploy

### Method 1: Automatic Deployment (Recommended)

1. **Push to Main Branch**
   ```bash
   git push origin main
   ```
   - Deployment will trigger automatically when you push changes to `src/`, `package.json`, `Dockerfile`, or `app.yaml`

### Method 2: Manual Deployment

1. **Go to GitHub Actions**
   - Navigate to your repository → Actions tab
   - Select "🚀 One-Click Deploy to DigitalOcean" workflow

2. **Run Workflow**
   - Click "Run workflow"
   - Select deployment target: `digitalocean-app-platform`
   - Choose environment: `production` or `staging`
   - Enable monitoring: `true` (recommended)
   - Click "Run workflow"

3. **Monitor Progress**
   - Watch the deployment progress in real-time
   - Check for any errors in the logs
   - Deployment typically takes 3-5 minutes

## 📊 Deployment Status

Once deployment is complete, you'll see:

- ✅ **Build Status**: Application built successfully
- ✅ **App Platform**: Deployed to DigitalOcean App Platform
- 🌐 **Live URL**: Your application URL (e.g., `https://echotune-ai-[hash].ondigitalocean.app`)
- 🏥 **Health Check**: Application health verification

## 🔧 Post-Deployment Configuration

### 1. Access Your Application
Your app will be available at the URL provided in the deployment logs, typically:
```
https://echotune-ai-[commit-hash].ondigitalocean.app
```

### 2. Configure Spotify Integration (Optional but Recommended)
1. Visit the DigitalOcean App Platform console
2. Navigate to your app → Settings → Environment Variables
3. Add your Spotify credentials:
   ```
   SPOTIFY_CLIENT_ID: [Your Spotify Client ID]
   SPOTIFY_CLIENT_SECRET: [Your Spotify Client Secret]
   ```

### 3. Enable AI Features (Optional)
Add AI provider API keys for enhanced features:
```
GEMINI_API_KEY: [Your Google Gemini API key]
OPENAI_API_KEY: [Your OpenAI API key]
DEFAULT_LLM_PROVIDER: gemini
```

## 🔍 Troubleshooting

### Common Issues:

1. **"Missing DIGITALOCEAN_ACCESS_TOKEN secret"**
   - Ensure you've added the DigitalOcean API token to GitHub secrets
   - Verify the token has Read/Write permissions
   - Check that the token hasn't expired

2. **"App deployment failed"**
   - Check the GitHub Actions logs for specific error messages
   - Verify your app.yaml configuration is valid
   - Ensure your DigitalOcean account has sufficient resources

3. **"Health check failed"**
   - The application might still be starting up (can take 2-3 minutes)
   - Check if the health endpoint `/health` is accessible
   - Review application logs in DigitalOcean console

### Debug Commands:

```bash
# Check app status
doctl apps list

# View app details
doctl apps get [APP_ID]

# Check app logs
doctl apps logs [APP_ID]
```

## 📚 Additional Resources

- **DigitalOcean App Platform Docs**: https://docs.digitalocean.com/products/app-platform/
- **GitHub Actions for DigitalOcean**: https://docs.digitalocean.com/products/app-platform/how-to/deploy-from-github-actions/
- **EchoTune AI Documentation**: [Repository README](./README.md)

## 🆘 Getting Help

If you encounter issues:

1. **Check GitHub Actions logs** for detailed error information
2. **Review DigitalOcean console** for app-specific logs and metrics
3. **Open an issue** in the repository with deployment logs
4. **Consult the troubleshooting section** above

## 🔒 Security Best Practices

1. **Rotate API tokens regularly** (every 30-90 days)
2. **Use environment-specific secrets** for staging vs production
3. **Monitor deployment logs** for any sensitive information exposure
4. **Enable DigitalOcean monitoring** for production deployments
5. **Set up alerts** for deployment failures or health check issues

---

🎵 **Ready to deploy? Follow this guide and your EchoTune AI will be live in minutes!**