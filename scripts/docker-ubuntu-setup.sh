#!/bin/bash

# Enhanced Docker Installation and Setup for Ubuntu 22.04
# Based on DigitalOcean tutorial: https://www.digitalocean.com/community/tutorials/how-to-install-and-use-docker-on-ubuntu-22-04
# Optimized for EchoTune AI deployment

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DOCKER_COMPOSE_VERSION="2.24.5"
USER_NAME="${USER:-$(whoami)}"

# Function to check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_error "This script should not be run as root"
        log_info "Run as a regular user with sudo privileges"
        exit 1
    fi
}

# Function to check Ubuntu version
check_ubuntu_version() {
    if ! lsb_release -d | grep -q "Ubuntu 22.04"; then
        log_warning "This script is optimized for Ubuntu 22.04"
        log_info "It may work on other versions but is not tested"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Function to update system packages
update_system() {
    log_info "Updating system packages..."
    sudo apt update -y
    sudo apt upgrade -y
    sudo apt install -y \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg \
        lsb-release \
        software-properties-common \
        git \
        wget \
        unzip \
        htop \
        tree \
        jq
    log_success "System packages updated"
}

# Function to install Docker
install_docker() {
    log_info "Installing Docker..."
    
    # Remove old Docker versions
    sudo apt remove -y docker docker-engine docker.io containerd runc || true
    
    # Add Docker's official GPG key
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # Add Docker repository
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Update package index
    sudo apt update -y
    
    # Install Docker Engine
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Start and enable Docker service
    sudo systemctl start docker
    sudo systemctl enable docker
    
    log_success "Docker installed successfully"
}

# Function to configure Docker for non-root user
configure_docker_user() {
    log_info "Configuring Docker for user: $USER_NAME"
    
    # Add user to docker group
    sudo usermod -aG docker "$USER_NAME"
    
    # Set proper permissions
    sudo chmod 666 /var/run/docker.sock
    
    log_success "Docker configured for non-root user"
    log_warning "Please log out and log back in for group changes to take effect"
}

# Function to install Docker Compose (standalone)
install_docker_compose() {
    log_info "Installing Docker Compose standalone..."
    
    # Download Docker Compose
    sudo curl -L "https://github.com/docker/compose/releases/download/v${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" \
        -o /usr/local/bin/docker-compose
    
    # Make it executable
    sudo chmod +x /usr/local/bin/docker-compose
    
    # Create symlink for convenience
    sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    
    log_success "Docker Compose installed successfully"
}

# Function to optimize Docker for production
optimize_docker() {
    log_info "Optimizing Docker for production use..."
    
    # Create Docker daemon configuration
    sudo mkdir -p /etc/docker
    
    cat <<EOF | sudo tee /etc/docker/daemon.json
{
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "100m",
        "max-file": "5"
    },
    "storage-driver": "overlay2",
    "storage-opts": [
        "overlay2.override_kernel_check=true"
    ],
    "features": {
        "buildkit": true
    },
    "experimental": false,
    "metrics-addr": "127.0.0.1:9323",
    "registry-mirrors": [],
    "insecure-registries": [],
    "debug": false,
    "default-runtime": "runc",
    "default-shm-size": "64M",
    "userland-proxy": false,
    "live-restore": true
}
EOF
    
    # Restart Docker to apply configuration
    sudo systemctl restart docker
    
    log_success "Docker optimized for production"
}

# Function to setup EchoTune AI specific configurations
setup_echotune_docker() {
    log_info "Setting up EchoTune AI Docker configurations..."
    
    # Create project directories
    sudo mkdir -p /opt/echotune/{ssl,letsencrypt,logs,data,static,mongodb,redis,nginx,certbot,backups}
    sudo chown -R "$USER_NAME:$USER_NAME" /opt/echotune
    sudo chmod -R 755 /opt/echotune
    
    # Create Docker network for EchoTune
    docker network create --driver bridge \
        --subnet=172.20.0.0/16 \
        --ip-range=172.20.0.0/24 \
        echotune-network || log_warning "Network may already exist"
    
    # Pull base images to speed up builds
    log_info "Pre-pulling base Docker images..."
    docker pull node:20-alpine
    docker pull nginx:alpine
    docker pull mongo:7.0-jammy
    docker pull redis:7.2-alpine
    
    log_success "EchoTune AI Docker setup completed"
}

# Function to create helpful aliases and scripts
create_helper_scripts() {
    log_info "Creating helpful Docker aliases and scripts..."
    
    # Create aliases file
    cat <<'EOF' > "$HOME/.docker_aliases"
# EchoTune AI Docker Aliases
alias dc='docker-compose'
alias dcup='docker-compose up -d'
alias dcdown='docker-compose down'
alias dcrestart='docker-compose restart'
alias dclogs='docker-compose logs -f'
alias dcbuild='docker-compose build --no-cache'
alias dcpull='docker-compose pull'

alias dps='docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'
alias dimg='docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"'
alias dexec='docker exec -it'
alias dlogs='docker logs -f'

# EchoTune specific
alias echotune-start='cd /home/'"$USER_NAME"'/Spotify-echo && docker-compose up -d'
alias echotune-stop='cd /home/'"$USER_NAME"'/Spotify-echo && docker-compose down'
alias echotune-logs='cd /home/'"$USER_NAME"'/Spotify-echo && docker-compose logs -f'
alias echotune-build='cd /home/'"$USER_NAME"'/Spotify-echo && docker-compose build --no-cache'
alias echotune-health='curl -s http://localhost/health | jq .'
EOF
    
    # Add to bashrc if not already present
    if ! grep -q "source ~/.docker_aliases" "$HOME/.bashrc"; then
        echo "source ~/.docker_aliases" >> "$HOME/.bashrc"
    fi
    
    # Create quick deployment script
    cat <<'EOF' > "$HOME/echotune-quick-deploy.sh"
#!/bin/bash
# Quick EchoTune AI deployment script

set -e

REPO_DIR="$HOME/Spotify-echo"

echo "🚀 Starting EchoTune AI quick deployment..."

# Check if repository exists
if [[ ! -d "$REPO_DIR" ]]; then
    echo "📥 Cloning EchoTune AI repository..."
    git clone https://github.com/dzp5103/Spotify-echo.git "$REPO_DIR"
fi

cd "$REPO_DIR"

# Check if .env exists
if [[ ! -f ".env" ]]; then
    echo "⚙️  Creating environment configuration..."
    cp .env.production.example .env
    echo "Please edit .env file with your configuration before continuing"
    echo "Run: nano .env"
    exit 1
fi

# Build and start services
echo "🏗️  Building Docker images..."
docker-compose build

echo "🚀 Starting services..."
docker-compose up -d

echo "⏳ Waiting for services to be ready..."
sleep 30

echo "🔍 Checking service health..."
docker-compose ps

echo "✅ EchoTune AI deployment completed!"
echo "🌐 Access your application at: http://localhost"
echo "📊 Monitor with: docker-compose logs -f"
EOF
    
    chmod +x "$HOME/echotune-quick-deploy.sh"
    
    log_success "Helper scripts and aliases created"
}

# Function to install Node.js and Python for development
install_development_tools() {
    log_info "Installing development tools..."
    
    # Install Node.js 20 via NodeSource
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
    
    # Install Python and pip
    sudo apt install -y python3 python3-pip python3-venv
    
    # Install useful global npm packages
    sudo npm install -g npm@latest
    sudo npm install -g pm2 nodemon
    
    log_success "Development tools installed"
}

# Function to setup monitoring tools
setup_monitoring() {
    log_info "Setting up Docker monitoring tools..."
    
    # Install ctop for container monitoring
    sudo wget https://github.com/bcicen/ctop/releases/download/v0.7.7/ctop-0.7.7-linux-amd64 \
        -O /usr/local/bin/ctop
    sudo chmod +x /usr/local/bin/ctop
    
    # Install lazydocker for easier Docker management
    curl https://raw.githubusercontent.com/jesseduffield/lazydocker/master/scripts/install_update_linux.sh | bash
    
    log_success "Monitoring tools installed"
}

# Function to perform system verification
verify_installation() {
    log_info "Verifying installation..."
    
    # Check Docker
    if docker --version; then
        log_success "Docker installed: $(docker --version)"
    else
        log_error "Docker installation failed"
        return 1
    fi
    
    # Check Docker Compose
    if docker-compose --version; then
        log_success "Docker Compose installed: $(docker-compose --version)"
    else
        log_error "Docker Compose installation failed"
        return 1
    fi
    
    # Check Docker service
    if systemctl is-active --quiet docker; then
        log_success "Docker service is running"
    else
        log_error "Docker service is not running"
        return 1
    fi
    
    # Check user permissions
    if groups "$USER_NAME" | grep -q docker; then
        log_success "User is in docker group"
    else
        log_warning "User is not in docker group - relogin required"
    fi
    
    # Test Docker functionality
    if docker run --rm hello-world > /dev/null 2>&1; then
        log_success "Docker is working correctly"
    else
        log_warning "Docker test failed - may need to relogin"
    fi
    
    log_success "Installation verification completed"
}

# Function to display post-installation instructions
show_post_install_info() {
    echo
    log_success "🎉 Docker setup for EchoTune AI completed successfully!"
    echo
    echo "📋 Next Steps:"
    echo "1. Log out and log back in to apply group changes"
    echo "2. Run: source ~/.bashrc (to load new aliases)"
    echo "3. Clone EchoTune AI: git clone https://github.com/dzp5103/Spotify-echo.git"
    echo "4. Configure environment: cp .env.production.example .env && nano .env"
    echo "5. Deploy: ~/echotune-quick-deploy.sh"
    echo
    echo "🔧 Useful Commands:"
    echo "• Quick deploy: ~/echotune-quick-deploy.sh"
    echo "• Monitor containers: ctop"
    echo "• Docker management: lazydocker"
    echo "• View logs: echotune-logs"
    echo "• Health check: echotune-health"
    echo
    echo "📚 Documentation:"
    echo "• Docker: https://docs.docker.com/"
    echo "• EchoTune AI: https://github.com/dzp5103/Spotify-echo"
    echo "• DigitalOcean Tutorial: https://www.digitalocean.com/community/tutorials/how-to-install-and-use-docker-on-ubuntu-22-04"
    echo
}

# Main installation function
main() {
    log_info "Starting enhanced Docker setup for EchoTune AI on Ubuntu 22.04"
    
    check_root
    check_ubuntu_version
    
    # Core installation steps
    update_system
    install_docker
    configure_docker_user
    install_docker_compose
    optimize_docker
    
    # EchoTune specific setup
    setup_echotune_docker
    create_helper_scripts
    
    # Optional tools
    install_development_tools
    setup_monitoring
    
    # Verification and information
    verify_installation
    show_post_install_info
    
    log_success "Setup completed! Please relogin to use Docker without sudo."
}

# Handle command line arguments
case "${1:-install}" in
    "install"|"")
        main
        ;;
    "verify")
        verify_installation
        ;;
    "info")
        show_post_install_info
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [install|verify|info|help]"
        echo
        echo "Commands:"
        echo "  install  - Complete Docker setup (default)"
        echo "  verify   - Verify existing installation"
        echo "  info     - Show post-installation information"
        echo "  help     - Show this help message"
        exit 0
        ;;
    *)
        log_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac