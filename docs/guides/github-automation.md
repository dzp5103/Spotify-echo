# 🔧 GitHub Automation Setup Guide

This document provides comprehensive guidance for setting up GitHub tokens, permissions, and automation workflows for the EchoTune AI project, specifically for Copilot SWE agent integration.

## 🔐 Required GitHub Secrets and Tokens

### 1. GitHub Personal Access Token (GH_PAT)

**Purpose**: Enables Copilot SWE agent to perform automated operations like creating PRs, reviews, and merges.

**Required Permissions**:
- `repo` (Full control of private repositories)
- `workflow` (Update GitHub Action workflows)
- `write:packages` (Upload packages to GitHub Package Registry)
- `delete:packages` (Delete packages from GitHub Package Registry)
- `admin:repo_hook` (Full control of repository hooks)
- `admin:org_hook` (Full control of organization hooks)

**Setup Steps**:
1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Set expiration to "No expiration" or long-term (90 days minimum)
4. Select the required scopes above
5. Generate token and copy immediately (won't be shown again)

**Repository Configuration**:
1. Go to repository Settings → Secrets and variables → Actions
2. Create new repository secret named `GH_PAT`
3. Paste the generated token value

### 2. Additional Required Secrets

#### For DigitalOcean Deployment:
```bash
DIGITALOCEAN_ACCESS_TOKEN=dop_v1_xxxxxxxxxxxxxxxxxxxx
DROPLET_SSH_KEY=-----BEGIN OPENSSH PRIVATE KEY-----...
DROPLET_IP=192.168.1.100
```

#### For Docker Hub Deployment:
```bash
DOCKER_USERNAME=your_dockerhub_username
DOCKER_PASSWORD=your_dockerhub_password_or_token
```

#### For AI Services:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxx
```

#### For Security (Auto-generated if not provided):
```bash
SESSION_SECRET=your_32_character_random_string
JWT_SECRET=your_jwt_secret_for_tokens
```

## 🤖 GitHub App Alternative (Recommended)

For enhanced security and better permissions management, consider creating a GitHub App instead of using Personal Access Tokens:

### GitHub App Setup:
1. Go to GitHub Settings → Developer settings → GitHub Apps
2. Click "New GitHub App"
3. Fill in app details:
   - **App name**: `EchoTune-AI-Automation`
   - **Homepage URL**: `https://github.com/dzp5103/Spotify-echo`
   - **Description**: `Automated CI/CD and Copilot integration for EchoTune AI`

4. **Permissions needed**:
   - Repository permissions:
     - Contents: Read & Write
     - Pull requests: Read & Write
     - Issues: Read & Write
     - Actions: Read & Write
     - Checks: Read & Write
     - Metadata: Read
   - Organization permissions:
     - Members: Read (if organization)

5. **Events to subscribe to**:
   - Pull request
   - Push
   - Issues
   - Check run
   - Workflow run

6. **Install the app** on the repository
7. **Generate a private key** and store it as `GITHUB_APP_PRIVATE_KEY` secret
8. Note the **App ID** and store as `GITHUB_APP_ID` secret

## 🔄 Workflow Optimization

### Current Workflow Issues:
1. **Multiple conflicting workflows** running simultaneously
2. **Redundant CI/CD pipelines** causing resource waste
3. **Inconsistent automation** between different workflow files
4. **Security concerns** with exposed tokens

### Recommended Workflow Structure:

#### Core Workflows (Keep):
1. **`auto-review-merge.yml`** - Copilot SWE agent automation
2. **`main.yml`** - Simple Gemini code review for regular PRs
3. **`deploy-one-click.yml`** - Manual deployment workflow

#### Workflows to Consolidate/Disable:
1. **`unified-optimized-pipeline.yml`** → Disable (too complex, conflicts with others)
2. **`continuous-agent.yml`** → Merge into auto-review-merge.yml or disable
3. **`deploy.yml`** → Disable (superseded by deploy-one-click.yml)
4. **`optimized-pipeline.yml`** → Disable (redundant)
5. **`status-notifications.yml`** → Simplify or disable

## 🛡️ Security Best Practices

### Token Security:
1. **Rotate tokens immediately** if exposed in comments/logs
2. **Use fine-grained tokens** when possible
3. **Set appropriate expiration** dates
4. **Monitor token usage** in GitHub audit logs
5. **Use GitHub Apps** instead of PATs for production

### Workflow Security:
1. **Limit workflow permissions** to minimum required
2. **Use `secrets` context** properly
3. **Never echo sensitive values** in logs
4. **Validate inputs** in workflow_dispatch events
5. **Use environment protection** rules for production deployments

## 🚀 Copilot SWE Agent Configuration

### Optimal Settings for auto-review-merge.yml:

```yaml
env:
  GITHUB_TOKEN: ${{ secrets.GH_PAT || secrets.GITHUB_TOKEN }}
  
permissions:
  contents: write
  pull-requests: write
  actions: write
  checks: read
  issues: write  # Added for better integration
```

### Trigger Configuration:
```yaml
on:
  pull_request:
    types: [opened, synchronize, ready_for_review]
    branches: [main]
  push:
    branches: ['copilot/**']
  workflow_dispatch:
    inputs:
      pr_number:
        description: 'PR number to review and merge'
        required: true
        type: number
```

## 🔍 Troubleshooting Common Issues

### "Invalid workflow file" Error:
- Check YAML syntax with `yamllint`
- Ensure proper indentation (spaces, not tabs)
- Validate multiline strings are properly quoted
- Use `|` or `>` for multiline content when needed

### Permission Denied Errors:
- Verify GH_PAT has required scopes
- Check repository settings allow Actions to create PRs
- Ensure token hasn't expired
- Confirm App installation if using GitHub App

### Workflow Conflicts:
- Review workflow triggers for overlaps
- Use `if` conditions to prevent simultaneous runs
- Consider workflow dependencies with `needs`
- Implement proper concurrency controls

### Authentication Issues:
- Use `secrets.GITHUB_TOKEN` for basic operations
- Use `secrets.GH_PAT` for advanced operations
- Ensure token is properly configured in repository secrets
- Check token permissions in GitHub settings

## 📋 Verification Checklist

- [ ] GH_PAT token configured with proper permissions
- [ ] All required secrets added to repository
- [ ] Conflicting workflows disabled or consolidated
- [ ] Security scan passed (no exposed secrets)
- [ ] Copilot SWE agent can successfully create and merge PRs
- [ ] Manual workflow dispatch works correctly
- [ ] Deployment workflows function properly
- [ ] Error handling and notifications working

## 🆘 Emergency Procedures

### If Token is Compromised:
1. Immediately revoke the compromised token in GitHub settings
2. Generate a new token with same permissions
3. Update the `GH_PAT` secret in repository settings
4. Review recent activity for unauthorized access
5. Consider rotating related secrets as well

### If Workflows are Failing:
1. Check workflow logs for specific errors
2. Verify all required secrets are configured
3. Test with manual `workflow_dispatch` trigger
4. Disable conflicting workflows temporarily
5. Use the manual-merge.sh script as fallback

## 📞 Support Resources

- **GitHub Actions Documentation**: https://docs.github.com/en/actions
- **GitHub Apps Documentation**: https://docs.github.com/en/developers/apps
- **Personal Access Tokens**: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token
- **Repository Issues**: https://github.com/dzp5103/Spotify-echo/issues
- **Security Advisory**: https://github.com/dzp5103/Spotify-echo/security/advisories

---

*Last Updated: 2024-12-21*
*Maintained by: EchoTune AI Development Team*