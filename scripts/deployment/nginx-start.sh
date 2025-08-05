#!/bin/bash
set -euo pipefail

# Nginx startup script for EchoTune AI
# Handles environment variable substitution and SSL setup

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

log "Starting Nginx with EchoTune AI configuration"

# Default environment variables
export DOMAIN=${DOMAIN:-"primosphere.studio"}
export MAX_REQUEST_SIZE=${MAX_REQUEST_SIZE:-"10m"}
export API_RATE_LIMIT=${API_RATE_LIMIT:-"10r/s"}
export AUTH_RATE_LIMIT=${AUTH_RATE_LIMIT:-"5r/m"}
export GENERAL_RATE_LIMIT=${GENERAL_RATE_LIMIT:-"20r/s"}
export BACKEND_HOST=${BACKEND_HOST:-"app"}
export BACKEND_PORT=${BACKEND_PORT:-"3000"}
export SSL_CERT_PATH=${SSL_CERT_PATH:-"/etc/nginx/ssl/cert.pem"}
export SSL_KEY_PATH=${SSL_KEY_PATH:-"/etc/nginx/ssl/key.pem"}

log "Configuration:"
log "  Domain: $DOMAIN"
log "  Backend: $BACKEND_HOST:$BACKEND_PORT"
log "  SSL Cert: $SSL_CERT_PATH"
log "  Max Request Size: $MAX_REQUEST_SIZE"

# Function to substitute environment variables in config files
substitute_env_vars() {
    log "Substituting environment variables in configuration files"
    
    # Substitute variables in main nginx config
    envsubst '${MAX_REQUEST_SIZE} ${API_RATE_LIMIT} ${AUTH_RATE_LIMIT} ${GENERAL_RATE_LIMIT} ${BACKEND_HOST} ${BACKEND_PORT}' \
        < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
    
    # Substitute variables in site config
    envsubst '${DOMAIN} ${SSL_CERT_PATH} ${SSL_KEY_PATH}' \
        < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf
    
    success "Configuration files generated"
}

# Function to wait for backend service
wait_for_backend() {
    log "Waiting for backend service at $BACKEND_HOST:$BACKEND_PORT"
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if nc -z "$BACKEND_HOST" "$BACKEND_PORT" 2>/dev/null; then
            success "Backend service is available"
            return 0
        fi
        
        log "Attempt $attempt/$max_attempts: Backend not ready, waiting..."
        sleep 2
        ((attempt++))
    done
    
    error "Backend service not available after $max_attempts attempts"
    return 1
}

# Function to setup SSL certificates
setup_ssl() {
    log "Setting up SSL certificates"
    
    # Create SSL directory if it doesn't exist
    mkdir -p "$(dirname "$SSL_CERT_PATH")"
    mkdir -p "$(dirname "$SSL_KEY_PATH")"
    
    # Check if SSL certificates exist
    if [[ -f "$SSL_CERT_PATH" ]] && [[ -f "$SSL_KEY_PATH" ]]; then
        log "SSL certificates found"
        
        # Validate certificates
        if openssl x509 -in "$SSL_CERT_PATH" -text -noout >/dev/null 2>&1; then
            success "SSL certificates are valid"
        else
            warning "SSL certificates are invalid, running SSL setup"
            /scripts/ssl-setup.sh
        fi
    else
        warning "SSL certificates not found, running SSL setup"
        /scripts/ssl-setup.sh
    fi
}

# Function to test nginx configuration
test_nginx_config() {
    log "Testing Nginx configuration"
    
    if nginx -t; then
        success "Nginx configuration is valid"
        return 0
    else
        error "Nginx configuration is invalid"
        return 1
    fi
}

# Function to start nginx
start_nginx() {
    log "Starting Nginx"
    
    # Start crond for certificate renewal
    crond
    
    # Start nginx in foreground
    exec nginx -g "daemon off;"
}

# Function to handle graceful shutdown
cleanup() {
    log "Received shutdown signal, stopping services"
    
    # Stop nginx gracefully
    nginx -s quit
    
    # Stop crond
    pkill crond || true
    
    log "Services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Main execution
main() {
    log "=== Nginx Startup for EchoTune AI ==="
    
    # Substitute environment variables
    substitute_env_vars
    
    # Wait for backend to be ready (optional, with timeout)
    if [[ "${WAIT_FOR_BACKEND:-true}" == "true" ]]; then
        wait_for_backend || warning "Backend not available, continuing anyway"
    fi
    
    # Setup SSL certificates
    setup_ssl
    
    # Test nginx configuration
    if ! test_nginx_config; then
        error "Nginx configuration test failed, exiting"
        exit 1
    fi
    
    # Start nginx
    start_nginx
}

# Run main function
main "$@"