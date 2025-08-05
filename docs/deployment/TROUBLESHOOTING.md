# 🆘 EchoTune AI - Comprehensive Troubleshooting Guide

This guide helps resolve common issues and optimize performance for EchoTune AI.

## 🔍 Quick Diagnosis

### Health Check First
```bash
curl -f http://localhost:3000/health
# or
curl -f https://yourdomain.com/health
```

### Common Status Responses
- **"healthy"**: All systems operational  
- **"warning"**: Some optional features unavailable
- **"unhealthy"**: Critical issues requiring attention

## 🚨 Application Issues

### 1. Application Won't Start

**Symptoms**: Server fails to start, connection refused errors

**Diagnose**:
```bash
# Check if port is in use
sudo netstat -tlnp | grep :3000
lsof -i :3000

# Check application logs
npm start  # See startup errors
sudo journalctl -u echotune --lines=50  # For systemd service
docker-compose logs app  # For Docker
```

**Solutions**:
```bash
# Kill process using port 3000
sudo kill -9 <PID>

# Install missing dependencies
npm install
pip3 install -r requirements.txt

# Fix environment variables
cp .env.example .env
# Edit .env with proper values

# Restart service
sudo systemctl restart echotune
docker-compose restart app
```

### 2. Chat Interface Not Working

**Symptoms**: "No providers configured", chat disabled

**Diagnose**:
```bash
curl -s http://localhost:3000/api/chat/providers | jq .
```

**Solutions**:
```bash
# Option 1: Use demo mode (works without API keys)
echo "DEFAULT_LLM_PROVIDER=mock" >> .env

# Option 2: Add valid API keys
echo "GEMINI_API_KEY=your_key_here" >> .env
echo "OPENAI_API_KEY=your_key_here" >> .env

# Restart application
npm start
```

### 3. Spotify OAuth Errors

**Symptoms**: Authentication failures, redirect errors

**Common Issues**:
- ❌ Incorrect redirect URI
- ❌ Invalid client credentials  
- ❌ Missing scopes

**Solutions**:
```bash
# Check Spotify app configuration
# Redirect URI must exactly match:
SPOTIFY_REDIRECT_URI=https://yourdomain.com/auth/callback

# Verify credentials in .env
SPOTIFY_CLIENT_ID=your_actual_client_id
SPOTIFY_CLIENT_SECRET=your_actual_client_secret

# Test OAuth endpoint
curl -f http://localhost:3000/auth/spotify
```

### 4. Database Connection Issues

**Symptoms**: Health check shows database errors

**MongoDB Issues**:
```bash
# Check MongoDB connection string format
# Correct: mongodb+srv://user:pass@cluster.mongodb.net/dbname
# Check network access in MongoDB Atlas

# Test connection
mongosh "mongodb+srv://user:pass@cluster.mongodb.net/test"
```

**SQLite Fallback** (automatic):
```bash
# SQLite files should appear in project directory
ls -la *.db

# SQLite works without external database
# Application automatically falls back to SQLite
```

## 🤖 MCP Tools Issues

### Enhanced File Utilities Not Working
**Symptoms**: File operations fail with security violations or permission errors

**Solutions**:
1. **Check allowed directories**:
   ```bash
   node mcp-servers/enhanced-file-utilities.js health
   ```
   
2. **Verify file permissions**:
   ```bash
   ls -la package.json
   chmod 644 package.json  # If needed
   ```

3. **Update configuration**:
   ```javascript
   const fileMCP = new EnhancedFileMCP({
     allowedDirectories: [
       process.cwd(),
       path.join(process.cwd(), 'src'),
       path.join(process.cwd(), 'scripts')
     ]
   });
   ```

### Browser Automation Issues
**Symptoms**: Browser operations fail, screenshot capture errors

**Solutions**:
```bash
# Install browser dependencies
npm run mcp-install

# Test browser tools
node mcp-servers/enhanced-browser-tools.js health

# Check Puppeteer installation
npx puppeteer install
```

### Comprehensive Validator Failures
**Symptoms**: System validation reports critical issues

**Solutions**:
```bash
# Run full system validation
node mcp-servers/comprehensive-validator.js validate

# Check individual components
node mcp-servers/comprehensive-validator.js system
```

## ⚡ Performance Issues

### Slow Health Checks
**Expected Performance**: < 100ms in development, < 500ms in production

**Optimization**:
```bash
# Development mode skips slow network checks
NODE_ENV=development

# Check current performance
time curl -s http://localhost:3000/health
```

### Memory Issues
```bash
# Check system resources
free -h  # Memory usage
df -h    # Disk space
htop     # CPU usage

# EchoTune AI requirements:
# - Minimum: 1GB RAM, 5GB disk
# - Recommended: 2GB RAM, 10GB disk
```

## 🔒 SSL & Security Issues

### Let's Encrypt Certificate Problems
```bash
# Check domain DNS
dig yourdomain.com +short
# Should return your server IP

# Verify port 80 is accessible
curl -I http://yourdomain.com

# Manual certificate generation
sudo certbot --nginx -d yourdomain.com

# Check certificate status
sudo certbot certificates
```

### Security Headers Missing
```bash
# Check security headers
curl -I https://yourdomain.com | grep -E "(Strict-Transport|Content-Security|X-Frame)"

# Test rate limiting
for i in {1..15}; do curl -s -o /dev/null -w "%{http_code}\n" https://yourdomain.com/api/chat; done
# Should show 429 (rate limited) after threshold
```

## 🐳 Docker Issues

### Container Won't Start
```bash
# Check Docker daemon
sudo systemctl status docker

# Check container logs
docker-compose logs app

# Rebuild containers
docker-compose down
docker-compose up -d --build

# Check resource allocation
docker stats
```

### Port Conflicts
```bash
# Use different ports
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
# This uses alternative port configuration
```

## 🔧 Debug Mode

### Enable Debug Logging
```bash
# Add to .env file
DEBUG=true
LOG_LEVEL=DEBUG
VERBOSE_LOGGING=true

# Restart application
npm start
```

### Debug Output Examples
```bash
# Successful startup
🎵 EchoTune AI Server running on port 3000
✅ Database manager initialized
✅ LLM Provider Manager initialized successfully

# Common warnings (acceptable)
🔑 Spotify configured: false  # Demo mode active
📦 Running in fallback mode (SQLite)
🤖 LLM Provider Manager: Using existing chat system
```

## 📊 Monitoring & Diagnostics

### Performance Monitoring
```bash
# Check endpoint response times
curl -w "@curl-format.txt" -s http://localhost:3000/api/chat/providers

# Monitor resource usage
watch -n 1 'free -h && echo "---" && df -h / && echo "---" && ps aux | grep node | head -5'
```

### Network Diagnostics
```bash
# Test external API access
curl -f https://api.spotify.com  # Spotify API
curl -f https://api.openai.com   # OpenAI API

# Test DNS resolution
nslookup api.spotify.com
```

## 🆘 Getting Help

### Self-Help Resources
1. **Check Health Endpoint**: Most issues show up in health check
2. **Review Logs**: Application logs contain detailed error information  
3. **Validate Environment**: Ensure all required variables are set
4. **Test Connectivity**: Verify network access to external APIs

### Community Support
- 📖 [Documentation](docs/)
- 🐛 [Report Issues](https://github.com/dzp5103/Spotify-echo/issues)
- 💬 [Discussions](https://github.com/dzp5103/Spotify-echo/discussions)

### When Reporting Issues
Include the following information:

```bash
# 1. System information
uname -a
node --version
npm --version

# 2. Health check output
curl -s http://localhost:3000/health | jq .

# 3. Recent logs
sudo journalctl -u echotune --lines=50  # systemd
docker-compose logs --tail=50 app       # Docker

# 4. Environment (without secrets)
printenv | grep -E "(NODE_ENV|SPOTIFY|MONGO|PORT)" | sed 's/=.*/=***/'
```

## 🔄 Recovery Procedures

### Complete Reset (Development)
```bash
# Stop application
npm stop
docker-compose down

# Clean reset
rm -rf node_modules package-lock.json
rm -f *.db  # Remove SQLite databases
npm install

# Restart
npm start
```

### Backup & Restore
```bash
# Backup SQLite database
cp echotune.db echotune.db.backup

# Backup configuration
cp .env .env.backup

# Restore from backup
cp echotune.db.backup echotune.db
cp .env.backup .env
```

---

**🎯 Still having issues?** Create a [detailed issue report](https://github.com/dzp5103/Spotify-echo/issues/new) with the diagnostic information above.
     ]
   });
   ```

#### Browser Tools Failing
**Symptoms**: Puppeteer crashes, browser won't start, or navigation timeouts

**Solutions**:
1. **Install system dependencies**:
   ```bash
   # Ubuntu/Debian
   sudo apt-get update
   sudo apt-get install -y chromium-browser

   # Or install Puppeteer's Chromium
   npx puppeteer browsers install chrome
   ```

2. **Configure browser path**:
   ```bash
   export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
   export PUPPETEER_HEADLESS=true
   ```

3. **Test browser tools**:
   ```bash
   node mcp-servers/enhanced-browser-tools.js health
   ```

#### Comprehensive Validator Errors
**Symptoms**: System validation fails or reports critical issues

**Solutions**:
1. **Check system resources**:
   ```bash
   node mcp-servers/comprehensive-validator.js system
   ```

2. **Fix security issues**:
   ```bash
   # Fix file permissions
   chmod 600 api_keys.env
   chmod 644 .env.example
   ```

3. **Set required environment variables**:
   ```bash
   export NODE_ENV=development
   export DEFAULT_LLM_PROVIDER=mock
   ```

### Workflow Issues

#### GitHub Actions Failing
**Symptoms**: Workflows timeout, fail to start, or have dependency issues

**Solutions**:
1. **Check workflow syntax**:
   ```bash
   npm run workflow:analyze
   ```

2. **Optimize workflows**:
   ```bash
   npm run workflow:optimize
   ```

3. **Apply optimizations**:
   ```bash
   npm run workflow:optimize:apply
   ```

#### Cache Issues
**Symptoms**: Slow CI runs, repeated dependency downloads

**Solutions**:
1. **Clear npm cache**:
   ```bash
   npm cache clean --force
   ```

2. **Update cache keys** in workflows:
   ```yaml
   - uses: actions/cache@v4
     with:
       key: echotune-v2-deps-${{ hashFiles('package-lock.json') }}
   ```

### Application Issues

#### Linting Errors
**Symptoms**: ESLint reports errors preventing code quality checks

**Solutions**:
1. **Run automatic fixes**:
   ```bash
   npm run lint:fix
   ```

2. **Fix specific error types**:
   ```bash
   # React hooks dependencies
   # Add missing dependencies or use useCallback/useMemo
   
   # Unused variables
   # Prefix with underscore: _unusedVar
   
   # Character class issues
   # Use Unicode flag: /pattern/gu
   ```

#### Test Failures
**Symptoms**: Tests timeout, fail to start, or have import errors

**Solutions**:
1. **Check test environment**:
   ```bash
   npm test -- --verbose
   ```

2. **Fix common issues**:
   ```bash
   # Clear Jest cache
   npx jest --clearCache
   
   # Update test configuration
   npm run test:unit
   npm run test:integration
   ```

#### Database Connection Issues
**Symptoms**: MongoDB/Supabase connection failures

**Solutions**:
1. **Check connection strings**:
   ```bash
   # Test MongoDB connection
   node -e "
   const { MongoClient } = require('mongodb');
   MongoClient.connect(process.env.MONGODB_URI)
     .then(() => console.log('✅ MongoDB connected'))
     .catch(err => console.log('❌ MongoDB error:', err.message));
   "
   ```

2. **Use SQLite fallback**:
   ```bash
   # Remove MongoDB/Supabase config to use SQLite
   unset MONGODB_URI
   unset SUPABASE_URL
   ```

### Performance Issues

#### Slow MCP Operations
**Symptoms**: File operations or validations taking too long

**Solutions**:
1. **Check performance metrics**:
   ```bash
   node mcp-servers/enhanced-file-utilities.js performance
   ```

2. **Optimize operations**:
   ```javascript
   // Use batch operations for multiple files
   const operations = files.map(file => ({ type: 'read', path: file }));
   const results = await fileMCP.batchOperations(operations);
   ```

3. **Clear audit logs**:
   ```javascript
   // Audit logs are auto-trimmed, but you can check size
   const auditTrail = fileMCP.getAuditTrail(10);
   console.log('Recent operations:', auditTrail.length);
   ```

#### Memory Leaks
**Symptoms**: High memory usage, application crashes

**Solutions**:
1. **Enable garbage collection**:
   ```bash
   node --expose-gc mcp-servers/enhanced-file-utilities.js health
   ```

2. **Monitor memory usage**:
   ```bash
   node mcp-servers/comprehensive-validator.js health | jq '.validation.results.system.metrics.memory'
   ```

3. **Optimize batch sizes**:
   ```javascript
   // Process files in smaller batches
   const batchSize = 10;
   for (let i = 0; i < files.length; i += batchSize) {
     const batch = files.slice(i, i + batchSize);
     await processBatch(batch);
   }
   ```

## 🔧 Diagnostic Commands

### System Health Check
```bash
# Comprehensive system validation
node mcp-servers/comprehensive-validator.js health

# Quick health check
npm run health-check

# MCP servers status
npm run mcp-health
```

### Performance Diagnostics
```bash
# MCP integration test with performance metrics
node mcp-servers/mcp-integration-tester.js

# File utilities performance
node mcp-servers/enhanced-file-utilities.js performance

# Browser tools performance
node mcp-servers/enhanced-browser-tools.js performance
```

### Workflow Analysis
```bash
# Analyze workflow efficiency
npm run workflow:analyze

# Generate optimization report
npm run workflow:report

# Check workflow status
npm run workflow:status
```

## 🐛 Debug Mode

### Enable Debug Logging
```bash
export DEBUG=true
export LOG_LEVEL=DEBUG
export NODE_ENV=development
```

### Verbose Testing
```bash
# Run tests with detailed output
npm test -- --verbose --detectOpenHandles

# Run specific test files
npm test tests/integration/enhanced-mcp-tools.test.js

# Run performance tests
npm test tests/performance/mcp-performance.test.js
```

### MCP Debug Mode
```javascript
// Enable debug mode in MCP tools
const fileMCP = new EnhancedFileMCP();
const debugInfo = {
  allowedDirectories: fileMCP.allowedDirectories,
  allowedExtensions: fileMCP.allowedExtensions,
  operationLog: fileMCP.getAuditTrail(5)
};
console.log('Debug info:', debugInfo);
```

## 🔍 Log Analysis

### Application Logs
```bash
# Check for errors in application logs
grep -i error logs/app.log

# Monitor real-time logs
tail -f logs/app.log
```

### MCP Operation Logs
```bash
# View recent MCP operations
node mcp-servers/enhanced-file-utilities.js audit 20

# Check for failed operations
node -e "
const { EnhancedFileMCP } = require('./mcp-servers/enhanced-file-utilities');
const fileMCP = new EnhancedFileMCP();
const failed = fileMCP.getAuditTrail(100).filter(op => !op.success);
console.log('Failed operations:', failed);
"
```

### Workflow Logs
```bash
# Check GitHub Actions logs locally
gh run list --limit 5
gh run view [run-id] --log
```

## 📞 Getting Additional Help

### Generate Support Information
```bash
# Create comprehensive diagnostic report
cat > support-info.txt << EOF
# EchoTune AI Support Information
Generated: $(date)

## System Information
Node Version: $(node --version)
NPM Version: $(npm --version)
OS: $(uname -a)

## Application Status
$(npm run health-check 2>&1)

## MCP Status
$(npm run mcp-health 2>&1)

## Recent Errors
$(npm test 2>&1 | tail -20)

## Package Info
$(cat package.json | jq '{name, version, dependencies: (.dependencies | keys | length), scripts: (.scripts | keys | length)}')
EOF

echo "Support information saved to support-info.txt"
```

### Performance Report
```bash
# Generate performance report
node mcp-servers/mcp-integration-tester.js > performance-report.txt 2>&1
echo "Performance report saved to performance-report.txt"
```

### Security Audit
```bash
# Run security audit
npm audit --audit-level moderate > security-audit.txt 2>&1
node mcp-servers/comprehensive-validator.js system | jq '.results.security' > security-report.json
echo "Security reports generated"
```

## ⚡ Quick Fixes

### Reset to Clean State
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Reset MCP servers
npm run mcp-install

# Clear caches
npm cache clean --force
npx jest --clearCache
```

### Emergency Recovery
```bash
# Restore from backup
git stash push -m "emergency-backup"
git reset --hard HEAD~1

# Or restore specific files
git checkout HEAD -- package.json
git checkout HEAD -- .github/workflows/
```

### Minimal Working Configuration
```bash
# Set minimal environment
export NODE_ENV=development
export DEFAULT_LLM_PROVIDER=mock
export LOG_LEVEL=INFO

# Test basic functionality
npm start &
sleep 5
curl -f http://localhost:3000/health
kill %1
```

---

For additional support, please check:
- [GitHub Issues](https://github.com/dzp5103/Spotify-echo/issues)
- [Project Documentation](./README.md)
- [MCP Integration Guide](./MCP_INTEGRATION_SUMMARY.md)