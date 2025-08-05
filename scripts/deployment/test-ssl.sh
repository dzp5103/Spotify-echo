#!/bin/bash
set -euo pipefail

# SSL Certificate Validation Script for EchoTune AI
# Quickly checks SSL certificate validity and expiry for production domain

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Logging functions
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

header() {
    echo -e "${BOLD}${BLUE}=== $1 ===${NC}"
}

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load environment variables
if [[ -f "$PROJECT_ROOT/.env" ]]; then
    source "$PROJECT_ROOT/.env"
elif [[ -f "$PROJECT_ROOT/.env.production.example" ]]; then
    warning "No .env found, using .env.production.example"
    source "$PROJECT_ROOT/.env.production.example"
fi

# Configuration
DOMAIN=${DOMAIN:-"primosphere.studio"}
SSL_CERT_PATH=${SSL_CERT_PATH:-"/etc/nginx/ssl"}
TIMEOUT=${TIMEOUT:-10}

# Function to check local SSL certificate files
check_local_ssl_files() {
    header "Local SSL Certificate Files"
    
    local cert_file="$SSL_CERT_PATH/cert.pem"
    local key_file="$SSL_CERT_PATH/key.pem"
    
    # Check if files exist
    if [[ ! -f "$cert_file" ]]; then
        error "Certificate file not found: $cert_file"
        return 1
    fi
    
    if [[ ! -f "$key_file" ]]; then
        error "Key file not found: $key_file"
        return 1
    fi
    
    success "SSL files found"
    
    # Check certificate validity
    if ! openssl x509 -in "$cert_file" -text -noout >/dev/null 2>&1; then
        error "Certificate file is invalid or corrupted"
        return 1
    fi
    
    # Get certificate information
    local subject=$(openssl x509 -in "$cert_file" -noout -subject | sed 's/subject= //')
    local issuer=$(openssl x509 -in "$cert_file" -noout -issuer | sed 's/issuer= //')
    local not_before=$(openssl x509 -in "$cert_file" -noout -startdate | cut -d= -f2)
    local not_after=$(openssl x509 -in "$cert_file" -noout -enddate | cut -d= -f2)
    
    echo "Certificate Details:"
    echo "  Subject: $subject"
    echo "  Issuer: $issuer"
    echo "  Valid From: $not_before"
    echo "  Valid Until: $not_after"
    
    # Check expiry
    local expiry_timestamp=$(date -d "$not_after" +%s)
    local current_timestamp=$(date +%s)
    local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
    
    if [[ $days_until_expiry -lt 0 ]]; then
        error "Certificate has EXPIRED ($days_until_expiry days ago)"
        return 1
    elif [[ $days_until_expiry -lt 7 ]]; then
        warning "Certificate expires in $days_until_expiry days - RENEWAL URGENT"
    elif [[ $days_until_expiry -lt 30 ]]; then
        warning "Certificate expires in $days_until_expiry days - renewal recommended"
    else
        success "Certificate is valid for $days_until_expiry days"
    fi
    
    # Check certificate-key pair match
    local cert_modulus=$(openssl x509 -in "$cert_file" -noout -modulus | md5sum)
    local key_modulus=$(openssl rsa -in "$key_file" -noout -modulus 2>/dev/null | md5sum)
    
    if [[ "$cert_modulus" == "$key_modulus" ]]; then
        success "Certificate and key pair match"
    else
        error "Certificate and key pair do NOT match"
        return 1
    fi
    
    return 0
}

# Function to check remote SSL certificate (what browsers see)
check_remote_ssl() {
    header "Remote SSL Certificate (Browser View)"
    
    log "Checking SSL certificate for https://$DOMAIN"
    
    # Check if domain is reachable
    if ! host "$DOMAIN" >/dev/null 2>&1; then
        error "Domain $DOMAIN is not resolvable"
        return 1
    fi
    
    # Get certificate information from the server
    local cert_info
    if cert_info=$(echo | timeout "$TIMEOUT" openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -text 2>/dev/null); then
        
        # Extract certificate details
        local subject=$(echo "$cert_info" | grep "Subject:" | sed 's/.*Subject: //')
        local issuer=$(echo "$cert_info" | grep "Issuer:" | sed 's/.*Issuer: //')
        local not_before=$(echo "$cert_info" | grep "Not Before:" | sed 's/.*Not Before: //')
        local not_after=$(echo "$cert_info" | grep "Not After :" | sed 's/.*Not After : //')
        
        echo "Remote Certificate Details:"
        echo "  Subject: $subject"
        echo "  Issuer: $issuer"
        echo "  Valid From: $not_before"
        echo "  Valid Until: $not_after"
        
        # Check expiry
        local expiry_timestamp=$(date -d "$not_after" +%s 2>/dev/null || echo "0")
        if [[ "$expiry_timestamp" -gt 0 ]]; then
            local current_timestamp=$(date +%s)
            local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
            
            if [[ $days_until_expiry -lt 0 ]]; then
                error "Remote certificate has EXPIRED ($days_until_expiry days ago)"
                return 1
            elif [[ $days_until_expiry -lt 7 ]]; then
                warning "Remote certificate expires in $days_until_expiry days - RENEWAL URGENT"
            elif [[ $days_until_expiry -lt 30 ]]; then
                warning "Remote certificate expires in $days_until_expiry days - renewal recommended"
            else
                success "Remote certificate is valid for $days_until_expiry days"
            fi
        fi
        
        # Check if certificate is trusted
        if echo | timeout "$TIMEOUT" openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" -verify_return_error >/dev/null 2>&1; then
            success "Certificate is trusted by browsers"
        else
            warning "Certificate may not be trusted by browsers (self-signed or invalid chain)"
        fi
        
    else
        error "Failed to retrieve remote certificate"
        return 1
    fi
    
    return 0
}

# Function to check SSL configuration
check_ssl_config() {
    header "SSL Configuration Analysis"
    
    # Check SSL protocols and ciphers
    log "Analyzing SSL/TLS configuration..."
    
    # Test TLS versions
    local tls_versions=("1.2" "1.3")
    for version in "${tls_versions[@]}"; do
        if echo | timeout "$TIMEOUT" openssl s_client -tls"$version" -servername "$DOMAIN" -connect "$DOMAIN:443" >/dev/null 2>&1; then
            success "TLS $version is supported"
        else
            log "TLS $version is not supported"
        fi
    done
    
    # Check for weak protocols (should fail)
    local weak_versions=("1.0" "1.1")
    for version in "${weak_versions[@]}"; do
        if echo | timeout "$TIMEOUT" openssl s_client -tls"$version" -servername "$DOMAIN" -connect "$DOMAIN:443" >/dev/null 2>&1; then
            warning "Weak TLS $version is still supported - security risk"
        else
            success "Weak TLS $version is properly disabled"
        fi
    done
    
    # Check HSTS header
    local hsts_header
    if hsts_header=$(curl -s -I "https://$DOMAIN" --max-time "$TIMEOUT" 2>/dev/null | grep -i "strict-transport-security"); then
        success "HSTS header is present: $hsts_header"
    else
        warning "HSTS header is missing"
    fi
    
    return 0
}

# Function to check certificate transparency logs
check_certificate_transparency() {
    header "Certificate Transparency Check"
    
    log "Checking certificate in CT logs..."
    
    # Simple check using crt.sh (if available)
    if command -v curl >/dev/null 2>&1; then
        local ct_results
        if ct_results=$(curl -s "https://crt.sh/?q=$DOMAIN&output=json" --max-time "$TIMEOUT" 2>/dev/null | head -1); then
            if [[ -n "$ct_results" ]] && [[ "$ct_results" != "[]" ]]; then
                success "Certificate found in CT logs"
            else
                warning "Certificate not found in CT logs (may be new)"
            fi
        else
            log "Unable to check CT logs (network issue or service unavailable)"
        fi
    else
        log "Curl not available, skipping CT log check"
    fi
    
    return 0
}

# Function to perform quick SSL test
quick_ssl_test() {
    log "Performing quick SSL connectivity test..."
    
    # Simple connection test
    if timeout "$TIMEOUT" bash -c "</dev/tcp/$DOMAIN/443" 2>/dev/null; then
        success "SSL port 443 is reachable"
    else
        error "SSL port 443 is not reachable"
        return 1
    fi
    
    # HTTP to HTTPS redirect test
    local redirect_status
    if redirect_status=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN" --max-time "$TIMEOUT" 2>/dev/null); then
        if [[ "$redirect_status" == "301" ]] || [[ "$redirect_status" == "302" ]]; then
            success "HTTP to HTTPS redirect is working (status: $redirect_status)"
        else
            warning "HTTP to HTTPS redirect may not be working (status: $redirect_status)"
        fi
    else
        warning "Unable to test HTTP to HTTPS redirect"
    fi
    
    return 0
}

# Function to generate SSL summary report
generate_ssl_report() {
    header "SSL Certificate Summary"
    echo
    echo -e "${BOLD}Domain:${NC} $DOMAIN"
    echo -e "${BOLD}Timestamp:${NC} $(date)"
    echo -e "${BOLD}Check Type:${NC} ${CHECK_TYPE:-"Full SSL Check"}"
    echo
    
    # Quick overall status
    if check_remote_ssl >/dev/null 2>&1; then
        echo -e "${BOLD}Overall Status:${NC} ${GREEN}✅ SSL is working${NC}"
    else
        echo -e "${BOLD}Overall Status:${NC} ${RED}❌ SSL has issues${NC}"
    fi
    
    echo
    echo "For detailed information, run the full check."
}

# Main execution function
main() {
    header "SSL Certificate Validation for EchoTune AI"
    echo "Domain: $DOMAIN"
    echo
    
    local overall_status=0
    
    # Check local SSL files
    if ! check_local_ssl_files; then
        overall_status=1
    fi
    
    echo
    
    # Check remote SSL certificate
    if ! check_remote_ssl; then
        overall_status=1
    fi
    
    echo
    
    # Check SSL configuration
    if ! check_ssl_config; then
        overall_status=1
    fi
    
    echo
    
    # Check certificate transparency
    check_certificate_transparency
    
    echo
    
    # Final status
    if [[ $overall_status -eq 0 ]]; then
        success "All SSL checks passed"
    else
        error "Some SSL checks failed"
    fi
    
    return $overall_status
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [--quick] [--local-only] [--remote-only] [--config-only]"
        echo "  --quick       Quick connectivity test only"
        echo "  --local-only  Check local certificate files only"
        echo "  --remote-only Check remote certificate only"
        echo "  --config-only Check SSL configuration only"
        echo "  --summary     Generate summary report only"
        exit 0
        ;;
    --quick)
        CHECK_TYPE="Quick Test"
        quick_ssl_test
        ;;
    --local-only)
        CHECK_TYPE="Local Files Only"
        check_local_ssl_files
        ;;
    --remote-only)
        CHECK_TYPE="Remote Certificate Only"
        check_remote_ssl
        ;;
    --config-only)
        CHECK_TYPE="SSL Configuration Only"
        check_ssl_config
        ;;
    --summary)
        CHECK_TYPE="Summary Report"
        generate_ssl_report
        ;;
    *)
        main
        ;;
esac