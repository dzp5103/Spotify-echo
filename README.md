> **📋 Last Updated**: August 06, 2025 | **📦 Version**: 2.1.0

> **📋 Last Updated**: January 2025 | **📦 Version**: 2.1.0

# 🎵 EchoTune AI - Next-Generation Music Discovery Platform

[![Deploy to DigitalOcean](https://img.shields.io/badge/Deploy%20to%20DigitalOcean-0080FF?style=for-the-badge&logo=digitalocean&logoColor=white)](https://cloud.digitalocean.com/apps/new?repo=https://github.com/dzp5103/Spotify-echo/tree/main&refcode=echotuneai)
[![Docker](https://img.shields.io/badge/Deploy%20with%20Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](DOCKER_ENHANCED_GUIDE.md)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)](LICENSE)

> **AI-powered music recommendation system with conversational interface, Spotify integration, and advanced ML algorithms.**

## ✨ Key Features

- 🤖 **AI Music Assistant** - Natural language music discovery with multiple LLM providers
- 🎵 **Spotify Integration** - Seamless playlist creation and music streaming
- 📊 **Analytics Dashboard** - Deep insights into listening patterns and preferences  
- 🔍 **Smart Recommendations** - ML-powered personalized suggestions using collaborative filtering
- 🎯 **Demo Mode** - Full functionality without API keys for instant testing
- 🔊 **Voice Interface** - Voice commands for hands-free music discovery
- 📱 **Mobile Responsive** - Optimized experience across all devices

## 🚀 Quick Start

**Get running in under 5 minutes** - Choose your preferred method:

| Method | Time | Best For |
|--------|------|----------|
| [**DigitalOcean**](#-digitalocean-deployment) | 2-3 min | Production with auto-scaling |
| [**Docker**](#-docker-deployment) | 3-5 min | Any server with containerization |
| [**Local Dev**](#-local-development) | 2 min | Testing and development |

### ⚡ DigitalOcean Deployment

**Automated GitHub Actions Deployment with Container Registry:**

1. **Fork this repository** to your GitHub account
2. **Set up DigitalOcean secrets** in your repository:
   ```bash
   # Required GitHub Secrets:
   DIGITALOCEAN_ACCESS_TOKEN=dop_v1_...
   DO_REGISTRY_TOKEN=dop_v1_...
   SPOTIFY_CLIENT_ID=your_spotify_client_id
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   SESSION_SECRET=your_secure_session_secret
   JWT_SECRET=your_secure_jwt_secret
   ```
3. **Push to main branch** or trigger the "DigitalOcean Production Deployment" workflow manually
4. **Monitor deployment** in GitHub Actions - typically completes in 5-10 minutes

**One-Click Basic Deploy (Alternative):**
[![Deploy to DigitalOcean](https://www.deploytodo.com/do-btn-blue.svg)](https://cloud.digitalocean.com/apps/new?repo=https://github.com/dzp5103/Spotify-echo/tree/main&refcode=echotuneai)

📖 **[Complete DigitalOcean Setup Guide](DEPLOYMENT.md)**

### 🐳 Docker Deployment

**Ultra-Simple One-Command Deployment:**
```bash
# One-click deployment (includes Docker setup for Ubuntu 22.04)
curl -sSL https://raw.githubusercontent.com/dzp5103/Spotify-echo/main/scripts/simple-deploy.sh | bash
```

**Manual Docker Deployment:**
```bash
git clone https://github.com/dzp5103/Spotify-echo.git
cd Spotify-echo
docker-compose up -d
# Open http://localhost
```

**Ubuntu 22.04 with Docker Setup:**
```bash
# Complete setup including Docker installation (following DigitalOcean tutorial)
curl -sSL https://raw.githubusercontent.com/dzp5103/Spotify-echo/main/scripts/docker/docker-ubuntu-setup.sh | bash
```

**🎬 [View Deployment Demo](scripts/deployment/deployment-demo.sh)** - See the entire process in action

📖 **[Enhanced Docker Guide](DOCKER_ENHANCED_GUIDE.md)** - Comprehensive Docker deployment guide

#### 🐳 Docker Hub Credentials Setup

**For pushing to Docker Hub Container Registry:**

1. **Create Docker Hub Access Token:**
   ```bash
   # Go to https://hub.docker.com/settings/security
   # Create new access token with Read/Write permissions
   ```

2. **Set up credentials in environment:**
   ```bash
   # For local development
   export DOCKER_HUB_USERNAME=your_username
   export DOCKER_HUB_TOKEN=your_access_token
   
   # For GitHub Actions (add these as repository secrets)
   DOCKER_HUB_USERNAME=your_username
   DOCKER_HUB_TOKEN=your_access_token
   ```

3. **Login and push:**
   ```bash
   # Manual login
   echo "$DOCKER_HUB_TOKEN" | docker login -u "$DOCKER_HUB_USERNAME" --password-stdin
   
   # Build and push
   docker build -t your_username/echotune-ai:latest .
   docker push your_username/echotune-ai:latest
   ```

**Important Security Notes:**
- ✅ **Never commit Docker Hub credentials to code**
- ✅ **Use GitHub Secrets or environment variables**  
- ✅ **Use access tokens instead of passwords**
- ✅ **Limit token permissions to only what's needed**

#### 🚨 Docker Troubleshooting

**Common Docker Build Issues:**

1. **Build fails with permission errors:**
   ```bash
   # Fix: Ensure Docker daemon is running and user has permissions
   sudo systemctl start docker
   sudo usermod -aG docker $USER
   # Log out and back in
   ```

2. **Health check failures (503 errors):**
   ```bash
   # Check container logs
   docker logs container_name
   
   # Test health endpoint manually
   docker exec -it container_name curl http://localhost:3000/health
   
   # Verify port binding
   docker ps  # Should show 0.0.0.0:3000->3000/tcp
   ```

3. **Container won't start:**
   ```bash
   # Check environment variables
   docker run --rm echotune-ai env
   
   # Check resource limits
   docker stats
   
   # Run in interactive mode for debugging
   docker run -it --rm echotune-ai /bin/sh
   ```

**Ubuntu Server Setup Issues:**

1. **Docker installation fails:**
   ```bash
   # Follow official Docker installation for Ubuntu 22.04:
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo systemctl enable docker
   sudo systemctl start docker
   ```

2. **Firewall blocking connections:**
   ```bash
   # Allow Docker ports (adjust as needed)
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw allow 3000/tcp  # For development
   ```

3. **SSL certificate issues:**
   ```bash
   # Verify domain points to server
   nslookup yourdomain.com
   
   # Check port 80 is accessible for Let's Encrypt
   sudo netstat -tlnp | grep :80
   ```

### 💻 Local Development
```bash
git clone https://github.com/dzp5103/Spotify-echo.git
cd Spotify-echo
npm install && npm start
# Open http://localhost:3000
```

### 🛠️ Management Commands

After deployment, use these helpful commands:
```bash
# Service management
echotune-start          # Start all services
echotune-stop           # Stop all services  
echotune-restart        # Restart all services
echotune-logs           # View service logs
echotune-health         # Check application health
echotune-monitor        # Real-time monitoring

# Docker management
npm run docker:optimize # Optimize Docker resources
npm run docker:monitor  # Advanced monitoring dashboard
npm run docker:check    # System health check
```

## 🏗️ Architecture

### Technology Stack
- **Backend**: Node.js, Express.js, Socket.io for real-time features
- **Frontend**: React, Vite for modern web experience
- **Database**: MongoDB (primary), SQLite (fallback), Supabase support
- **AI/ML**: OpenAI GPT, Google Gemini, custom recommendation algorithms
- **Infrastructure**: Docker, nginx, SSL automation, health monitoring
- **Deployment**: DigitalOcean App Platform, Docker Compose, Ubuntu

### Project Structure
```
Spotify-echo/
├── src/                    # Source code
│   ├── frontend/          # React components and UI
│   ├── chat/              # AI chat system
│   ├── spotify/           # Spotify API integration
│   └── utils/             # Utilities and helpers
├── scripts/               # Python ML and automation scripts
├── tests/                 # Comprehensive test suites
├── docs/                  # Documentation
│   ├── deployment/        # Deployment guides
│   ├── api/               # API documentation
│   └── guides/            # User and developer guides
├── mcp-server/            # Model Context Protocol server
└── docker-compose.yml     # Container orchestration
```

## 🤖 AI & Machine Learning Features

### Recommendation Engine
- **🧠 Collaborative Filtering** - Advanced user behavior analysis
- **🎵 Content-Based Filtering** - Audio feature matching with Spotify's analysis
- **🔮 Deep Learning** - Neural network-based recommendation models
- **📈 Real-time Learning** - Adaptive preferences with continuous improvement

### Conversational AI
- **💬 Natural Language Processing** - Understand music requests in plain English
- **🎯 Mood Detection** - Context-aware recommendations based on listening patterns
- **🔄 Multi-Provider Support** - OpenAI, Google Gemini, and mock providers
- **📊 Analytics Integration** - Learn from user interactions and feedback

## 🚀 Production Deployment

### DigitalOcean GitHub Actions Workflow

EchoTune AI features a comprehensive automated deployment system with:

- **🐳 Multi-Service Container Build** - Automated Docker builds for app, nginx, and MCP server
- **📦 Container Registry Integration** - DigitalOcean Container Registry with automatic pushes
- **🔄 App Platform Deployment** - Seamless deployment to DigitalOcean App Platform
- **🛡️ Security Scanning** - Automated vulnerability scanning with Trivy
- **📊 Health Monitoring** - Comprehensive health checks and rollback capabilities
- **⚡ Auto-Scaling** - Production-ready scaling configuration

**Quick Setup:**
1. Fork repository and configure GitHub secrets
2. Push to main branch to trigger automatic deployment
3. Monitor deployment progress in GitHub Actions
4. Access your deployed application at your custom domain

### Available Scripts
```bash
npm run build      # Build for production
npm run test       # Run comprehensive test suite
npm run lint       # ESLint code quality checks
npm run format     # Prettier code formatting
npm run health-check # Application health verification

# Deployment commands
npm run deploy:digitalocean  # Deploy to DigitalOcean
npm run deploy:doctl        # Deploy using doctl CLI
npm run deploy:one-click    # One-click deployment wizard
```

### Security & Performance Features
- **🔐 OAuth 2.0** - Secure Spotify authentication
- **⚡ Rate Limiting** - DDoS protection and API abuse prevention
- **🛡️ Input Validation** - Comprehensive security headers and validation
- **🔒 SSL/TLS** - Automatic HTTPS with Let's Encrypt
- **📊 Health Monitoring** - Real-time system health checks and metrics

## 📚 Documentation

| Guide | Description |
|-------|-------------|
| [**DigitalOcean Deployment**](DEPLOYMENT.md) | Complete automated deployment guide with GitHub Actions |
| [**Quick Start Guide**](docs/QUICK_START.md) | Get running in under 5 minutes |
| [**Enhanced Docker Guide**](DOCKER_ENHANCED_GUIDE.md) | Comprehensive Docker deployment guide |
| [**Ubuntu Deployment**](docs/deployment/ubuntu-deployment.md) | Complete server setup with SSL |
| [**API Documentation**](docs/api/README.md) | Backend API reference |
| [**Development Guide**](CODING_AGENT_GUIDE.md) | Setup for contributors |
| [**Database Architecture**](DATABASE_ARCHITECTURE_GUIDE.md) | Data structure and schema |

### 🔧 Workflow Configuration

#### GitHub Secrets Required
```bash
# DigitalOcean Configuration
DIGITALOCEAN_ACCESS_TOKEN    # DigitalOcean API token
DO_REGISTRY_TOKEN           # Container Registry token
DIGITALOCEAN_APP_ID         # App Platform app ID (optional)

# Spotify API
SPOTIFY_CLIENT_ID           # Your Spotify app client ID
SPOTIFY_CLIENT_SECRET       # Your Spotify app client secret

# Security
SESSION_SECRET              # Secure session secret
JWT_SECRET                  # Secure JWT secret
MONGODB_URI                 # Database connection string

# AI/LLM (Optional)
GEMINI_API_KEY             # Google Gemini API key
OPENAI_API_KEY             # OpenAI API key
```

#### Workflow Features
- **🚀 Automatic Deployment** - Triggers on push to main branch
- **🧪 Comprehensive Testing** - Unit, integration, and security tests
- **🐳 Multi-Container Build** - App, nginx, and MCP server images
- **🔍 Security Scanning** - Vulnerability assessment with Trivy
- **📊 Health Monitoring** - Automated health checks and rollback
- **🔄 Reusable Templates** - Modular workflows for other services

#### Troubleshooting Common Issues

**Deployment Failures:**
- Verify all required secrets are configured
- Check GitHub Actions logs for specific error messages
- Ensure DigitalOcean account has sufficient resources
- Validate Spotify app configuration and redirect URIs

**Container Registry Issues:**
- Regenerate DO_REGISTRY_TOKEN if authentication fails
- Verify registry namespace matches workflow configuration
- Check container registry usage limits

**Application Issues:**
- Monitor application logs via `doctl apps logs <app-id>`
- Verify environment variables in App Platform dashboard
- Test health endpoint: `curl https://your-domain.com/health`

📖 **[Complete Troubleshooting Guide](DEPLOYMENT.md#--monitoring-and-troubleshooting)**

## 🔧 Development

### Prerequisites
- Node.js 20+ and npm 10+
- Python 3.8+ (for ML features)
- Docker and Docker Compose (optional)
- Spotify Developer Account (optional for demo)

### Setup
```bash
# Clone and install
git clone https://github.com/dzp5103/Spotify-echo.git
cd Spotify-echo
npm install
pip install -r requirements.txt

# Configure environment
cp .env.production.example .env
# Edit .env with your API keys

# Development server
npm run dev        # Frontend development with hot reload
npm start          # Production server
npm test           # Run test suite
npm run lint       # Code linting and formatting
```

### Available Scripts
```bash
npm run build      # Build for production
npm run test       # Run comprehensive test suite
npm run lint       # ESLint code quality checks
npm run format     # Prettier code formatting
npm run health-check # Application health verification
```

## 📊 Project Status

### ✅ Completed Features
- Core music recommendation engine with ML algorithms
- Complete Spotify OAuth and API integration
- Multi-provider AI chat interface (OpenAI, Gemini, Mock)
- Comprehensive health monitoring with <50ms response times
- Production-ready Docker containerization
- Automated Ubuntu server deployment with SSL
- Security features: rate limiting, input validation, HTTPS
- Comprehensive testing infrastructure

### 🚧 In Development
- Mobile Progressive Web App features
- Advanced deep learning recommendation models
- Enhanced analytics dashboard
- Real-time collaborative playlists

## 🗺️ Development Roadmap

### Phase 1: Core Foundation ✅ COMPLETED
**Status: 100% Complete**

- [x] **Basic Music Recommendation Engine**
  - Collaborative filtering algorithms
  - Content-based filtering with Spotify audio features
  - User preference learning system
  - Basic recommendation scoring

- [x] **Spotify Integration**
  - OAuth 2.0 authentication flow
  - Complete Web API integration
  - Playlist creation and management
  - User listening history import
  - Real-time playback control

- [x] **AI Chat Interface**
  - Multiple LLM provider support (OpenAI, Gemini, Mock)
  - Natural language music discovery
  - Conversation context management
  - Mood and activity detection

- [x] **Production Infrastructure**
  - Docker containerization
  - Health monitoring system
  - Database architecture (MongoDB + SQLite fallback)
  - Security and authentication

### Phase 2: Enhanced Intelligence 🚧 IN PROGRESS
**Status: 75% Complete**

- [x] **Advanced ML Models**
  - Deep neural networks for recommendations
  - Audio feature analysis and clustering
  - User behavior pattern recognition
  - Multi-objective optimization (diversity, novelty, relevance)

- [x] **Improved AI Conversations**
  - Context-aware responses
  - Music knowledge base integration
  - Emotional state detection
  - Personalized conversation styles

- [ ] **Real-time Analytics**
  - Live listening behavior tracking
  - Performance metrics dashboard
  - A/B testing framework for recommendations
  - User engagement analytics

- [ ] **Mobile Progressive Web App**
  - Responsive design optimization
  - Offline functionality
  - Push notifications
  - Mobile-specific UI components

### Phase 3: Social & Collaborative Features 📋 PLANNED
**Status: 0% Complete • Target: Q2 2025**

- [ ] **Social Music Discovery**
  - User profiles and following system
  - Social recommendation engine
  - Music taste compatibility analysis
  - Friend activity feeds

- [ ] **Collaborative Playlists**
  - Real-time collaborative playlist editing
  - Voting system for track additions
  - Group listening sessions
  - Playlist sharing and remixing

- [ ] **Community Features**
  - Music discussion forums
  - Genre-based communities
  - Expert curator system
  - User-generated content moderation

- [ ] **Advanced Sharing**
  - Cross-platform playlist export
  - Social media integration
  - Music event recommendations
  - Concert and festival discovery

### Phase 4: Enterprise & Scale 📋 PLANNED
**Status: 0% Complete • Target: Q3 2025**

- [ ] **Enterprise Features**
  - Multi-tenant architecture
  - Admin dashboard and analytics
  - White-label solutions
  - Custom branding options

- [ ] **Advanced Analytics**
  - Music industry insights
  - Trend prediction algorithms
  - Market analysis tools
  - Revenue optimization

- [ ] **Platform Integrations**
  - Apple Music integration
  - YouTube Music support
  - SoundCloud connectivity
  - Podcast recommendations

- [ ] **Scalability Enhancements**
  - Microservices architecture
  - Auto-scaling infrastructure
  - Global CDN deployment
  - Performance optimization

### Phase 5: Innovation & Research 💡 VISION
**Status: 0% Complete • Target: Q4 2025**

- [ ] **Cutting-Edge AI**
  - Large language model fine-tuning
  - Multimodal AI (audio, text, visual)
  - Reinforcement learning for personalization
  - Federated learning for privacy

- [ ] **Emerging Technologies**
  - Blockchain integration for artist royalties
  - NFT-based music collectibles
  - VR/AR music experiences
  - Voice-only interface optimization

- [ ] **Research Initiatives**
  - Music therapy applications
  - Accessibility improvements
  - Cross-cultural music discovery
  - AI ethics in music recommendations

- [ ] **Open Source Ecosystem**
  - Plugin architecture
  - Community contributions
  - Research partnerships
  - Academic collaborations

## 🎯 Implementation Priorities

### Immediate Goals (Next 30 Days)
1. **Complete Phase 2 Analytics** - Real-time user behavior tracking
2. **Mobile PWA Launch** - Responsive design and offline capabilities
3. **Performance Optimization** - Sub-200ms response times
4. **Documentation Enhancement** - Complete API documentation

### Short-term Goals (Next 90 Days)
1. **Social Features Beta** - Limited social recommendation testing
2. **Advanced ML Models** - Deploy deep learning recommendations
3. **Multi-platform Support** - Apple Music integration POC
4. **Enhanced Security** - Advanced authentication and data protection

### Long-term Vision (Next 12 Months)
1. **Enterprise Product** - B2B offering for music industry
2. **Global Expansion** - Multi-language and regional support
3. **Research Partnerships** - Academic and industry collaborations
4. **Open Source Community** - Public plugin ecosystem

## 💡 Feature Suggestions & Contributions

We welcome community input on our roadmap! Here are ways to contribute:

### For Users
- **Feature Requests**: Share ideas in [GitHub Discussions](https://github.com/dzp5103/Spotify-echo/discussions)
- **Bug Reports**: Report issues in [GitHub Issues](https://github.com/dzp5103/Spotify-echo/issues)
- **User Testing**: Join our beta testing program
- **Feedback**: Rate and review features in the app

### For Developers
- **Code Contributions**: See [Development Guide](CODING_AGENT_GUIDE.md)
- **Plugin Development**: Build custom recommendation algorithms
- **Documentation**: Improve guides and tutorials
- **Testing**: Contribute to automated test suites

### For Researchers
- **ML Model Contributions**: Share new recommendation algorithms
- **Dataset Collaboration**: Contribute to anonymized research datasets
- **Academic Partnerships**: Joint research opportunities
- **Publication Collaboration**: Co-author research papers

### Priority Feature Voting
Vote on upcoming features by participating in our quarterly roadmap surveys:
- **Q1 2025 Survey**: [Link to be announced]
- **Community Priorities**: Updated monthly in discussions

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Start for Contributors
```bash
# Fork and clone your fork
git clone https://github.com/YOUR_USERNAME/Spotify-echo.git
cd Spotify-echo

# Setup development environment
npm install
cp .env.production.example .env
npm run dev

# Run tests before submitting
npm test
npm run lint

# Create feature branch and submit PR
git checkout -b feature/amazing-feature
```

## 🆘 Troubleshooting

### Common Issues
- **🔑 Spotify Authentication**: Verify API credentials and redirect URI
- **🐳 Docker Issues**: Check logs with `docker-compose logs -f`
- **🔧 Performance**: Monitor with `/health` endpoint and system resources
- **🌐 SSL Problems**: Verify certificates with `certbot certificates`

### Getting Help
- 📖 [Documentation](docs/) - Comprehensive guides
- 🐛 [Report Issues](https://github.com/dzp5103/Spotify-echo/issues) - Bug reports
- 💬 [Discussions](https://github.com/dzp5103/Spotify-echo/discussions) - Community support

## ❓ Frequently Asked Questions (FAQ)

### 🚀 Deployment & Setup

**Q: Why is my DigitalOcean deployment failing with 503 health check errors?**
A: Common causes and solutions:
```bash
# 1. Check application logs
doctl apps logs <app-id> --component web

# 2. Verify environment variables are set
doctl apps spec get <app-id>

# 3. Test health endpoint manually
curl https://your-domain.com/health

# 4. Common fixes:
# - Ensure PORT=3000 is set in environment
# - Verify DOMAIN matches your actual domain
# - Check SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are set
```

**Q: Docker build fails with "permission denied" errors?**
A: Fix Docker permissions:
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Restart Docker service
sudo systemctl restart docker

# Log out and back in, then test
docker --version
```

**Q: Health check returns warnings - is this normal?**
A: Yes! The application is designed to work without optional services:
- ✅ **200 status** = Application healthy (even with warnings)
- ❌ **503 status** = Critical errors that prevent operation
- ⚠️ **Warnings** for missing optional services (Redis, SSL, etc.) are normal

### 🐳 Docker & Container Issues

**Q: Container won't start on Ubuntu server?**
A: Check these common issues:
```bash
# 1. Verify Docker installation
docker --version
sudo systemctl status docker

# 2. Check if ports are already in use
sudo netstat -tlnp | grep :3000
sudo netstat -tlnp | grep :80

# 3. Verify Docker Compose syntax
docker-compose config

# 4. Check available resources
df -h  # Disk space
free -h  # Memory
```

**Q: How do I push to Docker Hub registry?**
A: Set up Docker Hub credentials securely:
```bash
# 1. Create access token at https://hub.docker.com/settings/security
# 2. Store credentials safely (never in code!)
export DOCKER_HUB_USERNAME=your_username  
export DOCKER_HUB_TOKEN=your_access_token

# 3. Login and push
echo "$DOCKER_HUB_TOKEN" | docker login -u "$DOCKER_HUB_USERNAME" --password-stdin
docker build -t $DOCKER_HUB_USERNAME/echotune-ai:latest .
docker push $DOCKER_HUB_USERNAME/echotune-ai:latest
```

### 🔑 API Keys & Authentication  

**Q: Do I need Spotify API keys to try the application?**
A: No! The application works in demo mode without any API keys:
- ✅ **Mock AI provider** works without API keys
- ✅ **SQLite database** works without external database
- ✅ **Basic chat interface** works for testing
- 🎵 **Spotify features** require API keys for full functionality

**Q: Where do I get Spotify API credentials?**
A: Follow these steps:
```bash
# 1. Go to https://developer.spotify.com/dashboard
# 2. Create new app with these settings:
#    - App name: Your App Name
#    - App description: Music recommendation app
#    - Redirect URI: https://your-domain.com/auth/callback
#    - API/SDK: Web API
# 3. Copy Client ID and Client Secret to your .env file
```

**Q: How do I secure API keys in production?**
A: Use these best practices:
- ✅ **Environment variables** - never hardcode in source code
- ✅ **GitHub Secrets** - for GitHub Actions deployments  
- ✅ **DigitalOcean App Secrets** - for App Platform deployments
- ✅ **Docker secrets** - for container deployments
- ❌ **Never commit .env files** with real credentials

### 🏥 Health Checks & Monitoring

**Q: What does each health check status mean?**
A: Health check status guide:
- 🟢 **healthy** - Service working perfectly
- 🟡 **warning** - Service has issues but app still functional  
- 🔴 **unhealthy** - Critical service failure
- ⚪ **not_configured** - Optional service not set up (normal)

**Q: Which services are required vs optional?**
A: Service requirements:
```bash
# ✅ REQUIRED (app won't start without these)
- Application server (Node.js)
- Basic memory/CPU resources

# ⚠️ OPTIONAL (warnings OK, app still works)  
- MongoDB database (SQLite fallback available)
- Redis cache (in-memory fallback available)
- SSL certificates (HTTP works for development)
- Docker (can run directly with Node.js)
- External network connectivity
- AI API keys (mock provider available)
```

### 🌐 Network & SSL Issues

**Q: SSL certificate errors on Ubuntu server?**
A: Debug SSL setup:
```bash
# 1. Verify domain DNS points to server
nslookup your-domain.com

# 2. Check if port 80 is accessible (required for Let's Encrypt)
sudo ufw allow 80/tcp
sudo netstat -tlnp | grep :80

# 3. Test certificate generation manually
sudo certbot certonly --webroot -w /var/www/html -d your-domain.com

# 4. Check certificate status
sudo certbot certificates
```

**Q: Can't access application from outside the server?**
A: Check firewall and networking:
```bash
# 1. Check if application is listening on all interfaces
sudo netstat -tlnp | grep :3000
# Should show 0.0.0.0:3000, not 127.0.0.1:3000

# 2. Check firewall rules
sudo ufw status
sudo ufw allow 3000/tcp  # For development
sudo ufw allow 80/tcp    # For HTTP
sudo ufw allow 443/tcp   # For HTTPS

# 3. For cloud servers, check security groups/firewall rules in provider dashboard
```

### 🔧 Development & Contributing

**Q: How do I set up the development environment?**
A: Quick development setup:
```bash
# 1. Clone and install dependencies
git clone https://github.com/dzp5103/Spotify-echo.git
cd Spotify-echo
npm install

# 2. Set up environment (minimal for development)
cp .env.example .env
# Edit .env with:
# NODE_ENV=development
# PORT=3000

# 3. Start development server
npm start
# App available at http://localhost:3000
```

**Q: How do I run tests?**
A: Run the test suite:
```bash
# Run all tests
npm test

# Run specific test categories  
npm run test:unit
npm run test:integration
npm run test:e2e

# Run tests with coverage
npm run test -- --coverage
```

**Q: How do I report bugs or request features?**
A: Use GitHub for issue tracking:
- 🐛 **Bug reports**: https://github.com/dzp5103/Spotify-echo/issues
- 💡 **Feature requests**: https://github.com/dzp5103/Spotify-echo/discussions
- 📖 **Documentation issues**: Include "docs" label
- 🚀 **Enhancement proposals**: Use discussion for feedback first

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Third-Party Services
- **Spotify Web API**: Subject to [Spotify Developer Terms](https://developer.spotify.com/terms)
- **OpenAI API**: Subject to [OpenAI Usage Policies](https://openai.com/policies/usage-policies)
- **Google Gemini**: Subject to [Google AI Terms](https://ai.google.dev/terms)

## 🙏 Acknowledgments

- **[Spotify](https://developer.spotify.com/documentation/web-api/)** - Music data and streaming
- **[OpenAI](https://openai.com/)** & **[Google Gemini](https://ai.google.dev/)** - AI capabilities
- **[Node.js](https://nodejs.org/)** & **[React](https://reactjs.org/)** - Application framework
- **[Docker](https://www.docker.com/)** & **[DigitalOcean](https://www.digitalocean.com/)** - Deployment infrastructure

## 🌟 Support the Project

If you find EchoTune AI useful:
- ⭐ **Star this repository** on GitHub
- 🐛 **Report bugs** and suggest features
- 📢 **Share with friends** and on social media
- 💝 **Contribute code** or documentation

---

**🎵 Ready to discover your next favorite song?**

[![Deploy to DigitalOcean](https://www.deploytodo.com/do-btn-blue.svg)](https://cloud.digitalocean.com/apps/new?repo=https://github.com/dzp5103/Spotify-echo/tree/main&refcode=echotuneai)

[![GitHub stars](https://img.shields.io/github/stars/dzp5103/Spotify-echo.svg?style=social&label=Star)](https://github.com/dzp5103/Spotify-echo/stargazers)

---

*EchoTune AI - Transforming music discovery through artificial intelligence* • **Version 2.1.0**