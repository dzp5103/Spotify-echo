#!/bin/bash

# 🔧 EchoTune AI - Deployment Utilities Library
# Shared utilities for robust, consistent deployment across all scripts

# Ensure this library is only sourced once
if [[ "${DEPLOYMENT_UTILS_LOADED:-}" == "true" ]]; then
    return 0
fi
export DEPLOYMENT_UTILS_LOADED=true

# =============================================================================
# COLOR CODES AND LOGGING
# =============================================================================

# Color codes for consistent output
export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export BLUE='\033[0;34m'
export PURPLE='\033[0;35m'
export CYAN='\033[0;36m'
export WHITE='\033[1;37m'
export NC='\033[0m' # No Color

# Logging functions with consistent format
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1" >&2
}

log_debug() {
    if [[ "${DEBUG:-false}" == "true" ]]; then
        echo -e "${CYAN}[DEBUG]${NC} $1" >&2
    fi
}

# =============================================================================
# PACKAGE MANAGEMENT UTILITIES
# =============================================================================

# Robust package installation with proper error handling
install_packages_apt() {
    local packages=("$@")
    
    if [ ${#packages[@]} -eq 0 ]; then
        log_warning "No packages specified for installation"
        return 0
    fi
    
    log_info "Installing packages: ${packages[*]}"
    
    # Set non-interactive mode to prevent prompts
    export DEBIAN_FRONTEND=noninteractive
    
    # Update package lists with error handling
    local max_retries=3
    local retry=0
    
    while [ $retry -lt $max_retries ]; do
        log_debug "Updating package lists (attempt $((retry + 1))/$max_retries)"
        
        if sudo apt-get update -qq -o Dpkg::Use-Pty=0 2>/dev/null; then
            log_debug "Package lists updated successfully"
            break
        else
            retry=$((retry + 1))
            if [ $retry -lt $max_retries ]; then
                log_warning "Package update failed, retrying in 5 seconds..."
                sleep 5
            else
                log_error "Failed to update package lists after $max_retries attempts"
                return 1
            fi
        fi
    done
    
    # Install packages with proper error handling and non-interactive flags
    local install_cmd="sudo apt-get install -y -qq -o Dpkg::Use-Pty=0 -o Dpkg::Options::='--force-confdef' -o Dpkg::Options::='--force-confold'"
    
    # Try installing all packages at once first
    if eval "$install_cmd ${packages[*]}" 2>/dev/null; then
        log_success "All packages installed successfully"
        return 0
    else
        log_warning "Batch installation failed, trying individual packages"
        
        # If batch fails, try installing packages individually
        local failed_packages=()
        for package in "${packages[@]}"; do
            log_debug "Installing package: $package"
            if eval "$install_cmd $package" 2>/dev/null; then
                log_debug "Package $package installed successfully"
            else
                log_warning "Failed to install package: $package"
                failed_packages+=("$package")
            fi
        done
        
        # Report results
        if [ ${#failed_packages[@]} -eq 0 ]; then
            log_success "All packages installed successfully (individually)"
            return 0
        else
            log_error "Failed to install packages: ${failed_packages[*]}"
            return 1
        fi
    fi
}

# Check if packages are installed
check_packages() {
    local packages=("$@")
    local missing=()
    
    for package in "${packages[@]}"; do
        if ! dpkg -l "$package" >/dev/null 2>&1; then
            missing+=("$package")
        fi
    done
    
    if [ ${#missing[@]} -eq 0 ]; then
        return 0
    else
        echo "${missing[*]}"
        return 1
    fi
}

# =============================================================================
# PERMISSION UTILITIES
# =============================================================================

# Robust directory creation with proper permissions
create_directory_safe() {
    local dir_path="$1"
    local owner="${2:-$USER}"
    local permissions="${3:-755}"
    
    if [ -z "$dir_path" ]; then
        log_error "Directory path not specified"
        return 1
    fi
    
    log_debug "Creating directory: $dir_path (owner: $owner, permissions: $permissions)"
    
    # Create directory if it doesn't exist
    if [ ! -d "$dir_path" ]; then
        if ! mkdir -p "$dir_path" 2>/dev/null; then
            # Try with sudo if regular mkdir fails
            log_debug "Regular mkdir failed, trying with sudo"
            if ! sudo mkdir -p "$dir_path"; then
                log_error "Failed to create directory: $dir_path"
                return 1
            fi
        fi
    fi
    
    # Set ownership if specified and different from current
    if [ "$owner" != "$(stat -c '%U' "$dir_path" 2>/dev/null)" ]; then
        log_debug "Setting ownership of $dir_path to $owner"
        if ! sudo chown "$owner:$owner" "$dir_path" 2>/dev/null; then
            log_warning "Failed to set ownership of $dir_path to $owner"
        fi
    fi
    
    # Set permissions
    log_debug "Setting permissions of $dir_path to $permissions"
    if ! chmod "$permissions" "$dir_path" 2>/dev/null; then
        if ! sudo chmod "$permissions" "$dir_path" 2>/dev/null; then
            log_warning "Failed to set permissions of $dir_path to $permissions"
        fi
    fi
    
    return 0
}

# Safe file operation with backup
copy_file_safe() {
    local source="$1"
    local destination="$2"
    local backup="${3:-true}"
    
    if [ -z "$source" ] || [ -z "$destination" ]; then
        log_error "Source and destination must be specified"
        return 1
    fi
    
    if [ ! -f "$source" ]; then
        log_error "Source file does not exist: $source"
        return 1
    fi
    
    # Create backup if destination exists and backup is requested
    if [ "$backup" == "true" ] && [ -f "$destination" ]; then
        local backup_file="${destination}.backup.$(date +%Y%m%d_%H%M%S)"
        log_debug "Creating backup: $backup_file"
        if ! cp "$destination" "$backup_file" 2>/dev/null; then
            sudo cp "$destination" "$backup_file" 2>/dev/null || {
                log_warning "Failed to create backup of $destination"
            }
        fi
    fi
    
    # Copy file
    log_debug "Copying $source to $destination"
    if ! cp "$source" "$destination" 2>/dev/null; then
        if ! sudo cp "$source" "$destination" 2>/dev/null; then
            log_error "Failed to copy $source to $destination"
            return 1
        fi
    fi
    
    return 0
}

# Add user to group safely
add_user_to_group() {
    local username="${1:-$USER}"
    local group="$2"
    
    if [ -z "$group" ]; then
        log_error "Group name must be specified"
        return 1
    fi
    
    # Check if group exists
    if ! getent group "$group" >/dev/null; then
        log_error "Group does not exist: $group"
        return 1
    fi
    
    # Check if user is already in group
    if groups "$username" 2>/dev/null | grep -q "\b$group\b"; then
        log_debug "User $username is already in group $group"
        return 0
    fi
    
    # Add user to group
    log_info "Adding user $username to group $group"
    if sudo usermod -aG "$group" "$username"; then
        log_success "User $username added to group $group"
        log_info "Note: Group membership will take effect after logout/login or 'newgrp $group'"
        return 0
    else
        log_error "Failed to add user $username to group $group"
        return 1
    fi
}

# =============================================================================
# SERVICE UTILITIES
# =============================================================================

# Wait for service to be ready
wait_for_service() {
    local service_name="$1"
    local max_wait="${2:-60}"
    local check_interval="${3:-5}"
    
    log_info "Waiting for service $service_name to be ready (max ${max_wait}s)"
    
    local elapsed=0
    while [ $elapsed -lt $max_wait ]; do
        if systemctl is-active --quiet "$service_name" 2>/dev/null; then
            log_success "Service $service_name is ready"
            return 0
        fi
        
        log_debug "Service $service_name not ready, waiting ${check_interval}s..."
        sleep $check_interval
        elapsed=$((elapsed + check_interval))
    done
    
    log_error "Service $service_name failed to become ready within ${max_wait}s"
    return 1
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# =============================================================================
# VALIDATION UTILITIES
# =============================================================================

# Validate URL accessibility
validate_url() {
    local url="$1"
    local timeout="${2:-10}"
    local max_retries="${3:-3}"
    
    if [ -z "$url" ]; then
        log_error "URL not specified"
        return 1
    fi
    
    log_debug "Validating URL: $url"
    
    local retry=0
    while [ $retry -lt $max_retries ]; do
        if curl -f -s --connect-timeout "$timeout" --max-time "$timeout" "$url" >/dev/null 2>&1; then
            log_debug "URL $url is accessible"
            return 0
        fi
        
        retry=$((retry + 1))
        if [ $retry -lt $max_retries ]; then
            log_debug "URL check failed, retrying (attempt $((retry + 1))/$max_retries)"
            sleep 2
        fi
    done
    
    log_debug "URL $url is not accessible after $max_retries attempts"
    return 1
}

# Validate environment variable
validate_env_var() {
    local var_name="$1"
    local var_value="${!var_name}"
    local is_required="${2:-false}"
    local pattern="${3:-}"
    
    if [ -z "$var_value" ]; then
        if [ "$is_required" == "true" ]; then
            log_error "Required environment variable $var_name is not set"
            return 1
        else
            log_debug "Optional environment variable $var_name is not set"
            return 0
        fi
    fi
    
    # Check pattern if specified
    if [ -n "$pattern" ]; then
        if [[ "$var_value" =~ $pattern ]]; then
            log_debug "Environment variable $var_name matches required pattern"
        else
            log_warning "Environment variable $var_name does not match expected pattern"
            return 1
        fi
    fi
    
    return 0
}

# =============================================================================
# ERROR HANDLING
# =============================================================================

# Enhanced error handling with context
exit_with_help() {
    local error_message="$1"
    local help_text="$2"
    local cleanup_function="${3:-}"
    
    echo "" >&2
    log_error "$error_message"
    echo "" >&2
    
    if [ -n "$help_text" ]; then
        echo -e "${YELLOW}💡 Helpful guidance:${NC}" >&2
        echo "$help_text" >&2
        echo "" >&2
    fi
    
    echo -e "${YELLOW}📚 For more help:${NC}" >&2
    echo "  - Check the deployment documentation: DIGITALOCEAN_DEPLOYMENT.md" >&2
    echo "  - Review environment setup: .env.example or .env.production.example" >&2
    echo "  - Verify prerequisites are installed (Docker, Node.js, etc.)" >&2
    echo "  - Check logs in application directory" >&2
    echo "" >&2
    
    # Run cleanup function if specified
    if [ -n "$cleanup_function" ] && command_exists "$cleanup_function"; then
        log_info "Running cleanup: $cleanup_function"
        "$cleanup_function" || true
    fi
    
    exit 1
}

# =============================================================================
# NODE.JS AND NPM UTILITIES
# =============================================================================

# Install or update Node.js to 20.x LTS and latest compatible npm
install_nodejs_20() {
    local force_update="${1:-false}"
    
    log_info "Setting up Node.js 20.x LTS and latest compatible npm"
    
    # Check current Node.js version
    local current_node_version=""
    local current_npm_version=""
    local node_major_version=0
    
    if command_exists node; then
        current_node_version=$(node --version 2>/dev/null | sed 's/v//' || echo "")
        if [ -n "$current_node_version" ]; then
            node_major_version=$(echo "$current_node_version" | cut -d. -f1)
            log_info "Current Node.js version: v$current_node_version (major: $node_major_version)"
        fi
    fi
    
    if command_exists npm; then
        current_npm_version=$(npm --version 2>/dev/null || echo "")
        if [ -n "$current_npm_version" ]; then
            log_info "Current npm version: $current_npm_version"
        fi
    fi
    
    # Install or update Node.js if needed
    local needs_node_update=false
    
    if [ ! command_exists node ] || [ "$node_major_version" -lt 20 ] || [ "$force_update" == "true" ]; then
        needs_node_update=true
    fi
    
    if [ "$needs_node_update" == "true" ]; then
        log_info "Installing/updating Node.js 20.x LTS..."
        
        # Install NodeSource repository and Node.js 20.x
        if curl -fsSL https://deb.nodesource.com/setup_20.x 2>/dev/null | sudo -E bash - 2>/dev/null; then
            if install_packages_apt nodejs; then
                local new_node_version
                new_node_version=$(node --version 2>/dev/null | sed 's/v//' || echo "unknown")
                log_success "Node.js updated from v$current_node_version to v$new_node_version"
            else
                log_error "Failed to install Node.js 20.x package"
                return 1
            fi
        else
            log_error "Failed to add NodeSource repository"
            return 1
        fi
    else
        log_success "Node.js $current_node_version is already compatible (>=20.x)"
    fi
    
    # Update npm to latest compatible version
    log_info "Updating npm to latest compatible version..."
    
    local npm_update_attempts=3
    local npm_updated=false
    
    # Try different npm update strategies
    for attempt in $(seq 1 $npm_update_attempts); do
        log_debug "npm update attempt $attempt/$npm_update_attempts"
        
        # Strategy 1: Update to latest
        if [ $attempt -eq 1 ]; then
            log_debug "Trying npm update to latest"
            if sudo npm install -g npm@latest >/dev/null 2>&1; then
                npm_updated=true
                break
            fi
        fi
        
        # Strategy 2: Update to compatible version for Node 20.x  
        if [ $attempt -eq 2 ]; then
            log_debug "Trying npm update to compatible version for Node 20.x"
            if sudo npm install -g npm@^10.0.0 >/dev/null 2>&1; then
                npm_updated=true
                break
            fi
        fi
        
        # Strategy 3: Update using npm ci approach
        if [ $attempt -eq 3 ]; then
            log_debug "Trying alternative npm update method"
            if sudo npm install -g npm@10 >/dev/null 2>&1; then
                npm_updated=true
                break
            fi
        fi
        
        log_debug "npm update attempt $attempt failed"
        sleep 2
    done
    
    # Check final npm version and report results
    local final_npm_version=""
    if command_exists npm; then
        final_npm_version=$(npm --version 2>/dev/null || echo "unknown")
    fi
    
    if [ "$npm_updated" == "true" ]; then
        log_success "npm updated from $current_npm_version to $final_npm_version"
    else
        log_warning "npm update failed, using existing version $current_npm_version"
        log_info "This may cause compatibility issues with some packages"
    fi
    
    # Verify final installation
    log_info "Verifying Node.js and npm installation..."
    
    if command_exists node && command_exists npm; then
        local final_node_version
        final_node_version=$(node --version 2>/dev/null | sed 's/v//' || echo "unknown")
        final_npm_version=$(npm --version 2>/dev/null || echo "unknown")
        
        log_success "Final versions - Node.js: v$final_node_version, npm: $final_npm_version"
        
        # Test npm functionality
        if npm --version >/dev/null 2>&1; then
            log_success "Node.js and npm are working correctly"
            return 0
        else
            log_error "npm functionality test failed"
            return 1
        fi
    else
        log_error "Node.js or npm installation verification failed"
        return 1
    fi
}

# Clean up deprecated npm packages and configurations
clean_npm_deprecated() {
    log_info "Cleaning up deprecated npm packages and configurations"
    
    # List of commonly deprecated global packages to check
    local deprecated_packages=(
        "rimraf@3"
        "npmlog"
        "multer@1"
        "inflight"
        "glob@7"
        "gauge"
        "node-domexception"
        "are-we-there-yet"
        "@npmcli/move-file"
    )
    
    # Check for deprecated packages in global installation
    local found_deprecated=()
    
    for package in "${deprecated_packages[@]}"; do
        local package_name
        package_name=$(echo "$package" | cut -d'@' -f1)
        
        if npm list -g "$package_name" >/dev/null 2>&1; then
            found_deprecated+=("$package_name")
        fi
    done
    
    if [ ${#found_deprecated[@]} -gt 0 ]; then
        log_warning "Found deprecated packages: ${found_deprecated[*]}"
        log_info "Consider removing these manually: npm uninstall -g ${found_deprecated[*]}"
    else
        log_success "No deprecated global packages found"
    fi
    
    # Clear npm cache to remove any stale data
    log_info "Clearing npm cache..."
    if npm cache clean --force >/dev/null 2>&1; then
        log_success "npm cache cleared"
    else
        log_warning "Failed to clear npm cache (may not be critical)"
    fi
    
    return 0
}

# =============================================================================
# REPOSITORY UTILITIES
# =============================================================================

# Handle repository setup with robust error handling and guidance
setup_repository_robust() {
    local repo_url="$1"
    local target_dir="${2:-.}"
    local repo_name="${3:-Spotify-echo}"
    
    log_info "Setting up repository in $target_dir"
    
    if [ -z "$repo_url" ]; then
        exit_with_help "Repository URL not specified" \
            "Please provide a valid repository URL as the first argument"
        return 1
    fi
    
    # Change to target directory
    if ! cd "$target_dir" 2>/dev/null; then
        exit_with_help "Cannot access target directory: $target_dir" \
            "Failed to change to target directory.
Please ensure:
1. Directory exists and is accessible
2. Current user has appropriate permissions
3. Path is correct and no typos

You may need to create it first: mkdir -p $target_dir"
        return 1
    fi
    
    # Check if we're already in a git repository
    if [ -d ".git" ]; then
        log_info "Found existing git repository"
        
        # Verify it's the correct repository
        local current_remote
        current_remote=$(git remote get-url origin 2>/dev/null || echo "")
        
        if [[ "$current_remote" == *"$repo_name"* ]] || [[ "$current_remote" == "$repo_url" ]]; then
            log_success "Repository verified: $current_remote"
            
            # Try to update the repository
            log_info "Attempting to update repository..."
            if git pull origin main >/dev/null 2>&1; then
                log_success "Repository updated successfully"
            else
                log_warning "Could not update repository, continuing with current version"
                log_info "This might be due to:"
                log_info "  - No internet connection"
                log_info "  - Local changes that conflict"
                log_info "  - Authentication issues (for private repos)"
            fi
            return 0
        else
            exit_with_help "Directory contains wrong git repository: $current_remote" \
                "The current directory contains a different git repository.
Expected: $repo_url (containing '$repo_name')
Found: $current_remote

Please either:
1. Remove the directory and re-run: rm -rf $target_dir
2. Move to a different directory before running deployment
3. Set the correct repository URL if this is intentional"
            return 1
        fi
    fi
    
    # Check if directory has files but no git repository
    local file_count
    file_count=$(find . -maxdepth 1 -type f -print -quit 2>/dev/null | wc -l)
    
    if [ "$file_count" -gt 0 ]; then
        # List some of the files for user reference
        local files_sample
        files_sample=$(find . -maxdepth 1 -type f -print0 2>/dev/null | head -z -5 | tr '\0' '\n' | sed 's|^./||' | head -3)
        
        exit_with_help "Directory $target_dir contains files but is not a git repository" \
            "The target directory contains files but is not a git repository.
Files found include: $(echo "$files_sample" | tr '\n' ' ')

Please either:
1. Remove the directory: rm -rf $target_dir
2. Move existing files to backup: mv $target_dir $target_dir.backup.$(date +%Y%m%d_%H%M%S)
3. Initialize as git repository manually if you want to keep the files"
        return 1
    fi
    
    # Directory is empty or doesn't exist, safe to clone
    log_info "Cloning repository from $repo_url..."
    
    # Try cloning with various strategies
    local clone_attempts=3
    local clone_success=false
    
    for attempt in $(seq 1 $clone_attempts); do
        log_debug "Clone attempt $attempt/$clone_attempts"
        
        # Try different clone strategies
        if [ $attempt -eq 1 ]; then
            # Standard clone
            if git clone "$repo_url" . >/dev/null 2>&1; then
                clone_success=true
                break
            fi
        elif [ $attempt -eq 2 ]; then
            # Shallow clone for faster download
            if git clone --depth 1 "$repo_url" . >/dev/null 2>&1; then
                clone_success=true
                log_info "Used shallow clone for faster download"
                break
            fi
        elif [ $attempt -eq 3 ]; then
            # Clone with verbose output for debugging
            log_info "Final attempt with verbose output..."
            if git clone "$repo_url" .; then
                clone_success=true
                break
            fi
        fi
        
        log_debug "Clone attempt $attempt failed"
        sleep 2
    done
    
    if [ "$clone_success" != "true" ]; then
        exit_with_help "Failed to clone repository from $repo_url" \
            "Repository cloning failed after $clone_attempts attempts.
This could be due to:
1. Network connectivity issues
2. Invalid repository URL
3. Authentication issues (if private repository)
4. Git not installed or not in PATH
5. Insufficient disk space

Please verify:
- Internet connection is working: ping github.com
- Repository URL is correct: $repo_url  
- Git is installed: git --version
- Repository is accessible (try cloning manually)
- Available disk space: df -h

For private repositories, ensure:
- SSH keys are configured: ssh -T git@github.com
- Or use HTTPS with token authentication" "cleanup_on_error"
        return 1
    fi
    
    log_success "Repository cloned successfully"
    
    # Verify the clone was successful
    if [ -f "package.json" ] || [ -f "README.md" ]; then
        log_success "Repository contents verified"
    else
        log_warning "Repository cloned but expected files not found"
        log_info "This might be normal depending on the repository structure"
    fi
    
    return 0
}

# =============================================================================
# ENVIRONMENT UTILITIES
# =============================================================================

# Robust environment detection and validation
detect_and_source_env_robust() {
    local env_file=""
    local app_dir="${1:-}"
    
    # Define search locations in priority order
    local env_locations=(
        ".env"
        "${app_dir}/.env"
        "/opt/echotune/.env"
        "$(pwd)/.env"
        "${HOME}/.env"
    )
    
    # Add app_dir to search if specified
    if [ -n "$app_dir" ]; then
        env_locations=("${app_dir}/.env" "${env_locations[@]}")
    fi
    
    log_info "Detecting environment configuration..."
    
    # Try to find .env file in priority order
    for location in "${env_locations[@]}"; do
        if [ -f "$location" ] && [ -r "$location" ]; then
            env_file="$location"
            log_info "Found environment file: $env_file"
            break
        fi
    done
    
    if [ -z "$env_file" ]; then
        log_warning "No .env file found in searched locations:"
        for location in "${env_locations[@]}"; do
            if [ -f "$location" ] && [ ! -r "$location" ]; then
                echo "  - $location (exists but not readable - check permissions)"
            else
                echo "  - $location"
            fi
        done
        return 1
    fi
    
    # Validate environment file syntax before sourcing
    log_debug "Validating environment file syntax..."
    if ! bash -n "$env_file" 2>/dev/null; then
        exit_with_help "Environment file has syntax errors: $env_file" \
            "Environment file contains bash syntax errors.
Please check:
1. File syntax is correct (no invalid bash syntax)
2. Quotes are properly closed
3. No special characters that need escaping
4. Variable assignments follow format: VAR=value

You can test the file manually: bash -n $env_file"
        return 1
    fi
    
    # Test environment file loading in a subshell first
    log_debug "Testing environment file loading..."
    if ! (set -a; source "$env_file" 2>/dev/null; set +a) >/dev/null 2>&1; then
        exit_with_help "Failed to load environment file: $env_file" \
            "Environment file exists but failed to load.
Please check:
1. File permissions allow reading: chmod 644 $env_file
2. No special characters in values that need escaping  
3. All variables are properly formatted
4. No circular references or complex expressions

You can test the file manually: source $env_file"
        return 1
    fi
    
    # Source the environment file for the current shell
    log_debug "Sourcing environment file..."
    set -a
    if ! source "$env_file" 2>/dev/null; then
        set +a
        exit_with_help "Failed to source environment file: $env_file" \
            "Unable to load environment variables from file.
This may be due to:
1. Invalid variable assignments  
2. Special characters in values
3. Missing quotes around values with spaces
4. Bash-specific syntax issues

Please validate your .env file format."
        return 1
    fi
    set +a
    
    log_success "Environment variables loaded from $env_file"
    
    # Export and validate critical variables
    log_debug "Processing environment variables..."
    
    # Set defaults for critical variables
    export NODE_ENV="${NODE_ENV:-production}"
    export PORT="${PORT:-3000}" 
    export DOMAIN="${DOMAIN:-localhost}"
    
    # Export key variables if they exist (don't fail if empty)
    [ -n "${SPOTIFY_CLIENT_ID:-}" ] && export SPOTIFY_CLIENT_ID
    [ -n "${SPOTIFY_CLIENT_SECRET:-}" ] && export SPOTIFY_CLIENT_SECRET
    [ -n "${FRONTEND_URL:-}" ] && export FRONTEND_URL
    [ -n "${SPOTIFY_REDIRECT_URI:-}" ] && export SPOTIFY_REDIRECT_URI
    [ -n "${MONGODB_URI:-}" ] && export MONGODB_URI
    [ -n "${REDIS_URL:-}" ] && export REDIS_URL
    
    log_success "Environment configuration processed successfully"
    return 0
}

# Validate environment with detailed guidance
validate_environment_comprehensive() {
    log_info "Performing comprehensive environment validation..."
    
    # Define required and optional variables
    local required_vars=(
        "NODE_ENV"
        "PORT"
    )
    
    local recommended_vars=(
        "SPOTIFY_CLIENT_ID"
        "SPOTIFY_CLIENT_SECRET"
        "DOMAIN"
        "FRONTEND_URL"
    )
    
    local optional_vars=(
        "SPOTIFY_REDIRECT_URI"
        "MONGODB_URI"
        "REDIS_URL"
        "GEMINI_API_KEY"
        "OPENAI_API_KEY"
    )
    
    local missing_required=()
    local missing_recommended=()
    local warnings=()
    
    # Check required variables
    for var in "${required_vars[@]}"; do
        if ! validate_env_var "$var" true; then
            missing_required+=("$var")
        fi
    done
    
    # Check recommended variables
    for var in "${recommended_vars[@]}"; do
        if ! validate_env_var "$var" false; then
            missing_recommended+=("$var")
        fi
    done
    
    # Check for common misconfigurations and warnings
    if [ -n "${SPOTIFY_CLIENT_ID:-}" ] && [[ ! "${SPOTIFY_CLIENT_ID}" =~ ^[a-f0-9]{32}$ ]]; then
        warnings+=("SPOTIFY_CLIENT_ID format looks suspicious (should be 32 hex characters)")
    fi
    
    if [ -n "${SPOTIFY_CLIENT_SECRET:-}" ] && [[ ! "${SPOTIFY_CLIENT_SECRET}" =~ ^[a-f0-9]{32}$ ]]; then
        warnings+=("SPOTIFY_CLIENT_SECRET format looks suspicious (should be 32 hex characters)")
    fi
    
    if [ "${NODE_ENV:-}" != "production" ] && [ "${NODE_ENV:-}" != "development" ]; then
        warnings+=("NODE_ENV should be 'production' or 'development', got: ${NODE_ENV:-[empty]}")
    fi
    
    if [[ "${FRONTEND_URL:-}" == *"localhost"* ]] && [ "${NODE_ENV:-}" = "production" ]; then
        warnings+=("FRONTEND_URL contains localhost but NODE_ENV is production")
    fi
    
    # Report missing required variables
    if [ ${#missing_required[@]} -ne 0 ]; then
        local missing_list=""
        for var in "${missing_required[@]}"; do
            missing_list="$missing_list\n  - $var"
        done
        
        exit_with_help "Missing required environment variables:$missing_list" \
            "Please update your .env file with the missing variables.
You can find examples in .env.example or .env.production.example.

Common setup steps:
1. Copy template: cp .env.example .env
2. Edit file: nano .env
3. Set required variables at minimum
4. Verify all required variables are set

Required variables and their purposes:
- NODE_ENV: Application environment (production/development)
- PORT: Port number for the application to listen on"
        return 1
    fi
    
    # Report missing recommended variables
    if [ ${#missing_recommended[@]} -ne 0 ]; then
        log_warning "Missing recommended environment variables:"
        for var in "${missing_recommended[@]}"; do
            echo "  - $var"
        done
        log_info "The application will work in demo mode without these, but full functionality requires them"
        echo ""
    fi
    
    # Report warnings
    if [ ${#warnings[@]} -ne 0 ]; then
        log_warning "Environment configuration warnings:"
        for warning in "${warnings[@]}"; do
            echo "  - $warning"
        done
        echo ""
    fi
    
    # Display current configuration (with sensitive data masked)
    log_info "Current environment configuration:"
    echo "  - NODE_ENV: ${NODE_ENV}"
    echo "  - PORT: ${PORT}"
    echo "  - DOMAIN: ${DOMAIN:-[Not set]}"
    echo "  - FRONTEND_URL: ${FRONTEND_URL:-[Not set]}"
    
    if [ -n "${SPOTIFY_CLIENT_ID:-}" ]; then
        echo "  - SPOTIFY_CLIENT_ID: ${SPOTIFY_CLIENT_ID:0:8}..."
    else
        echo "  - SPOTIFY_CLIENT_ID: [Not set]"
    fi
    
    if [ -n "${SPOTIFY_CLIENT_SECRET:-}" ]; then
        echo "  - SPOTIFY_CLIENT_SECRET: ${SPOTIFY_CLIENT_SECRET:0:8}..."
    else
        echo "  - SPOTIFY_CLIENT_SECRET: [Not set]"
    fi
    
    echo "  - SPOTIFY_REDIRECT_URI: ${SPOTIFY_REDIRECT_URI:-[Not set]}"
    
    if [ -n "${MONGODB_URI:-}" ]; then
        echo "  - MONGODB_URI: [Configured]"
    else
        echo "  - MONGODB_URI: [Not set]"
    fi
    
    if [ -n "${REDIS_URL:-}" ]; then
        echo "  - REDIS_URL: [Configured]"
    else
        echo "  - REDIS_URL: [Not set]"
    fi
    
    log_success "Environment validation completed"
    
    # Return status based on whether we have minimum viable configuration
    if [ ${#missing_required[@]} -eq 0 ]; then
        return 0
    else
        return 1
    fi
}

# =============================================================================
# DOCKER UTILITIES
# =============================================================================

# =============================================================================
# DOCKER UTILITIES
# =============================================================================

# Check Docker availability and health
check_docker() {
    log_debug "Checking Docker availability"
    
    if ! command_exists docker; then
        return 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info >/dev/null 2>&1; then
        log_debug "Docker daemon not accessible"
        return 1
    fi
    
    # Check if Docker Compose is available
    if ! command_exists docker-compose && ! docker compose version >/dev/null 2>&1; then
        log_debug "Docker Compose not available"
        return 1
    fi
    
    return 0
}

# Wait for Docker service with enhanced monitoring
wait_for_docker() {
    local max_wait="${1:-30}"
    local check_interval="${2:-5}"
    
    log_info "Waiting for Docker service to be ready (max ${max_wait}s)"
    
    local elapsed=0
    while [ $elapsed -lt $max_wait ]; do
        if check_docker; then
            log_success "Docker service is ready"
            return 0
        fi
        
        # Provide helpful status information
        if ! command_exists docker; then
            log_debug "Docker command not found in PATH"
        elif ! docker info >/dev/null 2>&1; then
            log_debug "Docker daemon not accessible (may be starting up)"
        else
            log_debug "Docker Compose not available"
        fi
        
        log_debug "Docker not ready, waiting ${check_interval}s..."
        sleep $check_interval
        elapsed=$((elapsed + check_interval))
    done
    
    log_error "Docker service failed to become ready within ${max_wait}s"
    
    # Provide diagnostics on failure
    log_info "Docker diagnostics:"
    if command_exists docker; then
        echo "  - Docker command: Available"
        if docker info >/dev/null 2>&1; then
            echo "  - Docker daemon: Running"
        else
            echo "  - Docker daemon: Not accessible"
            echo "    Try: sudo systemctl start docker"
        fi
    else
        echo "  - Docker command: Not found"
        echo "    Try: sudo apt install docker.io"
    fi
    
    if command_exists docker-compose; then
        echo "  - Docker Compose: Available (standalone)"
    elif docker compose version >/dev/null 2>&1; then
        echo "  - Docker Compose: Available (plugin)"
    else
        echo "  - Docker Compose: Not available"
        echo "    Try: sudo apt install docker-compose"
    fi
    
    return 1
}

# Enhanced application health check with multiple endpoints and retry strategies
wait_for_app_health() {
    local base_url="${1:-http://localhost:3000}"
    local max_wait="${2:-120}"
    local check_interval="${3:-10}"
    
    log_info "Waiting for application health at $base_url (max ${max_wait}s)"
    
    # Health endpoints to try in order of preference
    local health_endpoints=(
        "$base_url/health"
        "$base_url/ready"  
        "$base_url/alive"
        "$base_url/"
    )
    
    local elapsed=0
    local last_error=""
    
    while [ $elapsed -lt $max_wait ]; do
        log_info "Health check attempt (elapsed: ${elapsed}s/${max_wait}s)"
        
        # Try each endpoint until one succeeds
        local success=false
        for endpoint in "${health_endpoints[@]}"; do
            log_debug "Testing endpoint: $endpoint"
            
            if curl -f -s --connect-timeout 10 --max-time 30 "$endpoint" >/dev/null 2>&1; then
                log_success "Application is healthy and responding at $endpoint!"
                return 0
            else
                last_error="$endpoint failed"
                log_debug "$last_error"
            fi
        done
        
        # Show progress and container status
        elapsed=$((elapsed + check_interval))
        if [ $elapsed -lt $max_wait ]; then
            log_info "Waiting ${check_interval}s before next check..."
            
            # Show Docker container status if available
            if command_exists docker-compose && [ -f "docker-compose.yml" ]; then
                log_debug "Container status:"
                docker-compose ps 2>/dev/null | grep -E "(State|Up|Exited)" || echo "    No containers found"
            fi
            
            sleep $check_interval
        fi
    done
    
    # Comprehensive failure diagnostics
    log_error "Application health check failed after ${max_wait}s"
    echo ""
    log_info "🔍 Gathering diagnostic information..."
    echo ""
    
    # Container status
    echo "📦 Container Status:"
    if command_exists docker-compose && [ -f "docker-compose.yml" ]; then
        docker-compose ps 2>/dev/null || echo "Could not get container status"
    else
        echo "Docker Compose not available or no docker-compose.yml found"
    fi
    echo ""
    
    # Recent application logs
    echo "📋 Recent Application Logs (last 20 lines):"
    if command_exists docker-compose && [ -f "docker-compose.yml" ]; then
        docker-compose logs --tail=20 app 2>/dev/null || echo "No app logs available"
    else
        echo "Docker Compose logs not available"
    fi
    echo ""
    
    # Network status
    echo "🌐 Network Status:"
    local ports=("3000" "80" "443")
    for port in "${ports[@]}"; do
        if netstat -tlnp 2>/dev/null | grep -q ":$port "; then
            echo "  Port $port: ✅ LISTENING"
        else
            echo "  Port $port: ❌ NOT LISTENING"
        fi
    done
    echo ""
    
    # Process status
    echo "🔍 Process Status:"
    if pgrep -f "node.*index.js" >/dev/null; then
        echo "  Node.js process: ✅ RUNNING"
    else
        echo "  Node.js process: ❌ NOT FOUND"
    fi
    echo ""
    
    # Disk space check
    echo "💾 Disk Space:"
    df -h / | tail -1 || echo "Could not check disk space"
    echo ""
    
    # Memory check
    echo "🧠 Memory Usage:"
    free -h | head -2 || echo "Could not check memory"
    echo ""
    
    return 1
}

# Enhanced Docker Compose operations with better error handling
docker_compose_up_robust() {
    local compose_file="${1:-docker-compose.yml}"
    local services="${2:-}"
    local build_flag="${3:-false}"
    
    log_info "Starting Docker Compose services"
    
    # Verify compose file exists
    if [ ! -f "$compose_file" ]; then
        exit_with_help "Docker Compose file not found: $compose_file" \
            "The deployment requires a docker-compose.yml file.
Please ensure:
1. You're in the correct repository directory
2. The repository contains the necessary Docker configuration
3. The repository clone was successful"
        return 1
    fi
    
    # Validate compose file syntax
    log_debug "Validating Docker Compose file syntax..."
    if ! docker-compose -f "$compose_file" config >/dev/null 2>&1; then
        exit_with_help "Docker Compose file has syntax errors: $compose_file" \
            "The docker-compose.yml file contains syntax errors.
Please check:
1. YAML syntax is correct (indentation, quotes, etc.)
2. All required environment variables are set
3. File is not corrupted

You can test the file manually: docker-compose config"
        return 1
    fi
    
    # Stop existing services gracefully
    log_info "Stopping existing services..."
    if docker-compose -f "$compose_file" down --timeout 30 >/dev/null 2>&1; then
        log_success "Existing services stopped"
    else
        log_warning "Some services may not have stopped cleanly (or none were running)"
    fi
    
    # Build if requested
    if [ "$build_flag" == "true" ]; then
        log_info "Building Docker containers..."
        if ! docker-compose -f "$compose_file" build --no-cache; then
            exit_with_help "Docker build failed" \
                "Container build process failed. This could be due to:
1. Build dependencies missing in Dockerfile
2. Network issues downloading dependencies
3. Insufficient disk space
4. Docker daemon issues

Check the build logs above for specific errors.
You can also try:
- Restart Docker: sudo systemctl restart docker
- Clean Docker cache: docker system prune -f
- Check Docker logs: journalctl -u docker"
            return 1
        fi
        log_success "Containers built successfully"
    fi
    
    # Start services
    log_info "Starting services..."
    local start_cmd="docker-compose -f $compose_file up -d"
    if [ -n "$services" ]; then
        start_cmd="$start_cmd $services"
    fi
    
    if ! eval "$start_cmd"; then
        exit_with_help "Failed to start Docker services" \
            "Service startup failed. This could be due to:
1. Port conflicts: netstat -tlnp | grep ':80\\|:443\\|:3000'
2. Resource constraints: free -h && df -h
3. Configuration errors in docker-compose.yml
4. Missing environment variables
5. Docker daemon issues

Try these troubleshooting steps:
- Check service logs: docker-compose logs
- Verify ports are available: sudo lsof -i :80,443,3000
- Restart Docker: sudo systemctl restart docker
- Check system resources are sufficient"
        return 1
    fi
    
    log_success "Docker services started successfully"
    return 0
}

# Stop Docker Compose services safely
docker_compose_down_safe() {
    local compose_file="${1:-docker-compose.yml}"
    local timeout="${2:-30}"
    
    log_info "Stopping Docker Compose services safely"
    
    if [ ! -f "$compose_file" ]; then
        log_warning "Docker Compose file not found: $compose_file"
        return 0
    fi
    
    # Stop with timeout
    if docker-compose -f "$compose_file" down --timeout "$timeout" >/dev/null 2>&1; then
        log_success "Services stopped successfully"
    else
        log_warning "Some services may not have stopped cleanly"
        
        # Force stop if graceful stop failed
        log_info "Attempting force stop..."
        if docker-compose -f "$compose_file" kill >/dev/null 2>&1; then
            docker-compose -f "$compose_file" rm -f >/dev/null 2>&1
            log_success "Services force stopped"
        else
            log_warning "Force stop may have failed"
        fi
    fi
    
    return 0
}

# =============================================================================
# INITIALIZATION
# =============================================================================

# Initialize deployment utilities
init_deployment_utils() {
    # Set up error handling
    set -e
    set -o pipefail
    
    # Export commonly used variables
    export USER="${USER:-$(whoami)}"
    export HOME="${HOME:-$(eval echo ~$USER)}"
    
    log_debug "Deployment utilities initialized"
}

# Auto-initialize when sourced
init_deployment_utils

log_debug "Deployment utilities library loaded successfully"