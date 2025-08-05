#!/bin/bash

# DigitalOcean Deployment Configuration Validator
# Validates GitHub Actions workflow configuration and prerequisites

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Configuration - Get the repository root directory
if [[ -n "${GITHUB_WORKSPACE:-}" ]]; then
    REPO_ROOT="$GITHUB_WORKSPACE"
elif git rev-parse --show-toplevel &>/dev/null; then
    REPO_ROOT="$(git rev-parse --show-toplevel)"
else
    REPO_ROOT="$(pwd)"
fi

WORKFLOWS_DIR="${REPO_ROOT}/.github/workflows"
REQUIRED_WORKFLOWS=("digitalocean-deploy.yml" "reusable-docker-build.yml" "reusable-do-deploy.yml")
REQUIRED_FILES=("Dockerfile" "Dockerfile.nginx" "mcp-server/Dockerfile" "app.yaml")
OPTIONAL_FILES=("app-platform.yaml" ".env.production.example")

# Validation functions
validate_prerequisites() {
    log_info "Validating prerequisites..."
    
    # Check if running in Git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "Not in a Git repository"
        return 1
    fi
    
    # Check required tools
    local tools=("docker" "curl" "jq")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_warning "$tool not found (optional for validation)"
        else
            log_success "$tool found"
        fi
    done
    
    return 0
}

validate_workflow_files() {
    log_info "Validating workflow files..."
    
    # Check if workflows directory exists
    if [[ ! -d "$WORKFLOWS_DIR" ]]; then
        log_error "Workflows directory not found: $WORKFLOWS_DIR"
        return 1
    fi
    
    # Check required workflow files
    for workflow in "${REQUIRED_WORKFLOWS[@]}"; do
        local workflow_path="$WORKFLOWS_DIR/$workflow"
        if [[ -f "$workflow_path" ]]; then
            log_success "Found workflow: $workflow"
            
            # Basic YAML syntax validation
            if command -v yq &> /dev/null; then
                if yq eval '.' "$workflow_path" > /dev/null 2>&1; then
                    log_success "YAML syntax valid: $workflow"
                else
                    log_error "YAML syntax error in: $workflow"
                    return 1
                fi
            fi
        else
            log_error "Missing workflow: $workflow"
            return 1
        fi
    done
    
    return 0
}

validate_docker_files() {
    log_info "Validating Docker files..."
    
    # Check required files
    for dockerfile in "${REQUIRED_FILES[@]}"; do
        local dockerfile_path="$REPO_ROOT/$dockerfile"
        if [[ -f "$dockerfile_path" ]]; then
            log_success "Found: $dockerfile"
            
            # Basic Dockerfile validation
            if command -v docker &> /dev/null; then
                # Check for obvious syntax issues
                if grep -q "^FROM " "$dockerfile_path"; then
                    log_success "Valid Dockerfile structure: $dockerfile"
                else
                    log_warning "Potential Dockerfile issue: $dockerfile (no FROM instruction found)"
                fi
            fi
        else
            log_error "Required file missing: $dockerfile"
            return 1
        fi
    done
    
    # Check optional files
    for file in "${OPTIONAL_FILES[@]}"; do
        local file_path="$REPO_ROOT/$file"
        if [[ -f "$file_path" ]]; then
            log_success "Found optional file: $file"
        else
            log_warning "Optional file missing: $file"
        fi
    done
    
    return 0
}

validate_app_configuration() {
    log_info "Validating DigitalOcean App Platform configuration..."
    
    local app_files=("app.yaml" "app-platform.yaml")
    
    for app_file in "${app_files[@]}"; do
        local app_path="$REPO_ROOT/$app_file"
        if [[ -f "$app_path" ]]; then
            log_success "Found app configuration: $app_file"
            
            # Validate YAML syntax
            if command -v yq &> /dev/null; then
                if yq eval '.' "$app_path" > /dev/null 2>&1; then
                    log_success "Valid YAML syntax: $app_file"
                    
                    # Check for required fields
                    if yq eval '.name' "$app_path" > /dev/null 2>&1; then
                        local app_name=$(yq eval '.name' "$app_path")
                        log_success "App name defined: $app_name"
                    else
                        log_warning "No app name defined in: $app_file"
                    fi
                    
                    if yq eval '.services' "$app_path" > /dev/null 2>&1; then
                        local service_count=$(yq eval '.services | length' "$app_path")
                        log_success "Services defined: $service_count"
                    else
                        log_warning "No services defined in: $app_file"
                    fi
                else
                    log_error "YAML syntax error in: $app_file"
                    return 1
                fi
            fi
        fi
    done
    
    return 0
}

validate_environment_variables() {
    log_info "Validating environment variable configuration..."
    
    local env_files=(".env.production.example" ".env.example")
    local found_env_example=false
    
    for env_file in "${env_files[@]}"; do
        local env_path="$REPO_ROOT/$env_file"
        if [[ -f "$env_path" ]]; then
            log_success "Found environment example: $env_file"
            found_env_example=true
            
            # Check for required environment variables
            local required_vars=("SPOTIFY_CLIENT_ID" "SPOTIFY_CLIENT_SECRET" "SESSION_SECRET" "JWT_SECRET")
            for var in "${required_vars[@]}"; do
                if grep -q "^$var=" "$env_path" || grep -q "^#.*$var=" "$env_path"; then
                    log_success "Environment variable documented: $var"
                else
                    log_warning "Environment variable not documented: $var"
                fi
            done
        fi
    done
    
    if [[ "$found_env_example" == false ]]; then
        log_warning "No environment example file found"
    fi
    
    return 0
}

validate_secrets_documentation() {
    log_info "Validating secrets documentation..."
    
    local docs=("README.md" "DEPLOYMENT.md")
    local found_secrets_docs=false
    
    for doc in "${docs[@]}"; do
        local doc_path="$REPO_ROOT/$doc"
        if [[ -f "$doc_path" ]]; then
            # Check if secrets are documented
            if grep -qi "secrets" "$doc_path" && grep -qi "digitalocean" "$doc_path"; then
                log_success "Secrets documented in: $doc"
                found_secrets_docs=true
            fi
        fi
    done
    
    if [[ "$found_secrets_docs" == false ]]; then
        log_warning "Secrets configuration not documented"
    fi
    
    return 0
}

generate_deployment_report() {
    log_info "Generating deployment readiness report..."
    
    cat << EOF

📋 DIGITALOCEAN DEPLOYMENT READINESS REPORT
============================================

Repository: $(git remote get-url origin 2>/dev/null || echo "Unknown")
Branch: $(git branch --show-current 2>/dev/null || echo "Unknown")
Commit: $(git rev-parse --short HEAD 2>/dev/null || echo "Unknown")

Required GitHub Secrets:
• DIGITALOCEAN_ACCESS_TOKEN
• DO_REGISTRY_TOKEN
• SPOTIFY_CLIENT_ID
• SPOTIFY_CLIENT_SECRET
• SESSION_SECRET
• JWT_SECRET

Optional GitHub Secrets:
• DIGITALOCEAN_APP_ID
• MONGODB_URI
• GEMINI_API_KEY
• OPENAI_API_KEY

Deployment Process:
1. Configure GitHub secrets in repository settings
2. Push to main branch or trigger workflow manually
3. Monitor deployment in GitHub Actions
4. Verify application at deployed URL

Next Steps:
• Set up DigitalOcean account and generate tokens
• Configure GitHub repository secrets
• Test deployment with workflow_dispatch trigger
• Set up custom domain and DNS

EOF
}

# Main execution
main() {
    echo -e "${BLUE}"
    echo "🚀 DigitalOcean Deployment Configuration Validator"
    echo "================================================="
    echo -e "${NC}"
    
    local validation_failed=false
    
    # Run all validations
    validate_prerequisites || validation_failed=true
    echo
    validate_workflow_files || validation_failed=true
    echo
    validate_docker_files || validation_failed=true
    echo
    validate_app_configuration || validation_failed=true
    echo
    validate_environment_variables || validation_failed=true
    echo
    validate_secrets_documentation || validation_failed=true
    echo
    
    if [[ "$validation_failed" == true ]]; then
        log_error "Validation failed! Please fix the issues above."
        exit 1
    else
        log_success "All validations passed! Repository is ready for DigitalOcean deployment."
        echo
        generate_deployment_report
        exit 0
    fi
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi