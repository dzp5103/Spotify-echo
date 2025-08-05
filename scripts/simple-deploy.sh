#!/bin/bash

# Simplified One-Click Docker Deployment for EchoTune AI
# Combines installation, configuration, and deployment into a single script

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_URL="https://github.com/dzp5103/Spotify-echo.git"
INSTALL_DIR="$HOME/echotune-ai"
LOG_FILE="/tmp/echotune-deploy.log"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1" | tee -a "$LOG_FILE"
}

# Progress indicator
show_progress() {
    local current=$1
    local total=$2
    local step_name=$3
    local percent=$((current * 100 / total))
    
    echo -e "${CYAN}[$current/$total]${NC} ${step_name} (${percent}%)" | tee -a "$LOG_FILE"
}

# Function to check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."
    
    # Check OS
    if ! command -v lsb_release &> /dev/null; then
        sudo apt update && sudo apt install -y lsb-release
    fi
    
    local os_info=$(lsb_release -d | cut -f2)
    log_info "Detected OS: $os_info"
    
    # Check if running as root
    if [[ $EUID -eq 0 ]]; then
        log_error "Please run this script as a regular user with sudo privileges"
        exit 1
    fi
    
    # Check internet connectivity
    if ! ping -c 1 google.com &> /dev/null; then
        log_error "No internet connection detected"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Function to install Docker if not present
install_docker_if_needed() {
    show_progress 1 8 "Installing Docker"
    
    if command -v docker &> /dev/null; then
        log_info "Docker already installed: $(docker --version)"
        return 0
    fi
    
    log_info "Installing Docker..."
    
    # Update system
    sudo apt update
    sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release
    
    # Add Docker's official GPG key
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # Add repository
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Configure user
    sudo usermod -aG docker "$USER"
    sudo systemctl start docker
    sudo systemctl enable docker
    
    log_success "Docker installed successfully"
}

# Function to setup project directory
setup_project() {
    show_progress 2 8 "Setting up project directory"
    
    if [[ -d "$INSTALL_DIR" ]]; then
        log_warning "Project directory exists. Updating..."
        cd "$INSTALL_DIR"
        git pull origin main || log_warning "Git pull failed"
    else
        log_info "Cloning EchoTune AI repository..."
        git clone "$REPO_URL" "$INSTALL_DIR"
        cd "$INSTALL_DIR"
    fi
    
    log_success "Project setup completed"
}

# Function to configure environment
configure_environment() {
    show_progress 3 8 "Configuring environment"
    
    # Create .env file if it doesn't exist
    if [[ ! -f ".env" ]]; then
        if [[ -f ".env.production.example" ]]; then
            cp .env.production.example .env
            log_info "Created .env from example template"
        else
            log_warning "No .env.production.example found, creating basic .env"
            cat > .env << EOF
# EchoTune AI Environment Configuration
NODE_ENV=production
PORT=3000
DOMAIN=localhost

# Database
MONGODB_URI=mongodb://mongodb:27017/echotune
REDIS_URL=redis://redis:6379

# Spotify API (REQUIRED - Get from https://developer.spotify.com/)
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
SPOTIFY_REDIRECT_URI=http://localhost:3000/auth/callback

# Security
SESSION_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)

# MongoDB
MONGODB_ROOT_USER=admin
MONGODB_ROOT_PASSWORD=$(openssl rand -base64 16)
MONGODB_DATABASE=echotune

# Redis
REDIS_PASSWORD=$(openssl rand -base64 16)
EOF
        fi
    fi
    
    log_success "Environment configured"
    log_warning "Please edit .env file with your Spotify API credentials before starting services"
}

# Function to create optimized Docker configurations
create_optimized_docker_config() {
    show_progress 4 8 "Creating optimized Docker configuration"
    
    # Create optimized docker-compose override for development
    cat > docker-compose.override.yml << 'EOF'
version: '3.8'

services:
  app:
    build:
      target: development
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    command: npm run dev
    
  nginx:
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - app
      
  mongodb:
    ports:
      - "27017:27017"
    
  redis:
    ports:
      - "6379:6379"
EOF
    
    # Create development Dockerfile target
    if ! grep -q "development" Dockerfile; then
        # Add development stage to Dockerfile
        sed -i '/FROM node:20-alpine AS production/i\
# Development stage\
FROM node:20-alpine AS development\
\
ENV NODE_ENV=development\
WORKDIR /app\
\
# Install dependencies\
COPY package*.json ./\
RUN npm ci --include=dev\
\
# Copy source\
COPY . .\
\
EXPOSE 3000\
CMD ["npm", "run", "dev"]\
' Dockerfile
    fi
    
    log_success "Docker configuration optimized for development"
}

# Function to install helper tools
install_helper_tools() {
    show_progress 5 8 "Installing helper tools"
    
    # Install Node.js if not present
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt install -y nodejs
    fi
    
    # Install useful packages
    sudo apt install -y curl wget jq htop tree
    
    # Create helpful aliases
    cat > ~/.echotune_aliases << 'EOF'
# EchoTune AI aliases
alias echotune-start='cd ~/echotune-ai && docker compose up -d'
alias echotune-stop='cd ~/echotune-ai && docker compose down'
alias echotune-restart='cd ~/echotune-ai && docker compose restart'
alias echotune-logs='cd ~/echotune-ai && docker compose logs -f'
alias echotune-build='cd ~/echotune-ai && docker compose build'
alias echotune-status='cd ~/echotune-ai && docker compose ps'
alias echotune-shell='cd ~/echotune-ai && docker compose exec app sh'
alias echotune-health='curl -s http://localhost/health | jq .'
alias echotune-monitor='watch "docker compose ps && echo && docker stats --no-stream"'
EOF
    
    # Add to bashrc if not already present
    if ! grep -q "source ~/.echotune_aliases" ~/.bashrc; then
        echo "source ~/.echotune_aliases" >> ~/.bashrc
    fi
    
    log_success "Helper tools installed"
}

# Function to build and start services
build_and_start() {
    show_progress 6 8 "Building and starting services"
    
    # Pull base images for faster builds
    log_info "Pulling base images..."
    docker pull node:20-alpine
    docker pull nginx:alpine
    docker pull mongo:7.0-jammy
    docker pull redis:7.2-alpine
    
    # Build services
    log_info "Building EchoTune AI containers..."
    docker compose build
    
    # Start services
    log_info "Starting services..."
    docker compose up -d
    
    log_success "Services started"
}

# Function to wait for services and verify health
verify_deployment() {
    show_progress 7 8 "Verifying deployment"
    
    log_info "Waiting for services to be ready..."
    sleep 30
    
    # Check service status
    local services_status=$(docker compose ps --format json | jq -r '.[].State')
    
    if echo "$services_status" | grep -q "running"; then
        log_success "Services are running"
    else
        log_warning "Some services may not be running properly"
        docker compose ps
    fi
    
    # Test basic connectivity
    if curl -s http://localhost/health > /dev/null; then
        log_success "Health check passed"
    else
        log_warning "Health check failed - services may still be starting"
    fi
    
    log_success "Deployment verification completed"
}

# Function to show final information
show_completion_info() {
    show_progress 8 8 "Deployment completed"
    
    echo
    log_success "🎉 EchoTune AI deployment completed successfully!"
    echo
    echo "📋 Access Information:"
    echo "• Application URL: http://localhost"
    echo "• Health Check: http://localhost/health"
    echo "• Project Directory: $INSTALL_DIR"
    echo
    echo "🔧 Management Commands:"
    echo "• Start services: echotune-start"
    echo "• Stop services: echotune-stop"
    echo "• View logs: echotune-logs"
    echo "• Check status: echotune-status"
    echo "• Health check: echotune-health"
    echo "• Monitor: echotune-monitor"
    echo
    echo "⚙️ Configuration:"
    echo "• Edit environment: nano $INSTALL_DIR/.env"
    echo "• Configure Spotify API at: https://developer.spotify.com/"
    echo
    echo "📚 Documentation:"
    echo "• GitHub: https://github.com/dzp5103/Spotify-echo"
    echo "• Docker: https://docs.docker.com/"
    echo
    echo "🔍 Troubleshooting:"
    echo "• View logs: cd $INSTALL_DIR && docker compose logs"
    echo "• Restart services: cd $INSTALL_DIR && docker compose restart"
    echo "• Rebuild: cd $INSTALL_DIR && docker compose build --no-cache"
    echo
    
    if [[ ! -f "$INSTALL_DIR/.env" ]] || grep -q "your_spotify_client_id_here" "$INSTALL_DIR/.env"; then
        log_warning "⚠️ Please configure your Spotify API credentials in $INSTALL_DIR/.env"
        log_info "Then restart services with: echotune-restart"
    fi
    
    # Create desktop shortcut if possible
    if command -v xdg-desktop-menu &> /dev/null; then
        cat > ~/Desktop/EchoTune-AI.desktop << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=EchoTune AI
Comment=Open EchoTune AI in browser
Exec=xdg-open http://localhost
Icon=applications-multimedia
Terminal=false
Categories=AudioVideo;Music;
EOF
        chmod +x ~/Desktop/EchoTune-AI.desktop
        log_info "Desktop shortcut created"
    fi
}

# Function to handle cleanup on exit
cleanup() {
    if [[ $? -ne 0 ]]; then
        log_error "Deployment failed. Check $LOG_FILE for details."
        echo "To retry: $0"
    fi
}

# Main deployment function
main() {
    trap cleanup EXIT
    
    # Clear log file
    > "$LOG_FILE"
    
    echo -e "${CYAN}🚀 EchoTune AI - Simplified Docker Deployment${NC}"
    echo -e "${CYAN}===============================================${NC}"
    echo
    
    check_prerequisites
    install_docker_if_needed
    setup_project
    configure_environment
    create_optimized_docker_config
    install_helper_tools
    build_and_start
    verify_deployment
    show_completion_info
    
    # Source aliases for current session
    source ~/.echotune_aliases 2>/dev/null || true
    
    log_success "✅ All done! Enjoy EchoTune AI!"
}

# Handle command line arguments
case "${1:-deploy}" in
    "deploy"|"")
        main
        ;;
    "status")
        if [[ -d "$INSTALL_DIR" ]]; then
            cd "$INSTALL_DIR"
            docker compose ps
        else
            log_error "EchoTune AI not installed. Run: $0 deploy"
        fi
        ;;
    "logs")
        if [[ -d "$INSTALL_DIR" ]]; then
            cd "$INSTALL_DIR"
            docker compose logs -f
        else
            log_error "EchoTune AI not installed. Run: $0 deploy"
        fi
        ;;
    "stop")
        if [[ -d "$INSTALL_DIR" ]]; then
            cd "$INSTALL_DIR"
            docker compose down
            log_success "Services stopped"
        else
            log_error "EchoTune AI not installed. Run: $0 deploy"
        fi
        ;;
    "start")
        if [[ -d "$INSTALL_DIR" ]]; then
            cd "$INSTALL_DIR"
            docker compose up -d
            log_success "Services started"
        else
            log_error "EchoTune AI not installed. Run: $0 deploy"
        fi
        ;;
    "update")
        if [[ -d "$INSTALL_DIR" ]]; then
            cd "$INSTALL_DIR"
            git pull origin main
            docker compose build
            docker compose up -d
            log_success "Updated and restarted"
        else
            log_error "EchoTune AI not installed. Run: $0 deploy"
        fi
        ;;
    "uninstall")
        if [[ -d "$INSTALL_DIR" ]]; then
            cd "$INSTALL_DIR"
            docker compose down -v
            cd ..
            rm -rf "$INSTALL_DIR"
            log_success "EchoTune AI uninstalled"
        else
            log_warning "EchoTune AI not found"
        fi
        ;;
    "help"|"-h"|"--help")
        echo "EchoTune AI Simplified Docker Deployment"
        echo
        echo "Usage: $0 [command]"
        echo
        echo "Commands:"
        echo "  deploy     - Deploy EchoTune AI (default)"
        echo "  status     - Show service status"
        echo "  logs       - View service logs"
        echo "  start      - Start services"
        echo "  stop       - Stop services"
        echo "  update     - Update and restart services"
        echo "  uninstall  - Remove EchoTune AI completely"
        echo "  help       - Show this help message"
        echo
        echo "Quick start: curl -sSL https://raw.githubusercontent.com/dzp5103/Spotify-echo/main/scripts/simple-deploy.sh | bash"
        exit 0
        ;;
    *)
        log_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac