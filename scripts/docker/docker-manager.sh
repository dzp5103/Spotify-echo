#!/bin/bash

# Docker Management and Optimization Tool for EchoTune AI
# Provides advanced Docker operations with monitoring and optimization features

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DOCKER_STATS_FILE="/tmp/docker-stats.json"
OPTIMIZATION_LOG="/tmp/docker-optimization.log"

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_header() { echo -e "${CYAN}$1${NC}"; }

# Function to check Docker installation and status
check_docker() {
    log_header "=== Docker System Check ==="
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        log_info "Run: ./scripts/docker-ubuntu-setup.sh"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running or user lacks permissions"
        log_info "Start Docker: sudo systemctl start docker"
        log_info "Add user to group: sudo usermod -aG docker \$USER"
        exit 1
    fi
    
    log_success "Docker is installed and running"
    echo "Version: $(docker --version)"
    echo "Compose: $(docker-compose --version)"
    
    # Check system resources
    local memory=$(free -h | awk '/^Mem:/{print $2}')
    local disk=$(df -h . | awk 'NR==2{print $4}')
    echo "Available Memory: $memory"
    echo "Available Disk: $disk"
    
    # Check for Docker optimization
    if [[ -f "/etc/docker/daemon.json" ]]; then
        log_success "Docker daemon configuration found"
    else
        log_warning "Docker daemon not optimized - consider running setup script"
    fi
}

# Function to analyze current container performance
analyze_performance() {
    log_header "=== Performance Analysis ==="
    
    if ! docker ps -q | head -1 > /dev/null; then
        log_warning "No running containers found"
        return 0
    fi
    
    # Collect container stats
    log_info "Collecting container statistics..."
    docker stats --no-stream --format "table {{.Container}}\t{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}" > "$DOCKER_STATS_FILE"
    
    echo "Current Container Performance:"
    cat "$DOCKER_STATS_FILE"
    
    # Analyze resource usage
    local high_cpu=$(docker stats --no-stream --format "{{.Name}} {{.CPUPerc}}" | awk '{gsub(/%/, "", $2); if($2 > 80) print $1}')
    local high_memory=$(docker stats --no-stream --format "{{.Name}} {{.MemPerc}}" | awk '{gsub(/%/, "", $2); if($2 > 80) print $1}')
    
    if [[ -n "$high_cpu" ]]; then
        log_warning "High CPU usage detected in: $high_cpu"
    fi
    
    if [[ -n "$high_memory" ]]; then
        log_warning "High memory usage detected in: $high_memory"
    fi
    
    # Check for container restarts
    local restarted=$(docker ps --format "{{.Names}} {{.Status}}" | grep -E "Restart|restart" || true)
    if [[ -n "$restarted" ]]; then
        log_warning "Containers with recent restarts:"
        echo "$restarted"
    fi
}

# Function to optimize Docker images
optimize_images() {
    log_header "=== Image Optimization ==="
    
    log_info "Analyzing Docker images..."
    
    # Show image sizes
    echo "Current Image Sizes:"
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
    
    # Find large images
    local large_images=$(docker images --format "{{.Repository}}:{{.Tag}} {{.Size}}" | awk '$2 ~ /GB/ && $2 > 1 {print $1}')
    if [[ -n "$large_images" ]]; then
        log_warning "Large images found (>1GB):"
        echo "$large_images"
    fi
    
    # Check for dangling images
    local dangling=$(docker images -f "dangling=true" -q)
    if [[ -n "$dangling" ]]; then
        log_info "Found $(echo "$dangling" | wc -l) dangling images"
        read -p "Remove dangling images? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker rmi $dangling
            log_success "Dangling images removed"
        fi
    fi
    
    # Check for unused images
    local unused=$(docker image ls --filter "dangling=false" --format "{{.ID}}" | while read image; do
        if ! docker ps -a --format "{{.Image}}" | grep -q "$image"; then
            echo "$image"
        fi
    done)
    
    if [[ -n "$unused" ]]; then
        log_info "Found unused images"
        read -p "Remove unused images? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "$unused" | xargs -r docker rmi
            log_success "Unused images removed"
        fi
    fi
}

# Function to optimize Docker networks
optimize_networks() {
    log_header "=== Network Optimization ==="
    
    # List networks
    echo "Docker Networks:"
    docker network ls
    
    # Find unused networks
    local unused_networks=$(docker network ls --filter "dangling=true" -q)
    if [[ -n "$unused_networks" ]]; then
        log_info "Found unused networks"
        read -p "Remove unused networks? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "$unused_networks" | xargs -r docker network rm
            log_success "Unused networks removed"
        fi
    fi
}

# Function to optimize Docker volumes
optimize_volumes() {
    log_header "=== Volume Optimization ==="
    
    # List volumes
    echo "Docker Volumes:"
    docker volume ls
    
    # Find unused volumes
    local unused_volumes=$(docker volume ls --filter "dangling=true" -q)
    if [[ -n "$unused_volumes" ]]; then
        log_warning "Found $(echo "$unused_volumes" | wc -l) unused volumes"
        echo "$unused_volumes"
        read -p "Remove unused volumes? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "$unused_volumes" | xargs -r docker volume rm
            log_success "Unused volumes removed"
        fi
    fi
}

# Function to monitor containers in real-time
monitor_containers() {
    log_header "=== Real-time Container Monitoring ==="
    
    echo "Press Ctrl+C to stop monitoring"
    echo
    
    # Create monitoring function
    monitor_loop() {
        while true; do
            clear
            echo -e "${CYAN}EchoTune AI - Docker Container Monitor${NC}"
            echo -e "${CYAN}====================================${NC}"
            echo "Timestamp: $(date)"
            echo
            
            # Container status
            echo -e "${BLUE}Container Status:${NC}"
            docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
            echo
            
            # Resource usage
            echo -e "${BLUE}Resource Usage:${NC}"
            docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}"
            echo
            
            # Logs (last 5 lines from each container)
            echo -e "${BLUE}Recent Logs:${NC}"
            for container in $(docker ps --format "{{.Names}}"); do
                echo -e "${YELLOW}--- $container ---${NC}"
                docker logs --tail 3 "$container" 2>&1 | head -3 || true
                echo
            done
            
            sleep 5
        done
    }
    
    trap 'echo; log_info "Monitoring stopped"; exit 0' INT
    monitor_loop
}

# Function to create Docker health report
create_health_report() {
    log_header "=== Docker Health Report ==="
    
    local report_file="/tmp/docker-health-report.txt"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    {
        echo "EchoTune AI - Docker Health Report"
        echo "Generated: $timestamp"
        echo "========================================"
        echo
        
        echo "SYSTEM INFORMATION:"
        echo "-------------------"
        docker version --format 'Client: {{.Client.Version}}'
        docker version --format 'Server: {{.Server.Version}}'
        docker info --format 'CPUs: {{.NCPU}}'
        docker info --format 'Memory: {{.MemTotal}}'
        echo
        
        echo "CONTAINER STATUS:"
        echo "-----------------"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Image}}\t{{.CreatedAt}}"
        echo
        
        echo "RESOURCE USAGE:"
        echo "---------------"
        docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
        echo
        
        echo "IMAGES:"
        echo "-------"
        docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
        echo
        
        echo "VOLUMES:"
        echo "--------"
        docker volume ls
        echo
        
        echo "NETWORKS:"
        echo "---------"
        docker network ls
        echo
        
        echo "DISK USAGE:"
        echo "-----------"
        docker system df
        echo
        
    } > "$report_file"
    
    log_success "Health report generated: $report_file"
    
    # Display summary
    echo "Report Summary:"
    echo "• Containers: $(docker ps -q | wc -l) running, $(docker ps -aq | wc -l) total"
    echo "• Images: $(docker images -q | wc -l) total"
    echo "• Volumes: $(docker volume ls -q | wc -l) total"
    echo "• Networks: $(docker network ls -q | wc -l) total"
    
    # Check for issues
    local issues=0
    
    if docker ps --filter "status=exited" -q | head -1 > /dev/null; then
        log_warning "Some containers are not running"
        ((issues++))
    fi
    
    if docker images --filter "dangling=true" -q | head -1 > /dev/null; then
        log_warning "Dangling images found"
        ((issues++))
    fi
    
    if docker volume ls --filter "dangling=true" -q | head -1 > /dev/null; then
        log_warning "Unused volumes found"
        ((issues++))
    fi
    
    if [[ $issues -eq 0 ]]; then
        log_success "No issues detected"
    else
        log_warning "$issues issue(s) found - run optimization commands to fix"
    fi
}

# Function to backup Docker data
backup_docker_data() {
    log_header "=== Docker Data Backup ==="
    
    local backup_dir="/tmp/docker-backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$backup_dir"
    
    log_info "Creating backup in: $backup_dir"
    
    # Backup container configurations
    docker ps -a --format "{{.Names}}" | while read container; do
        if [[ -n "$container" ]]; then
            log_info "Backing up container: $container"
            docker inspect "$container" > "$backup_dir/${container}-config.json"
        fi
    done
    
    # Backup docker-compose files
    if [[ -f "$PROJECT_ROOT/docker-compose.yml" ]]; then
        cp "$PROJECT_ROOT/docker-compose.yml" "$backup_dir/"
        log_info "Backed up docker-compose.yml"
    fi
    
    if [[ -f "$PROJECT_ROOT/.env" ]]; then
        cp "$PROJECT_ROOT/.env" "$backup_dir/"
        log_info "Backed up .env file"
    fi
    
    # Create restore script
    cat > "$backup_dir/restore.sh" << 'EOF'
#!/bin/bash
echo "Docker backup restore script"
echo "Run this script from the project directory to restore configurations"
echo "Note: This backup contains configurations only, not data volumes"
EOF
    chmod +x "$backup_dir/restore.sh"
    
    log_success "Backup completed: $backup_dir"
    echo "Backup includes:"
    ls -la "$backup_dir"
}

# Function to update Docker and tools
update_docker_tools() {
    log_header "=== Updating Docker Tools ==="
    
    log_info "Updating package lists..."
    sudo apt update
    
    # Update Docker if available
    if apt list --upgradable 2>/dev/null | grep -q docker; then
        log_info "Docker updates available"
        read -p "Update Docker? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo apt upgrade docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            log_success "Docker updated"
        fi
    else
        log_info "Docker is up to date"
    fi
    
    # Update Docker Compose if needed
    local current_version=$(docker-compose --version | grep -o '[0-9.]*' | head -1)
    local latest_version=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep -o '"tag_name": "v[^"]*' | cut -d'"' -f4 | sed 's/v//')
    
    if [[ "$current_version" != "$latest_version" ]]; then
        log_info "Docker Compose update available: $current_version -> $latest_version"
        read -p "Update Docker Compose? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo curl -L "https://github.com/docker/compose/releases/download/v${latest_version}/docker-compose-$(uname -s)-$(uname -m)" \
                -o /usr/local/bin/docker-compose
            sudo chmod +x /usr/local/bin/docker-compose
            log_success "Docker Compose updated to $latest_version"
        fi
    else
        log_info "Docker Compose is up to date"
    fi
}

# Function to show help
show_help() {
    echo "EchoTune AI - Docker Management Tool"
    echo
    echo "Usage: $0 [command]"
    echo
    echo "Commands:"
    echo "  check          - Check Docker installation and status"
    echo "  analyze        - Analyze container performance"
    echo "  optimize       - Full optimization (images, networks, volumes)"
    echo "  monitor        - Real-time container monitoring"
    echo "  report         - Generate health report"
    echo "  backup         - Backup Docker configurations"
    echo "  update         - Update Docker tools"
    echo "  images         - Optimize Docker images only"
    echo "  networks       - Optimize Docker networks only"
    echo "  volumes        - Optimize Docker volumes only"
    echo "  cleanup        - Full system cleanup"
    echo "  help           - Show this help message"
    echo
    echo "Examples:"
    echo "  $0 check           # Quick system check"
    echo "  $0 optimize        # Full optimization"
    echo "  $0 monitor         # Real-time monitoring"
}

# Main command handler
case "${1:-help}" in
    "check")
        check_docker
        ;;
    "analyze")
        check_docker
        analyze_performance
        ;;
    "optimize")
        check_docker
        optimize_images
        optimize_networks
        optimize_volumes
        log_success "Full optimization completed"
        ;;
    "monitor")
        check_docker
        monitor_containers
        ;;
    "report")
        check_docker
        create_health_report
        ;;
    "backup")
        backup_docker_data
        ;;
    "update")
        update_docker_tools
        ;;
    "images")
        check_docker
        optimize_images
        ;;
    "networks")
        check_docker
        optimize_networks
        ;;
    "volumes")
        check_docker
        optimize_volumes
        ;;
    "cleanup")
        check_docker
        docker system prune -af --volumes
        log_success "System cleanup completed"
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        log_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac