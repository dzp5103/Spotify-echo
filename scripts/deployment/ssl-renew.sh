#!/bin/bash
set -euo pipefail

# SSL Renewal Script for EchoTune AI
# Handles certificate renewal and nginx reload

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

# Load environment variables
if [[ -f /app/.env ]]; then
    source /app/.env
fi

DOMAIN=${DOMAIN:-"primosphere.studio"}
SSL_CERT_PATH=${SSL_CERT_PATH:-"/etc/nginx/ssl"}

log "Starting SSL certificate renewal for $DOMAIN"

# Function to check certificate expiry
check_cert_expiry() {
    if [[ ! -f "$SSL_CERT_PATH/cert.pem" ]]; then
        error "Certificate file not found: $SSL_CERT_PATH/cert.pem"
        return 1
    fi
    
    local expiry_date=$(openssl x509 -in "$SSL_CERT_PATH/cert.pem" -noout -enddate | cut -d= -f2)
    local days_until_expiry=$(( ($(date -d "$expiry_date" +%s) - $(date +%s)) / 86400 ))
    
    log "Certificate expires in $days_until_expiry days"
    
    # Renew if less than 30 days remaining
    if [[ $days_until_expiry -le 30 ]]; then
        log "Certificate needs renewal (expires in $days_until_expiry days)"
        return 0
    else
        log "Certificate is still valid (expires in $days_until_expiry days)"
        return 1
    fi
}

# Function to renew certificate
renew_certificate() {
    log "Attempting to renew SSL certificate"
    
    # Check if certbot is available
    if ! command -v certbot &> /dev/null; then
        error "Certbot is not installed"
        return 1
    fi
    
    # Attempt renewal
    if certbot renew --quiet --webroot --webroot-path=/var/www/certbot; then
        log "Certbot renewal successful"
        
        # Copy renewed certificates
        if [[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
            cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_CERT_PATH/cert.pem"
            cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_CERT_PATH/key.pem"
            
            # Set proper permissions
            chmod 644 "$SSL_CERT_PATH/cert.pem"
            chmod 600 "$SSL_CERT_PATH/key.pem"
            
            success "Certificate files updated"
            return 0
        else
            error "Renewed certificate files not found"
            return 1
        fi
    else
        error "Certbot renewal failed"
        return 1
    fi
}

# Function to reload nginx
reload_nginx() {
    log "Reloading nginx configuration"
    
    # Test nginx configuration first
    if nginx -t >/dev/null 2>&1; then
        # Reload nginx
        if nginx -s reload; then
            success "Nginx reloaded successfully"
            return 0
        else
            error "Failed to reload nginx"
            return 1
        fi
    else
        error "Nginx configuration test failed"
        return 1
    fi
}

# Function to send notification (placeholder for future implementation)
send_notification() {
    local status="$1"
    local message="$2"
    
    # Log the notification
    if [[ "$status" == "success" ]]; then
        success "NOTIFICATION: $message"
    else
        error "NOTIFICATION: $message"
    fi
    
    # Future: Send to Slack, email, or other notification services
    # if [[ -n "${SLACK_WEBHOOK:-}" ]]; then
    #     curl -X POST -H 'Content-type: application/json' \
    #         --data '{"text":"'"$message"'"}' \
    #         "$SLACK_WEBHOOK"
    # fi
}

# Main renewal process
main() {
    log "=== SSL Certificate Renewal Process ==="
    
    # Check if renewal is needed
    if check_cert_expiry; then
        if renew_certificate; then
            if reload_nginx; then
                send_notification "success" "SSL certificate renewed successfully for $DOMAIN"
                success "SSL renewal process completed successfully"
                exit 0
            else
                send_notification "error" "SSL certificate renewed but nginx reload failed for $DOMAIN"
                error "Nginx reload failed after certificate renewal"
                exit 1
            fi
        else
            send_notification "error" "SSL certificate renewal failed for $DOMAIN"
            error "Certificate renewal failed"
            exit 1
        fi
    else
        log "Certificate renewal not needed"
        exit 0
    fi
}

# Handle script arguments
case "${1:-}" in
    --force)
        log "Forcing certificate renewal"
        if renew_certificate && reload_nginx; then
            success "Forced renewal completed"
        else
            error "Forced renewal failed"
            exit 1
        fi
        ;;
    --check-only)
        log "Checking certificate expiry only"
        check_cert_expiry
        ;;
    *)
        main
        ;;
esac