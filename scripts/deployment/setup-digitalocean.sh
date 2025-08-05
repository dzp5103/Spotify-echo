#!/bin/bash

# EchoTune AI - Enhanced Digital Ocean Setup Script
# Comprehensive server setup with production optimizations, security, and monitoring

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_USER="echotune"
APP_DIR="/opt/echotune"
DOMAIN="${DOMAIN:-primosphere.studio}"
REPO_URL="https://github.com/dzp5103/Spotify-echo.git"

# Helper functions
detect_and_source_env() {
    local env_file=""
    local env_locations=(
        ".env"
        "$APP_DIR/.env"
        "/opt/echotune/.env"
        "$(pwd)/.env"
    )
    
    log_info "Detecting and sourcing environment configuration..."
    
    # Try to find .env file in priority order
    for location in "${env_locations[@]}"; do
        if [ -f "$location" ]; then
            env_file="$location"
            log_info "Found environment file: $env_file"
            break
        fi
    done
    
    if [ -n "$env_file" ]; then
        # Source environment file safely
        set -a
        source "$env_file"
        set +a
        log_success "Environment variables loaded from $env_file"
        return 0
    else
        log_warning "No .env file found in any of the expected locations"
        return 1
    fi
}

validate_or_prompt_env() {
    log_info "Validating environment configuration..."
    
    # Define required environment variables for setup
    local required_vars=(
        "DOMAIN"
        "NODE_ENV"
    )
    
    local optional_vars=(
        "SPOTIFY_CLIENT_ID"
        "SPOTIFY_CLIENT_SECRET"
        "MONGODB_URI"
        "PORT"
        "FRONTEND_URL"
    )
    
    # Use detected values or fall back to defaults
    export DOMAIN="${DOMAIN:-primosphere.studio}"
    export NODE_ENV="${NODE_ENV:-production}"
    export PORT="${PORT:-3000}"
    export FRONTEND_URL="${FRONTEND_URL:-https://$DOMAIN}"
    export SPOTIFY_REDIRECT_URI="${SPOTIFY_REDIRECT_URI:-https://$DOMAIN/auth/callback}"
    
    log_success "Environment configuration validated with defaults applied"
    
    # Show current configuration
    log_info "Current environment configuration:"
    echo "  - DOMAIN: $DOMAIN"
    echo "  - NODE_ENV: $NODE_ENV"
    echo "  - PORT: $PORT"
    echo "  - FRONTEND_URL: $FRONTEND_URL"
    echo "  - SPOTIFY_REDIRECT_URI: $SPOTIFY_REDIRECT_URI"
    
    if [ -n "$SPOTIFY_CLIENT_ID" ]; then
        echo "  - SPOTIFY_CLIENT_ID: ${SPOTIFY_CLIENT_ID:0:8}..."
    else
        echo "  - SPOTIFY_CLIENT_ID: [Not set - will need to be configured]"
    fi
    
    if [ -n "$MONGODB_URI" ]; then
        echo "  - MONGODB_URI: [Configured]"
    else
        echo "  - MONGODB_URI: [Not set - optional]"
    fi
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [ "$EUID" -eq 0 ]; then 
        log_error "Please do not run as root. This script will use sudo when needed."
        exit 1
    fi
}

check_system_requirements() {
    log_info "Checking system requirements..."
    
    # Check Ubuntu version
    if ! lsb_release -d | grep -q "Ubuntu"; then
        log_warning "This script is optimized for Ubuntu. Other distributions may work but are not tested."
    fi
    
    # Check available memory (recommend 2GB minimum)
    local mem_kb
    mem_kb=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    local mem_gb=$((mem_kb / 1024 / 1024))
    
    if [ $mem_gb -lt 2 ]; then
        log_warning "System has ${mem_gb}GB RAM. Recommended minimum is 2GB for production."
        log_warning "Consider upgrading your droplet size for better performance."
    else
        log_success "System memory: ${mem_gb}GB (sufficient)"
    fi
    
    # Check available disk space (recommend 20GB minimum)
    local disk_available
    disk_available=$(df / | tail -1 | awk '{print $4}')
    local disk_gb=$((disk_available / 1024 / 1024))
    
    if [ $disk_gb -lt 20 ]; then
        log_warning "Available disk space: ${disk_gb}GB. Recommended minimum is 20GB."
    else
        log_success "Available disk space: ${disk_gb}GB (sufficient)"
    fi
}

update_system() {
    log_info "Updating system packages..."
    sudo apt update && sudo apt upgrade -y
    
    # Install essential packages
    log_info "Installing essential packages..."
    sudo apt install -y \
        curl \
        wget \
        git \
        unzip \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release \
        htop \
        iotop \
        nethogs \
        ncdu \
        tree \
        jq \
        vim
    
    log_success "System packages updated"
}

install_docker() {
    log_info "Installing Docker and Docker Compose..."
    
    if ! command -v docker &> /dev/null; then
        # Install Docker
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker "$USER"
        rm get-docker.sh
        
        # Configure Docker daemon for production
        sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "live-restore": true
}
EOF
        
        sudo systemctl enable docker
        sudo systemctl restart docker
        
        log_success "Docker installed and configured"
    else
        log_success "Docker already installed"
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        # Install Docker Compose
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        
        log_success "Docker Compose installed"
    else
        log_success "Docker Compose already installed"
    fi
}

install_nodejs() {
    # Use the enhanced installation function from deployment-utils.sh
    install_nodejs_20 false
}

install_python() {
    log_info "Installing Python and pip..."
    
    sudo apt install -y python3 python3-pip python3-venv python3-dev
    
    # Install common Python packages for ML/AI
    pip3 install --user --upgrade pip setuptools wheel
    
    log_success "Python $(python3 --version) installed"
}

install_nginx() {
    log_info "Installing and configuring nginx..."
    
    if ! command -v nginx &> /dev/null; then
        sudo apt install -y nginx
        
        # Configure nginx for EchoTune
        sudo systemctl enable nginx
        sudo systemctl start nginx
        
        log_success "Nginx installed and started"
    else
        log_success "Nginx already installed"
    fi
    
    # Install Certbot for SSL
    if ! command -v certbot &> /dev/null; then
        sudo apt install -y certbot python3-certbot-nginx
        log_success "Certbot installed"
    else
        log_success "Certbot already installed"
    fi
}

install_monitoring_tools() {
    log_info "Installing monitoring and diagnostic tools..."
    
    # Install system monitoring tools
    sudo apt install -y \
        htop \
        iotop \
        nethogs \
        nload \
        ncdu \
        tree \
        fail2ban \
        ufw \
        logrotate
    
    # Install Redis for caching and sessions
    if ! command -v redis-cli &> /dev/null; then
        sudo apt install -y redis-server
        sudo systemctl enable redis-server
        sudo systemctl start redis-server
        
        log_success "Redis installed and started"
    else
        log_success "Redis already installed"
    fi
    
    log_success "Monitoring tools installed"
}

create_app_user() {
    log_info "Creating application user..."
    
    if ! id "$APP_USER" &>/dev/null; then
        sudo adduser --system --group --home "$APP_DIR" --shell /bin/bash "$APP_USER"
        sudo usermod -aG docker "$APP_USER"
        
        log_success "User $APP_USER created"
    else
        log_success "User $APP_USER already exists"
    fi
}

setup_app_directory() {
    log_info "Setting up application directory..."
    
    # Create application directory
    sudo mkdir -p "$APP_DIR"
    sudo chown "$APP_USER:$APP_USER" "$APP_DIR"
    
    # Create subdirectories
    sudo -u "$APP_USER" mkdir -p "$APP_DIR"/{logs,backups,ssl,tmp}
    
    # Set appropriate permissions
    sudo chmod 755 "$APP_DIR"
    sudo chmod 700 "$APP_DIR/ssl"
    sudo chmod 755 "$APP_DIR/logs" "$APP_DIR/backups"
    sudo chmod 777 "$APP_DIR/tmp"
    
    log_success "Application directory structure created"
}

clone_repository() {
    log_info "Setting up application repository..."
    
    cd "$APP_DIR"
    
    # Use the robust repository setup function
    setup_repository_robust "$REPO_URL" "$APP_DIR" "Spotify-echo"
}

setup_environment() {
    log_info "Setting up environment configuration..."
    
    cd "$APP_DIR"
    
    # Use robust environment detection and validation
    if detect_and_source_env_robust "$APP_DIR"; then
        log_success "Using existing environment configuration"
        
        # Update production-specific settings if not already set correctly
        if [ "$NODE_ENV" != "production" ]; then
            log_info "Updating NODE_ENV to production in .env file"
            sudo -u "$APP_USER" sed -i "s|NODE_ENV=.*|NODE_ENV=production|" .env
        fi
        
        if [[ "$FRONTEND_URL" == *"localhost"* ]]; then
            log_info "Updating FRONTEND_URL for production in .env file"
            sudo -u "$APP_USER" sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://$DOMAIN|" .env
        fi
        
        if [[ "$SPOTIFY_REDIRECT_URI" == *"localhost"* ]]; then
            log_info "Updating SPOTIFY_REDIRECT_URI for production in .env file"
            sudo -u "$APP_USER" sed -i "s|SPOTIFY_REDIRECT_URI=.*|SPOTIFY_REDIRECT_URI=https://$DOMAIN/auth/callback|" .env
        fi
        
        log_success "Environment configuration updated for production"
    else
        # Create new .env file from template
        log_info "Creating new environment file from template..."
        
        if [ -f ".env.production.example" ]; then
            sudo -u "$APP_USER" cp .env.production.example .env
        elif [ -f ".env.example" ]; then
            sudo -u "$APP_USER" cp .env.example .env
        else
            log_error "No environment template found"
            exit 1
        fi
        
        # Update production-specific settings
        sudo -u "$APP_USER" sed -i "s|NODE_ENV=.*|NODE_ENV=production|" .env
        sudo -u "$APP_USER" sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://$DOMAIN|" .env
        sudo -u "$APP_USER" sed -i "s|SPOTIFY_REDIRECT_URI=.*|SPOTIFY_REDIRECT_URI=https://$DOMAIN/auth/callback|" .env
        
        log_success "Environment file created from template"
        log_warning "Please edit $APP_DIR/.env with your actual Spotify credentials and other required values"
    fi
    
    # Validate final configuration using the comprehensive validation
    validate_environment_comprehensive
}

install_app_dependencies() {
    log_info "Installing application dependencies..."
    
    cd "$APP_DIR"
    
    # Install Node.js dependencies
    sudo -u "$APP_USER" npm ci --only=production
    
    # Install Python dependencies if requirements file exists
    if [ -f "requirements-production.txt" ]; then
        sudo -u "$APP_USER" python3 -m venv venv
        sudo -u "$APP_USER" ./venv/bin/pip install --upgrade pip
        sudo -u "$APP_USER" ./venv/bin/pip install -r requirements-production.txt
        log_success "Python dependencies installed"
    fi
    
    log_success "Application dependencies installed"
}

configure_system_services() {
    log_info "Configuring system services..."
    
    # Configure log rotation
    sudo tee /etc/logrotate.d/echotune > /dev/null <<EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
    su $APP_USER $APP_USER
}
EOF
    
    # Configure firewall
    sudo ufw --force enable
    sudo ufw allow ssh
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    
    # Configure fail2ban
    sudo systemctl enable fail2ban
    sudo systemctl start fail2ban
    
    log_success "System services configured"
}

optimize_system() {
    log_info "Applying system optimizations..."
    
    # Configure swap (if not already configured)
    if [ ! -f /swapfile ]; then
        log_info "Creating swap file..."
        sudo fallocate -l 2G /swapfile
        sudo chmod 600 /swapfile
        sudo mkswap /swapfile
        sudo swapon /swapfile
        echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
        log_success "Swap file created (2GB)"
    fi
    
    # Configure kernel parameters for web server
    sudo tee -a /etc/sysctl.conf > /dev/null <<EOF

# EchoTune AI optimizations
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_fin_timeout = 10
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_probes = 5
net.ipv4.tcp_keepalive_intvl = 15
vm.swappiness = 10
fs.file-max = 65535
EOF
    
    sudo sysctl -p
    
    # Set ulimits for the application user
    sudo tee -a /etc/security/limits.conf > /dev/null <<EOF
$APP_USER soft nofile 65535
$APP_USER hard nofile 65535
$APP_USER soft nproc 32768
$APP_USER hard nproc 32768
EOF
    
    log_success "System optimizations applied"
}

setup_ssl_preparation() {
    log_info "Preparing SSL certificate setup..."
    
    cat > "$APP_DIR/setup-ssl.sh" <<EOF
#!/bin/bash
# SSL Setup Script for $DOMAIN

set -e

echo "Setting up SSL certificates for $DOMAIN..."

# Generate certificates with Certbot
sudo certbot certonly --nginx -d "$DOMAIN" -d "www.$DOMAIN" \\
    --non-interactive --agree-tos --email "admin@$DOMAIN"

# Copy certificates to application directory
sudo cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$APP_DIR/ssl/$DOMAIN.crt"
sudo cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$APP_DIR/ssl/$DOMAIN.key"
sudo chown $APP_USER:$APP_USER "$APP_DIR/ssl"/*

echo "SSL certificates installed successfully!"
echo "You can now run the deployment script."
EOF
    
    chmod +x "$APP_DIR/setup-ssl.sh"
    chown "$APP_USER:$APP_USER" "$APP_DIR/setup-ssl.sh"
    
    log_success "SSL setup script created at $APP_DIR/setup-ssl.sh"
}

display_next_steps() {
    echo ""
    log_success "🎉 EchoTune AI server setup completed!"
    echo ""
    echo "📋 Next Steps:"
    echo ""
    echo "1. 📝 Configure Environment Variables:"
    echo "   sudo nano $APP_DIR/.env"
    echo "   - Set your Spotify Client ID and Secret"
    echo "   - Configure database URLs if using external services"
    echo ""
    echo "2. 🌐 Configure DNS:"
    echo "   Point your domain $DOMAIN to this server's IP address:"
    echo "   - A Record: $DOMAIN -> $(curl -s https://ipinfo.io/ip)"
    echo "   - A Record: www.$DOMAIN -> $(curl -s https://ipinfo.io/ip)"
    echo ""
    echo "3. 🔒 Setup SSL Certificates:"
    echo "   cd $APP_DIR && ./setup-ssl.sh"
    echo ""
    echo "4. 🚀 Deploy Application:"
    echo "   cd $APP_DIR && ./scripts/deploy.sh"
    echo ""
    echo "5. 🔧 Run Security Hardening (optional but recommended):"
    echo "   cd $APP_DIR && ./scripts/security-hardening.sh"
    echo ""
    echo "📊 System Information:"
    echo "   - App Directory: $APP_DIR"
    echo "   - App User: $APP_USER"
    echo "   - Domain: $DOMAIN"
    echo "   - Server IP: $(curl -s https://ipinfo.io/ip)"
    echo ""
    echo "🔍 Useful Commands:"
    echo "   - Check logs: sudo -u $APP_USER docker-compose logs -f"
    echo "   - System status: systemctl status"
    echo "   - Firewall status: sudo ufw status"
    echo "   - Available space: df -h"
    echo "   - Memory usage: free -h"
    echo ""
    echo "📚 Documentation:"
    echo "   - Deployment Guide: $APP_DIR/DIGITALOCEAN_DEPLOYMENT.md"
    echo "   - Production README: $APP_DIR/PRODUCTION_README.md"
    echo ""
}

main() {
    echo "🎵 EchoTune AI - Enhanced Digital Ocean Setup"
    echo "============================================="
    echo ""
    
    # Early environment detection for configuration
    detect_and_source_env || true  # Don't fail if no .env found initially
    validate_or_prompt_env
    
    check_root
    check_system_requirements
    update_system
    install_docker
    install_nodejs
    install_python
    install_nginx
    install_monitoring_tools
    create_app_user
    setup_app_directory
    clone_repository
    setup_environment
    install_app_dependencies
    configure_system_services
    optimize_system
    setup_ssl_preparation
    
    # Ensure user can access Docker without sudo (requires re-login)
    if ! groups "$USER" | grep -q docker; then
        log_info "Adding current user to docker group..."
        sudo usermod -aG docker "$USER"
        log_warning "You need to log out and log back in for Docker permissions to take effect"
    fi
    
    display_next_steps
}

# Run main function
main "$@"
