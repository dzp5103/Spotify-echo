#!/bin/bash

# EchoTune AI - Ultra-Simplified Deployment Demo
# One command to rule them all - from zero to running application

set -euo pipefail

# Colors for better UX
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Animation function
show_spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='|/-\'
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

# Fancy logging
log_header() {
    echo
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC} $1"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo
}

log_step() {
    echo -e "${BLUE}🚀 $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Demo configuration
DEMO_MODE="${1:-full}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Main demo function
main() {
    log_header "🎵 EchoTune AI - Ultra-Simplified Docker Deployment Demo"
    
    echo -e "${PURPLE}Welcome to the EchoTune AI deployment demonstration!${NC}"
    echo -e "${PURPLE}This script will show you how easy it is to deploy our AI-powered music recommendation system.${NC}"
    echo
    echo -e "${CYAN}What we're going to deploy:${NC}"
    echo "• 🎵 AI-powered music recommendation engine"
    echo "• 🎧 Spotify integration with conversational AI"
    echo "• 🐳 Containerized with Docker for easy deployment"
    echo "• 🔧 Production-ready with monitoring and optimization"
    echo "• 🌐 Based on DigitalOcean Ubuntu 22.04 best practices"
    echo
    
    case "$DEMO_MODE" in
        "quick")
            demo_quick_deployment
            ;;
        "ubuntu")
            demo_ubuntu_setup
            ;;
        "management")
            demo_docker_management
            ;;
        "full"|"")
            demo_full_deployment
            ;;
        *)
            show_help
            ;;
    esac
}

# Quick deployment demo
demo_quick_deployment() {
    log_step "Demonstrating One-Click Deployment"
    
    echo -e "${YELLOW}Option 1: Ultra-Quick Deployment (for existing Docker users)${NC}"
    echo
    echo -e "${CYAN}Command:${NC}"
    echo "curl -sSL https://raw.githubusercontent.com/dzp5103/Spotify-echo/main/scripts/simple-deploy.sh | bash"
    echo
    echo -e "${GREEN}What this does:${NC}"
    echo "• ✅ Checks if Docker is installed (installs if missing)"
    echo "• ✅ Clones EchoTune AI repository"
    echo "• ✅ Configures environment automatically"
    echo "• ✅ Builds optimized Docker containers"
    echo "• ✅ Starts all services (app, database, proxy)"
    echo "• ✅ Sets up helpful management aliases"
    echo "• ✅ Performs health checks"
    echo
    echo -e "${BLUE}Result: Application running at http://localhost in under 5 minutes!${NC}"
    
    log_info "Demo: Simulating quick deployment process..."
    
    # Simulate the deployment steps
    echo
    echo -e "${CYAN}[1/8]${NC} Checking prerequisites..."
    sleep 1
    echo -e "${GREEN}✓${NC} Internet connection: OK"
    echo -e "${GREEN}✓${NC} System requirements: OK"
    
    echo -e "${CYAN}[2/8]${NC} Installing Docker (if needed)..."
    sleep 1
    echo -e "${GREEN}✓${NC} Docker already installed: 24.0.7"
    
    echo -e "${CYAN}[3/8]${NC} Setting up project directory..."
    sleep 1
    echo -e "${GREEN}✓${NC} Cloned to ~/echotune-ai"
    
    echo -e "${CYAN}[4/8]${NC} Configuring environment..."
    sleep 1
    echo -e "${GREEN}✓${NC} Environment configured with secure defaults"
    
    echo -e "${CYAN}[5/8]${NC} Creating optimized Docker configuration..."
    sleep 1
    echo -e "${GREEN}✓${NC} Multi-stage builds enabled"
    
    echo -e "${CYAN}[6/8]${NC} Installing helper tools..."
    sleep 1
    echo -e "${GREEN}✓${NC} Management aliases created"
    
    echo -e "${CYAN}[7/8]${NC} Building and starting services..."
    sleep 2
    echo -e "${GREEN}✓${NC} App container: Running"
    echo -e "${GREEN}✓${NC} Nginx proxy: Running"
    echo -e "${GREEN}✓${NC} MongoDB: Running"
    echo -e "${GREEN}✓${NC} Redis cache: Running"
    
    echo -e "${CYAN}[8/8]${NC} Verifying deployment..."
    sleep 1
    echo -e "${GREEN}✓${NC} Health check: PASSED"
    echo -e "${GREEN}✓${NC} Services: All running"
    
    log_success "🎉 Deployment completed successfully!"
    
    echo
    echo -e "${PURPLE}Next steps after deployment:${NC}"
    echo "1. Configure Spotify API credentials in .env file"
    echo "2. Access application at http://localhost"
    echo "3. Use management commands: echotune-start, echotune-logs, etc."
}

# Ubuntu setup demo
demo_ubuntu_setup() {
    log_step "Demonstrating Ubuntu 22.04 Docker Setup"
    
    echo -e "${YELLOW}Following DigitalOcean's Docker tutorial with EchoTune optimizations${NC}"
    echo -e "${BLUE}Tutorial: https://www.digitalocean.com/community/tutorials/how-to-install-and-use-docker-on-ubuntu-22-04${NC}"
    echo
    
    echo -e "${CYAN}Our enhanced setup script includes:${NC}"
    echo "• 🔧 Complete Docker & Docker Compose installation"
    echo "• 👤 Non-root user configuration"
    echo "• ⚡ Production optimizations (logging, storage driver)"
    echo "• 🎵 EchoTune-specific configurations"
    echo "• 🛠️ Helper tools (ctop, lazydocker, aliases)"
    echo "• 📊 Monitoring setup"
    echo
    
    echo -e "${GREEN}Command:${NC}"
    echo "./scripts/docker-ubuntu-setup.sh"
    echo
    
    log_info "Demo: Simulating Ubuntu Docker setup..."
    
    echo
    echo -e "${CYAN}Phase 1: System Update${NC}"
    sleep 1
    echo -e "${GREEN}✓${NC} Updated package lists"
    echo -e "${GREEN}✓${NC} Installed essential packages"
    
    echo -e "${CYAN}Phase 2: Docker Installation${NC}"
    sleep 1
    echo -e "${GREEN}✓${NC} Added Docker GPG key"
    echo -e "${GREEN}✓${NC} Added Docker repository"
    echo -e "${GREEN}✓${NC} Installed Docker Engine"
    echo -e "${GREEN}✓${NC} Started Docker service"
    
    echo -e "${CYAN}Phase 3: User Configuration${NC}"
    sleep 1
    echo -e "${GREEN}✓${NC} Added user to docker group"
    echo -e "${GREEN}✓${NC} Configured permissions"
    
    echo -e "${CYAN}Phase 4: Production Optimization${NC}"
    sleep 1
    echo -e "${GREEN}✓${NC} Configured daemon.json"
    echo -e "${GREEN}✓${NC} Enabled BuildKit"
    echo -e "${GREEN}✓${NC} Set up log rotation"
    
    echo -e "${CYAN}Phase 5: EchoTune Setup${NC}"
    sleep 1
    echo -e "${GREEN}✓${NC} Created project directories"
    echo -e "${GREEN}✓${NC} Set up Docker networks"
    echo -e "${GREEN}✓${NC} Pulled base images"
    
    echo -e "${CYAN}Phase 6: Helper Tools${NC}"
    sleep 1
    echo -e "${GREEN}✓${NC} Installed monitoring tools"
    echo -e "${GREEN}✓${NC} Created helpful aliases"
    echo -e "${GREEN}✓${NC} Set up quick deployment script"
    
    log_success "Ubuntu Docker setup completed!"
    
    echo
    echo -e "${PURPLE}Available tools after setup:${NC}"
    echo "• echotune-start/stop/restart - Service management"
    echo "• ctop - Container monitoring"
    echo "• lazydocker - Docker management UI"
    echo "• ~/echotune-quick-deploy.sh - One-click deployment"
}

# Docker management demo
demo_docker_management() {
    log_step "Demonstrating Advanced Docker Management"
    
    echo -e "${YELLOW}EchoTune AI includes advanced Docker management tools${NC}"
    echo
    
    echo -e "${CYAN}Management Script: ./scripts/docker-manager.sh${NC}"
    echo
    echo -e "${GREEN}Available Commands:${NC}"
    echo "• check      - System health check"
    echo "• analyze    - Performance analysis"
    echo "• optimize   - Full optimization (images, networks, volumes)"
    echo "• monitor    - Real-time monitoring dashboard"
    echo "• report     - Generate health report"
    echo "• backup     - Backup configurations"
    echo "• update     - Update Docker tools"
    echo
    
    log_info "Demo: Simulating management operations..."
    
    echo
    echo -e "${CYAN}🔍 System Check${NC}"
    sleep 1
    echo -e "${GREEN}✓${NC} Docker version: 24.0.7"
    echo -e "${GREEN}✓${NC} Docker Compose: 2.24.5"
    echo -e "${GREEN}✓${NC} User permissions: OK"
    echo -e "${GREEN}✓${NC} Available memory: 16GB"
    echo -e "${GREEN}✓${NC} Available disk: 50GB"
    
    echo -e "${CYAN}📊 Performance Analysis${NC}"
    sleep 1
    echo "Container Performance:"
    echo "┌─────────────────┬──────────┬──────────────┬──────────┐"
    echo "│ Container       │ CPU %    │ Memory       │ Status   │"
    echo "├─────────────────┼──────────┼──────────────┼──────────┤"
    echo "│ echotune-app    │ 15.2%    │ 256MB/2GB    │ Healthy  │"
    echo "│ echotune-nginx  │ 2.1%     │ 64MB/512MB   │ Healthy  │"
    echo "│ echotune-mongo  │ 8.7%     │ 512MB/1GB    │ Healthy  │"
    echo "│ echotune-redis  │ 1.3%     │ 32MB/256MB   │ Healthy  │"
    echo "└─────────────────┴──────────┴──────────────┴──────────┘"
    
    echo -e "${CYAN}🚀 Optimization${NC}"
    sleep 1
    echo -e "${GREEN}✓${NC} Removed 3 dangling images (saved 1.2GB)"
    echo -e "${GREEN}✓${NC} Cleaned 2 unused volumes (saved 500MB)"
    echo -e "${GREEN}✓${NC} Removed 1 unused network"
    echo -e "${GREEN}✓${NC} System optimization completed"
    
    echo -e "${CYAN}📈 Real-time Monitoring${NC}"
    sleep 1
    echo "• Live container stats updated every 5 seconds"
    echo "• Recent logs from all services"
    echo "• Resource usage trends"
    echo "• Press Ctrl+C to exit monitoring"
    
    echo -e "${CYAN}📋 Health Report${NC}"
    sleep 1
    echo -e "${GREEN}✓${NC} Generated comprehensive report: /tmp/docker-health-report.txt"
    echo "• System information and versions"
    echo "• Container status and resource usage"
    echo "• Storage and network analysis"
    echo "• Issue detection and recommendations"
    
    log_success "Docker management demonstration completed!"
}

# Full deployment demo
demo_full_deployment() {
    log_step "Complete EchoTune AI Deployment Demonstration"
    
    echo -e "${YELLOW}This demonstrates the complete workflow from Ubuntu setup to running application${NC}"
    echo
    
    # Ubuntu setup
    demo_ubuntu_setup
    
    echo
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
    echo
    
    # Quick deployment
    demo_quick_deployment
    
    echo
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
    echo
    
    # Management tools
    demo_docker_management
    
    echo
    log_header "🎉 Complete Deployment Process Summary"
    
    echo -e "${GREEN}What we've accomplished:${NC}"
    echo "• ✅ Optimized Docker installation on Ubuntu 22.04"
    echo "• ✅ One-command deployment of EchoTune AI"
    echo "• ✅ Production-ready containerized services"
    echo "• ✅ Advanced monitoring and management tools"
    echo "• ✅ Automated optimization and maintenance"
    echo
    
    echo -e "${PURPLE}Deployment methods available:${NC}"
    echo
    echo -e "${CYAN}Method 1: One-Click (Existing Docker)${NC}"
    echo "curl -sSL https://raw.githubusercontent.com/dzp5103/Spotify-echo/main/scripts/simple-deploy.sh | bash"
    echo
    echo -e "${CYAN}Method 2: Ubuntu Setup + Deploy${NC}"
    echo "./scripts/docker-ubuntu-setup.sh && ./scripts/simple-deploy.sh"
    echo
    echo -e "${CYAN}Method 3: NPM Commands${NC}"
    echo "npm run deploy:ubuntu        # Full Ubuntu setup + deployment"
    echo "npm run docker:setup         # Just Docker setup"
    echo "npm run docker:deploy        # Just deployment"
    echo
    echo -e "${CYAN}Method 4: Manual Control${NC}"
    echo "git clone https://github.com/dzp5103/Spotify-echo.git"
    echo "cd Spotify-echo"
    echo "cp .env.production.example .env  # Configure your settings"
    echo "docker-compose up -d"
    echo
    
    echo -e "${BLUE}Management commands:${NC}"
    echo "• echotune-start/stop/restart - Service control"
    echo "• echotune-logs - View logs"
    echo "• echotune-health - Health check"
    echo "• echotune-monitor - Live monitoring"
    echo "• ./scripts/docker-manager.sh - Advanced management"
    echo
    
    echo -e "${YELLOW}Key benefits of our Docker deployment:${NC}"
    echo "• 🚀 Deploy in under 5 minutes"
    echo "• 🔒 Production-ready security configuration"
    echo "• 📊 Built-in monitoring and optimization"
    echo "• 🛠️ Easy management with helpful commands"
    echo "• 🐳 Following Docker best practices"
    echo "• 🌐 Based on DigitalOcean's proven tutorial"
    echo "• ⚡ Optimized for performance and reliability"
    echo
    
    log_success "Ready to revolutionize music discovery with AI! 🎵"
}

# Show help
show_help() {
    echo "EchoTune AI Deployment Demonstration"
    echo
    echo "Usage: $0 [demo_type]"
    echo
    echo "Demo Types:"
    echo "  full        - Complete deployment demonstration (default)"
    echo "  quick       - One-click deployment demo"
    echo "  ubuntu      - Ubuntu 22.04 Docker setup demo"
    echo "  management  - Advanced Docker management demo"
    echo "  help        - Show this help message"
    echo
    echo "Examples:"
    echo "  $0           # Full demonstration"
    echo "  $0 quick     # Quick deployment only"
    echo "  $0 ubuntu    # Ubuntu setup only"
}

# Run the demo
main "$@"