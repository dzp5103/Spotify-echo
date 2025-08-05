#!/bin/bash

# SSL Certificate Setup Script for EchoTune AI
# Automated Let's Encrypt certificate generation and renewal setup

set -euo pipefail

# Configuration
DOMAIN="${DOMAIN:-localhost}"
EMAIL="${LETSENCRYPT_EMAIL:-admin@${DOMAIN}}"
WEBROOT_PATH="${WEBROOT_PATH:-/var/www/certbot}"
CERT_PATH="${CERT_PATH:-/etc/nginx/ssl}"
NGINX_CONF_PATH="${NGINX_CONF_PATH:-/etc/nginx/conf.d}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[SSL-SETUP]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if running as root
check_permissions() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root for SSL certificate management"
        exit 1
    fi
}

# Install certbot if not available
install_certbot() {
    if ! command -v certbot &> /dev/null; then
        log "Installing certbot..."
        if command -v apt &> /dev/null; then
            apt update
            apt install -y certbot python3-certbot-nginx
        elif command -v yum &> /dev/null; then
            yum install -y certbot python3-certbot-nginx
        elif command -v apk &> /dev/null; then
            apk add --no-cache certbot certbot-nginx
        else
            log_error "Package manager not supported. Please install certbot manually."
            exit 1
        fi
        log_success "Certbot installed successfully"
    else
        log "Certbot already installed"
    fi
}

# Create necessary directories
setup_directories() {
    log "Setting up SSL directories..."
    mkdir -p "$WEBROOT_PATH" "$CERT_PATH" "$NGINX_CONF_PATH"
    chmod 755 "$WEBROOT_PATH"
    log_success "SSL directories created"
}

# Create temporary nginx configuration for ACME challenge
create_temp_nginx_config() {
    log "Creating temporary nginx configuration for ACME challenge..."
    
    cat > "$NGINX_CONF_PATH/temp-ssl-setup.conf" << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    # ACME challenge location
    location /.well-known/acme-challenge/ {
        root $WEBROOT_PATH;
        try_files \$uri =404;
    }
    
    # Temporary location for other requests
    location / {
        return 200 'SSL setup in progress. Please wait...';
        add_header Content-Type text/plain;
    }
}
EOF
    
    # Test and reload nginx
    nginx -t && nginx -s reload
    log_success "Temporary nginx configuration created"
}

# Generate SSL certificate
generate_ssl_certificate() {
    log "Generating SSL certificate for $DOMAIN..."
    
    # Check if certificate already exists
    if [[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
        log_warning "Certificate already exists for $DOMAIN"
        
        # Check if certificate is valid and not expiring soon
        if openssl x509 -checkend 2592000 -noout -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" 2>/dev/null; then
            log_success "Existing certificate is valid and not expiring soon"
            copy_certificates
            return 0
        else
            log_warning "Certificate is expiring soon, renewing..."
        fi
    fi
    
    # Obtain certificate using webroot method
    if certbot certonly \
        --webroot \
        --webroot-path="$WEBROOT_PATH" \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        --non-interactive \
        --expand \
        --domains "$DOMAIN"; then
        
        log_success "SSL certificate generated successfully"
        copy_certificates
        setup_certificate_renewal
        
    else
        log_error "Failed to generate SSL certificate"
        create_self_signed_certificate
        return 1
    fi
}

# Copy certificates to nginx directory
copy_certificates() {
    log "Copying certificates to nginx directory..."
    
    if [[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
        cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$CERT_PATH/$DOMAIN.crt"
        cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$CERT_PATH/$DOMAIN.key"
        cp "/etc/letsencrypt/live/$DOMAIN/chain.pem" "$CERT_PATH/chain.pem" 2>/dev/null || true
        
        # Set proper permissions
        chmod 644 "$CERT_PATH/$DOMAIN.crt"
        chmod 600 "$CERT_PATH/$DOMAIN.key"
        chmod 644 "$CERT_PATH/chain.pem" 2>/dev/null || true
        
        log_success "Certificates copied to $CERT_PATH"
    else
        log_error "Certificate files not found"
        return 1
    fi
}

# Create self-signed certificate as fallback
create_self_signed_certificate() {
    log_warning "Creating self-signed certificate as fallback..."
    
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$CERT_PATH/$DOMAIN.key" \
        -out "$CERT_PATH/$DOMAIN.crt" \
        -subj "/C=US/ST=CA/L=San Francisco/O=EchoTune AI/CN=$DOMAIN" \
        2>/dev/null
    
    chmod 644 "$CERT_PATH/$DOMAIN.crt"
    chmod 600 "$CERT_PATH/$DOMAIN.key"
    
    log_warning "Self-signed certificate created. Consider obtaining a proper SSL certificate later."
}

# Setup automatic certificate renewal
setup_certificate_renewal() {
    log "Setting up automatic certificate renewal..."
    
    # Create renewal script
    cat > /usr/local/bin/echotune-ssl-renew.sh << 'EOF'
#!/bin/bash
# EchoTune AI SSL Certificate Renewal Script

DOMAIN="${1:-$(hostname -f)}"
CERT_PATH="${CERT_PATH:-/etc/nginx/ssl}"

# Renew certificates
if certbot renew --quiet --webroot --webroot-path=/var/www/certbot; then
    echo "$(date): Certificate renewal successful for $DOMAIN"
    
    # Copy renewed certificates
    if [[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
        cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$CERT_PATH/$DOMAIN.crt"
        cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$CERT_PATH/$DOMAIN.key"
        
        # Reload nginx
        nginx -t && nginx -s reload
        echo "$(date): Nginx reloaded with renewed certificates"
    fi
else
    echo "$(date): Certificate renewal failed for $DOMAIN"
    exit 1
fi
EOF
    
    chmod +x /usr/local/bin/echotune-ssl-renew.sh
    
    # Add cron job for automatic renewal
    cron_job="0 2 * * 1 /usr/local/bin/echotune-ssl-renew.sh $DOMAIN >> /var/log/ssl-renewal.log 2>&1"
    
    # Add to crontab if not already present
    if ! crontab -l 2>/dev/null | grep -q "echotune-ssl-renew.sh"; then
        (crontab -l 2>/dev/null; echo "$cron_job") | crontab -
        log_success "SSL certificate auto-renewal configured"
    else
        log "SSL auto-renewal already configured"
    fi
}

# Remove temporary configuration
cleanup_temp_config() {
    log "Cleaning up temporary configuration..."
    rm -f "$NGINX_CONF_PATH/temp-ssl-setup.conf"
    nginx -s reload 2>/dev/null || true
    log_success "Temporary configuration removed"
}

# Validate SSL certificate
validate_ssl_certificate() {
    log "Validating SSL certificate..."
    
    if [[ -f "$CERT_PATH/$DOMAIN.crt" ]] && [[ -f "$CERT_PATH/$DOMAIN.key" ]]; then
        # Check certificate validity
        if openssl x509 -noout -in "$CERT_PATH/$DOMAIN.crt" 2>/dev/null; then
            local expiry_date
            expiry_date=$(openssl x509 -enddate -noout -in "$CERT_PATH/$DOMAIN.crt" | cut -d= -f2)
            log_success "SSL certificate is valid. Expires: $expiry_date"
            
            # Check if key matches certificate
            cert_md5=$(openssl x509 -noout -modulus -in "$CERT_PATH/$DOMAIN.crt" | openssl md5)
            key_md5=$(openssl rsa -noout -modulus -in "$CERT_PATH/$DOMAIN.key" 2>/dev/null | openssl md5)
            
            if [[ "$cert_md5" == "$key_md5" ]]; then
                log_success "Certificate and private key match"
                return 0
            else
                log_error "Certificate and private key do not match"
                return 1
            fi
        else
            log_error "Invalid certificate file"
            return 1
        fi
    else
        log_error "Certificate files not found"
        return 1
    fi
}

# Display certificate information
show_certificate_info() {
    if [[ -f "$CERT_PATH/$DOMAIN.crt" ]]; then
        echo ""
        echo "📜 SSL Certificate Information:"
        echo "   Domain: $DOMAIN"
        echo "   Certificate: $CERT_PATH/$DOMAIN.crt"
        echo "   Private Key: $CERT_PATH/$DOMAIN.key"
        
        # Show certificate details
        local issuer
        issuer=$(openssl x509 -issuer -noout -in "$CERT_PATH/$DOMAIN.crt" | cut -d= -f2-)
        local expiry
        expiry=$(openssl x509 -enddate -noout -in "$CERT_PATH/$DOMAIN.crt" | cut -d= -f2)
        
        echo "   Issuer: $issuer"
        echo "   Expires: $expiry"
        
        # Check days until expiry
        local expiry_epoch
        expiry_epoch=$(date -d "$expiry" +%s 2>/dev/null || echo "0")
        local current_epoch
        current_epoch=$(date +%s)
        local days_left
        days_left=$(( (expiry_epoch - current_epoch) / 86400 ))
        
        if [[ $days_left -gt 30 ]]; then
            echo -e "   Status: ${GREEN}Valid ($days_left days remaining)${NC}"
        elif [[ $days_left -gt 7 ]]; then
            echo -e "   Status: ${YELLOW}Expiring soon ($days_left days remaining)${NC}"
        else
            echo -e "   Status: ${RED}Expires very soon ($days_left days remaining)${NC}"
        fi
    fi
}

# Main execution
main() {
    log "🔒 Starting SSL certificate setup for $DOMAIN"
    
    # Validate domain
    if [[ "$DOMAIN" == "localhost" ]] || [[ "$DOMAIN" == *.nip.io ]]; then
        log_warning "Domain $DOMAIN is not suitable for Let's Encrypt. Creating self-signed certificate."
        setup_directories
        create_self_signed_certificate
        validate_ssl_certificate
        show_certificate_info
        return 0
    fi
    
    check_permissions
    install_certbot
    setup_directories
    create_temp_nginx_config
    
    # Try to generate SSL certificate
    if generate_ssl_certificate; then
        log_success "SSL certificate setup completed successfully"
    else
        log_warning "SSL certificate generation failed, using self-signed certificate"
    fi
    
    cleanup_temp_config
    validate_ssl_certificate
    show_certificate_info
    
    echo ""
    log_success "🎉 SSL setup completed for $DOMAIN"
    echo ""
    echo "Next steps:"
    echo "1. Update nginx configuration to use SSL"
    echo "2. Test SSL configuration: https://$DOMAIN"
    echo "3. Check SSL grade: https://www.ssllabs.com/ssltest/"
}

# Handle script arguments
case "${1:-setup}" in
    "setup")
        main
        ;;
    "renew")
        setup_certificate_renewal
        /usr/local/bin/echotune-ssl-renew.sh "$DOMAIN"
        ;;
    "validate")
        validate_ssl_certificate && show_certificate_info
        ;;
    "info")
        show_certificate_info
        ;;
    *)
        echo "Usage: $0 [setup|renew|validate|info]"
        echo "  setup   - Generate SSL certificate and setup renewal"
        echo "  renew   - Manually renew SSL certificate"
        echo "  validate - Validate existing SSL certificate"
        echo "  info    - Show certificate information"
        exit 1
        ;;
esac
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Load environment variables
if [[ -f /app/.env ]]; then
    source /app/.env
else
    warning "No .env file found, using environment variables"
fi

# Required environment variables
DOMAIN=${DOMAIN:-"primosphere.studio"}
LETSENCRYPT_EMAIL=${LETSENCRYPT_EMAIL:-"admin@primosphere.studio"}
SSL_CERT_PATH=${SSL_CERT_PATH:-"/etc/nginx/ssl"}
STAGING=${STAGING:-"false"}

log "Starting SSL setup for domain: $DOMAIN"

# Create necessary directories
mkdir -p "$SSL_CERT_PATH"
mkdir -p /var/www/certbot
mkdir -p /etc/letsencrypt/live
mkdir -p /var/log/letsencrypt

# Function to generate self-signed certificate for initial setup
generate_self_signed() {
    log "Generating self-signed certificate for initial setup..."
    
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$SSL_CERT_PATH/key.pem" \
        -out "$SSL_CERT_PATH/cert.pem" \
        -subj "/C=US/ST=CA/L=San Francisco/O=EchoTune AI/CN=$DOMAIN"
    
    success "Self-signed certificate generated"
}

# Function to check if domain is reachable
check_domain_reachability() {
    log "Checking domain reachability: $DOMAIN"
    
    if ! nslookup "$DOMAIN" >/dev/null 2>&1; then
        error "Domain $DOMAIN is not reachable via DNS"
        return 1
    fi
    
    success "Domain $DOMAIN is reachable"
    return 0
}

# Function to obtain Let's Encrypt certificate
obtain_letsencrypt_cert() {
    log "Obtaining Let's Encrypt certificate for $DOMAIN"
    
    # Prepare certbot arguments
    local certbot_args=(
        "certonly"
        "--webroot"
        "--webroot-path=/var/www/certbot"
        "--email=$LETSENCRYPT_EMAIL"
        "--agree-tos"
        "--no-eff-email"
        "--force-renewal"
        "-d" "$DOMAIN"
        "-d" "www.$DOMAIN"
    )
    
    # Add staging flag if specified
    if [[ "$STAGING" == "true" ]]; then
        certbot_args+=("--staging")
        warning "Using Let's Encrypt staging environment"
    fi
    
    # Run certbot
    if certbot "${certbot_args[@]}"; then
        # Copy certificates to nginx directory
        cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_CERT_PATH/cert.pem"
        cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_CERT_PATH/key.pem"
        
        # Set proper permissions
        chmod 644 "$SSL_CERT_PATH/cert.pem"
        chmod 600 "$SSL_CERT_PATH/key.pem"
        
        success "Let's Encrypt certificate obtained and installed"
        return 0
    else
        error "Failed to obtain Let's Encrypt certificate"
        return 1
    fi
}

# Function to setup certificate renewal
setup_renewal() {
    log "Setting up automatic certificate renewal"
    
    # Create renewal script
    cat > /scripts/ssl-renew.sh << 'EOF'
#!/bin/bash
set -euo pipefail

# Renew certificates
certbot renew --quiet --webroot --webroot-path=/var/www/certbot

# Copy renewed certificates if successful
if [[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
    cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_CERT_PATH/cert.pem"
    cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_CERT_PATH/key.pem"
    
    # Reload nginx
    nginx -s reload
    
    echo "SSL certificates renewed successfully"
else
    echo "Certificate renewal failed"
    exit 1
fi
EOF
    
    chmod +x /scripts/ssl-renew.sh
    
    # Add cron job for renewal (runs twice daily)
    echo "0 12 * * * /scripts/ssl-renew.sh >> /var/log/letsencrypt/renewal.log 2>&1" | crontab -
    
    success "Automatic renewal configured"
}

# Function to validate certificate
validate_certificate() {
    log "Validating SSL certificate"
    
    if [[ ! -f "$SSL_CERT_PATH/cert.pem" ]] || [[ ! -f "$SSL_CERT_PATH/key.pem" ]]; then
        error "SSL certificate files not found"
        return 1
    fi
    
    # Check certificate validity
    if openssl x509 -in "$SSL_CERT_PATH/cert.pem" -text -noout >/dev/null 2>&1; then
        local expiry_date=$(openssl x509 -in "$SSL_CERT_PATH/cert.pem" -noout -enddate | cut -d= -f2)
        local days_until_expiry=$(( ($(date -d "$expiry_date" +%s) - $(date +%s)) / 86400 ))
        
        if [[ $days_until_expiry -gt 30 ]]; then
            success "SSL certificate is valid (expires in $days_until_expiry days)"
            return 0
        else
            warning "SSL certificate expires in $days_until_expiry days - renewal recommended"
            return 0
        fi
    else
        error "SSL certificate is invalid"
        return 1
    fi
}

# Main execution
main() {
    log "=== SSL Setup for EchoTune AI ==="
    log "Domain: $DOMAIN"
    log "Email: $LETSENCRYPT_EMAIL"
    log "SSL Path: $SSL_CERT_PATH"
    
    # Check if we're in a production environment
    if [[ "$STAGING" != "true" ]] && ! check_domain_reachability; then
        warning "Domain not reachable, generating self-signed certificate"
        generate_self_signed
        return 0
    fi
    
    # Try to obtain Let's Encrypt certificate
    if obtain_letsencrypt_cert; then
        setup_renewal
        validate_certificate
    else
        warning "Let's Encrypt failed, falling back to self-signed certificate"
        generate_self_signed
    fi
    
    success "SSL setup completed"
}

# Run main function
main "$@"