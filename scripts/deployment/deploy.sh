#!/bin/bash

# EchoTune AI - Enhanced Production Deployment Script
# Comprehensive deployment with environment validation, SSL, monitoring, and security

# Load deployment utilities for consistent operations
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/deployment-utils.sh" ]; then
    source "$SCRIPT_DIR/deployment-utils.sh"
elif [ -f "scripts/deployment-utils.sh" ]; then
    source "scripts/deployment-utils.sh"
else
    echo "Warning: deployment-utils.sh not found, using basic functions"
    # Fallback basic functions
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    NC='\033[0m'
    
    log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
    log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
    log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
    log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
    log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }
    
    exit_with_help() {
        local error_message="$1"
        local help_text="$2"
        echo ""
        log_error "$error_message"
        echo ""
        if [ -n "$help_text" ]; then
            echo -e "${YELLOW}💡 Helpful guidance:${NC}"
            echo "$help_text"
            echo ""
        fi
        exit 1
    }
fi

# Enable strict error handling
set -e
set -o pipefail

# Configuration
APP_DIR="/opt/echotune"
LOG_DIR="${APP_DIR}/logs"
BACKUP_DIR="${APP_DIR}/backups"
SSL_DIR="${APP_DIR}/ssl"
DOMAIN="${DOMAIN:-primosphere.studio}"
REPO_URL="${REPO_URL:-https://github.com/dzp5103/Spotify-echo.git}"
HEALTH_ENDPOINT="http://localhost:3000/health"
MAX_HEALTH_RETRIES=5
HEALTH_RETRY_DELAY=10

# Helper functions
detect_and_source_env() {
    # Use the robust environment detection function
    detect_and_source_env_robust
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

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

exit_with_help() {
    local error_message="$1"
    local help_text="$2"
    
    echo ""
    log_error "$error_message"
    echo ""
    if [ -n "$help_text" ]; then
        echo -e "${YELLOW}💡 Helpful guidance:${NC}"
        echo "$help_text"
        echo ""
    fi
    
    echo -e "${YELLOW}📚 For more help:${NC}"
    echo "  - Check the deployment documentation: DIGITALOCEAN_DEPLOYMENT.md"
    echo "  - Review environment setup: .env.example or .env.production.example"
    echo "  - Verify prerequisites are installed (Docker, Node.js, etc.)"
    echo "  - Check logs in: $LOG_DIR"
    echo ""
    exit 1
}

check_root() {
    if [ "$EUID" -eq 0 ]; then
        log_error "Please do not run this script as root"
        exit 1
    fi
}

validate_environment() {
    # Use comprehensive environment validation
    validate_environment_comprehensive
}

setup_directories() {
    log_step "Setting up application directories..."
    
    # Ensure parent directory exists and is accessible
    if [ ! -d "$(dirname "$APP_DIR")" ]; then
        create_directory_safe "$(dirname "$APP_DIR")" "root" "755"
    fi
    
    # Create app directory if it doesn't exist using utility function
    create_directory_safe "$APP_DIR" "$USER" "755"
    
    # Create necessary subdirectories with proper error handling
    local dirs_to_create=("$LOG_DIR" "$BACKUP_DIR" "$SSL_DIR")
    for dir in "${dirs_to_create[@]}"; do
        local permissions="755"
        if [[ "$dir" == *"ssl"* ]]; then
            permissions="700"  # More restrictive for SSL directory
        fi
        create_directory_safe "$dir" "$USER" "$permissions"
    done
    
    log_success "Directories configured"
}

setup_repository() {
    # Use the robust repository setup function
    setup_repository_robust "$REPO_URL" "." "Spotify-echo"
}

setup_ssl_certificates() {
    log_info "Checking SSL certificate configuration..."
    
    if [ ! -f "$SSL_DIR/${DOMAIN}.crt" ] || [ ! -f "$SSL_DIR/${DOMAIN}.key" ]; then
        log_warning "SSL certificates not found in $SSL_DIR"
        log_info "Attempting to set up Let's Encrypt certificates..."
        
        # Check if certbot is installed
        if ! command -v certbot &> /dev/null; then
            log_info "Installing certbot..."
            sudo apt update
            sudo apt install -y certbot python3-certbot-nginx
        fi
        
        # Generate certificates
        log_info "Generating SSL certificates for $DOMAIN..."
        if sudo certbot certonly --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN"; then
            # Copy certificates to application directory
            sudo cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/${DOMAIN}.crt"
            sudo cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/${DOMAIN}.key"
            sudo chown $USER:$USER "$SSL_DIR"/*
            
            # Set up auto-renewal
            setup_ssl_renewal
            
            log_success "SSL certificates configured"
        else
            log_warning "SSL certificate generation failed. Continuing without SSL..."
            log_info "You can manually set up SSL later using:"
            log_info "  sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
        fi
    else
        log_success "SSL certificates found"
        
        # Check certificate expiry
        if openssl x509 -checkend 2592000 -noout -in "$SSL_DIR/${DOMAIN}.crt" >/dev/null 2>&1; then
            log_success "SSL certificate is valid for more than 30 days"
        else
            log_warning "SSL certificate expires soon. Consider renewal."
        fi
    fi
}

setup_ssl_renewal() {
    log_info "Setting up SSL certificate auto-renewal..."
    
    # Create renewal script
    sudo tee /etc/cron.monthly/renew-echotune-ssl > /dev/null <<EOF
#!/bin/bash
# Auto-renewal script for EchoTune SSL certificates

certbot renew --quiet || exit 1

# Copy new certificates if renewed
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/${DOMAIN}.crt"
    cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/${DOMAIN}.key"
    chown $USER:$USER "$SSL_DIR"/*
    
    # Restart nginx to use new certificates
    cd "$APP_DIR" && docker-compose restart nginx
fi
EOF
    
    sudo chmod +x /etc/cron.monthly/renew-echotune-ssl
    log_success "SSL auto-renewal configured"
}

setup_database() {
    log_info "Setting up database connections..."
    
    if [ -n "$MONGODB_URI" ]; then
        log_info "Testing MongoDB connection..."
        if node -e "
            const { MongoClient } = require('mongodb');
            MongoClient.connect('$MONGODB_URI')
                .then(() => { console.log('MongoDB connection successful'); process.exit(0); })
                .catch((err) => { console.error('MongoDB connection failed:', err.message); process.exit(1); });
        " 2>/dev/null; then
            log_success "MongoDB connection verified"
        else
            log_warning "MongoDB connection failed. Please check MONGODB_URI"
        fi
    fi
    
    if [ -n "$REDIS_URL" ]; then
        log_info "Testing Redis connection..."
        if command -v redis-cli &> /dev/null; then
            if redis-cli -u "$REDIS_URL" ping > /dev/null 2>&1; then
                log_success "Redis connection verified"
            else
                log_warning "Redis connection failed. Please check REDIS_URL"
            fi
        else
            log_info "Redis CLI not available, skipping connection test"
        fi
    fi
}

backup_current_deployment() {
    if [ -d "$APP_DIR" ] && docker-compose ps -q > /dev/null 2>&1; then
        log_info "Creating backup of current deployment..."
        
        local backup_name="backup_$(date +%Y%m%d_%H%M%S)"
        local backup_path="$BACKUP_DIR/$backup_name"
        
        mkdir -p "$backup_path"
        
        # Backup configuration files
        cp .env "$backup_path/" 2>/dev/null || true
        cp docker-compose.yml "$backup_path/" 2>/dev/null || true
        cp nginx.conf "$backup_path/" 2>/dev/null || true
        
        # Backup SSL certificates
        if [ -d "$SSL_DIR" ]; then
            cp -r "$SSL_DIR" "$backup_path/" 2>/dev/null || true
        fi
        
        # Create deployment info
        cat > "$backup_path/deployment_info.txt" <<EOF
Backup created: $(date)
Git commit: $(git rev-parse HEAD 2>/dev/null || echo "Unknown")
Docker images:
$(docker-compose images 2>/dev/null || echo "No images found")
EOF
        
        log_success "Backup created at $backup_path"
        
        # Keep only last 5 backups
        ls -dt "$BACKUP_DIR"/backup_* | tail -n +6 | xargs rm -rf 2>/dev/null || true
    fi
}

build_application() {
    log_step "Building application..."
    
    # Pull latest code if in git repository
    if [ -d ".git" ]; then
        log_info "Updating code from repository..."
        if ! git pull origin main 2>/dev/null; then
            log_warning "Could not update from git repository"
            log_info "Continuing with current code version..."
        else
            log_success "Code updated successfully"
        fi
    fi
    
    # Check for required files
    if [ ! -f "docker-compose.yml" ]; then
        exit_with_help "docker-compose.yml file not found" \
            "The deployment requires a docker-compose.yml file.
Please ensure:
1. You're in the correct repository directory
2. The repository contains the necessary Docker configuration
3. The repository clone was successful"
    fi
    
    # Build with Docker Compose
    log_info "Building Docker containers..."
    if ! docker-compose build --no-cache; then
        exit_with_help "Application build failed" \
            "Docker build process failed. This could be due to:
1. Docker not running: sudo systemctl start docker
2. Insufficient disk space: df -h
3. Build dependencies missing
4. Network issues downloading dependencies

Check the build logs above for specific errors.
You can also try:
- Restart Docker: sudo systemctl restart docker
- Clean Docker cache: docker system prune -f
- Check Docker logs: journalctl -u docker"
    fi
    
    log_success "Application built successfully"
}

deploy_application() {
    log_step "Deploying application..."
    
    # Use the robust Docker Compose deployment
    docker_compose_up_robust "docker-compose.yml" "" "false"
}

wait_for_health() {
    log_step "Performing application health check..."
    
    # Use the enhanced health check function
    wait_for_app_health "$HEALTH_ENDPOINT" "$MAX_HEALTH_RETRIES" "$HEALTH_RETRY_DELAY"
}

setup_monitoring() {
    log_info "Setting up monitoring and health checks..."
    
    # Ensure monitoring script exists and is executable
    if [ -f "scripts/monitor.sh" ]; then
        sudo cp scripts/monitor.sh /usr/local/bin/echotune-monitor
        sudo chmod +x /usr/local/bin/echotune-monitor
        
        # Create systemd service for monitoring
        sudo tee /etc/systemd/system/echotune-monitor.service > /dev/null <<EOF
[Unit]
Description=EchoTune AI Health Monitor
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/local/bin/echotune-monitor
Restart=always
RestartSec=10
StandardOutput=append:$LOG_DIR/monitor.log
StandardError=append:$LOG_DIR/monitor-error.log

[Install]
WantedBy=multi-user.target
EOF
        
        sudo systemctl daemon-reload
        sudo systemctl enable echotune-monitor
        sudo systemctl restart echotune-monitor
        
        log_success "Health monitoring service configured"
    else
        log_warning "Monitor script not found, skipping monitoring setup"
    fi
}

configure_firewall() {
    log_info "Configuring firewall..."
    
    if command -v ufw &> /dev/null; then
        # Configure UFW if it exists
        sudo ufw --force enable
        sudo ufw allow ssh
        sudo ufw allow 80/tcp
        sudo ufw allow 443/tcp
        
        log_success "Firewall configured"
    else
        log_warning "UFW not found, skipping firewall configuration"
        log_info "Please ensure ports 80 and 443 are open"
    fi
}

generate_deployment_report() {
    log_info "Generating deployment report..."
    
    local report_file="$LOG_DIR/deployment_$(date +%Y%m%d_%H%M%S).log"
    
    cat > "$report_file" <<EOF
EchoTune AI Deployment Report
=============================
Date: $(date)
User: $USER
Domain: $DOMAIN
App Directory: $APP_DIR

Environment:
- NODE_ENV: $NODE_ENV
- PORT: $PORT
- Frontend URL: $FRONTEND_URL

Services Status:
$(docker-compose ps)

System Resources:
$(df -h / | tail -1)
$(free -h | head -2)

Network Ports:
$(sudo netstat -tlnp | grep -E ':(80|443|3000) ')

Recent Logs:
$(docker-compose logs --tail=10 app 2>/dev/null || echo "No logs available")
EOF
    
    log_success "Deployment report saved to $report_file"
}

main() {
    echo "🚀 EchoTune AI - Enhanced Production Deployment"
    echo "=============================================="
    echo ""
    
    log_step "🏁 Starting deployment process..."
    echo ""
    
    # Enhanced cleanup function
    cleanup_on_error() {
        log_error "Production deployment failed or was interrupted"
        log_info "Cleaning up partial installation..."
        
        # Stop any running Docker containers
        if command_exists docker-compose && [ -f "docker-compose.yml" ]; then
            docker-compose down --timeout 10 2>/dev/null || true
        fi
        
        echo ""
        log_error "Production deployment was interrupted or failed"
        echo ""
        echo -e "${YELLOW}🔍 Troubleshooting Steps:${NC}"
        echo "   1. Check system requirements and environment configuration"
        echo "   2. Verify all prerequisites are installed"
        echo "   3. Check available disk space: df -h"
        echo "   4. Review logs for specific errors"
        echo ""
        echo -e "${YELLOW}💡 Common Solutions:${NC}"
        echo "   - Restart Docker: sudo systemctl restart docker"
        echo "   - Update environment: cp .env.example .env && nano .env"
        echo "   - Check permissions: sudo chown -R \$USER:\$USER /opt/echotune"
        echo "   - Free disk space: docker system prune -f"
        echo ""
    }
    
    # Set error handler
    trap cleanup_on_error ERR INT TERM
    
    # Ensure we're in the app directory, create if needed
    if [ ! -d "$APP_DIR" ]; then
        log_info "Creating application directory: $APP_DIR"
        sudo mkdir -p "$APP_DIR"
        sudo chown "$USER:$USER" "$APP_DIR"
    fi
    
    # Change to app directory
    if ! cd "$APP_DIR"; then
        exit_with_help "Cannot access application directory: $APP_DIR" \
            "Failed to change to application directory.
Please ensure:
1. Directory exists and is accessible
2. Current user has appropriate permissions
3. Disk space is available

You may need to run: sudo mkdir -p $APP_DIR && sudo chown \$USER:\$USER $APP_DIR"
    fi
    
    log_success "Working in directory: $(pwd)"
    echo ""
    
    # Step 1: Environment Detection
    log_step "🔧 Step 1: Detecting and loading environment configuration..."
    if ! detect_and_source_env; then
        exit_with_help "Environment configuration not found or invalid" \
            "No valid .env file found or environment loading failed.
Please ensure:
1. Create .env file: cp .env.example .env
2. Configure required variables (see DIGITALOCEAN_DEPLOYMENT.md)
3. Verify file permissions allow reading"
    fi
    echo ""
    
    # Step 2: Prerequisites Check
    log_step "✅ Step 2: Checking deployment prerequisites..."
    check_root
    validate_environment
    echo ""
    
    # Step 3: Repository Setup
    log_step "📁 Step 3: Setting up repository and directories..."
    setup_directories
    setup_repository
    echo ""
    
    # Step 4: Infrastructure Setup
    log_step "🔒 Step 4: Setting up infrastructure (SSL, database, etc.)..."
    setup_ssl_certificates
    setup_database
    echo ""
    
    # Step 5: Backup Current Deployment
    log_step "💾 Step 5: Creating backup of current deployment..."
    backup_current_deployment
    echo ""
    
    # Step 6: Build Application
    log_step "🔨 Step 6: Building application..."
    build_application
    echo ""
    
    # Step 7: Deploy Application
    log_step "🚀 Step 7: Deploying application..."
    deploy_application
    echo ""
    
    # Step 8: Health Check
    log_step "🏥 Step 8: Verifying application health..."
    if wait_for_health; then
        echo ""
        
        # Step 9: Final Setup
        log_step "⚙️  Step 9: Finalizing deployment (monitoring, firewall, etc.)..."
        setup_monitoring
        configure_firewall
        generate_deployment_report
        echo ""
        
        # Clear error trap on success
        trap - ERR INT TERM
        
        # Success summary
        echo "════════════════════════════════════════"
        log_success "🎉 Deployment completed successfully!"
        echo "════════════════════════════════════════"
        echo ""
        echo "📊 Service Status:"
        docker-compose ps
        echo ""
        echo "🌐 Application URLs:"
        echo "   - https://$DOMAIN (production)"
        echo "   - https://www.$DOMAIN (www redirect)"
        echo "   - http://localhost:3000 (direct, local only)"
        echo ""
        echo "📋 Management Commands:"
        echo "   - View logs: docker-compose logs -f"
        echo "   - Restart: docker-compose restart"
        echo "   - Stop: docker-compose down"
        echo "   - Monitor: systemctl status echotune-monitor"
        echo ""
        echo "📁 Important Paths:"
        echo "   - Logs: $LOG_DIR"
        echo "   - Backups: $BACKUP_DIR"
        echo "   - SSL Certificates: $SSL_DIR"
        echo ""
        echo "✨ Your EchoTune AI deployment is ready!"
    else
        echo ""
        exit_with_help "Application health check failed - deployment incomplete" \
            "The deployment process completed but the application is not responding.
This means the services started but something is preventing proper operation.
Check the diagnostic information above and troubleshoot accordingly."
    fi
}

# Run main function
main "$@"