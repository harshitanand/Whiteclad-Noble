#!/bin/bash

# AI Agents Platform Deployment Script
set -e

echo "🚀 Starting deployment of AI Agents Platform..."

# Configuration
APP_NAME="ai-agents-platform"
DOCKER_REGISTRY="${DOCKER_REGISTRY:-your-registry.com}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
ENVIRONMENT="${ENVIRONMENT:-production}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check required tools
check_requirements() {
    log_info "Checking deployment requirements..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    log_info "Requirements check passed ✅"
}

# Build Docker image
build_image() {
    log_info "Building Docker image..."
    
    docker build \
        --target production \
        --tag ${APP_NAME}:${IMAGE_TAG} \
        --tag ${APP_NAME}:latest \
        .
    
    log_info "Docker image built successfully ✅"
}

# Run tests
run_tests() {
    log_info "Running tests..."
    
    # Create test container
    docker run --rm \
        --env NODE_ENV=test \
        --name ${APP_NAME}-test \
        ${APP_NAME}:${IMAGE_TAG} \
        npm test
    
    log_info "Tests passed ✅"
}

# Security scan
security_scan() {
    log_info "Running security scan..."
    
    # Check if trivy is available
    if command -v trivy &> /dev/null; then
        trivy image --exit-code 1 --severity HIGH,CRITICAL ${APP_NAME}:${IMAGE_TAG}
        log_info "Security scan passed ✅"
    else
        log_warn "Trivy not found, skipping security scan"
    fi
}

# Deploy to production
deploy_production() {
    log_info "Deploying to production..."
    
    # Check if .env.production exists
    if [ ! -f ".env.production" ]; then
        log_error ".env.production file not found"
        exit 1
    fi
    
    # Create backup of current deployment
    log_info "Creating backup..."
    docker-compose -f docker-compose.prod.yml exec -T mongo mongodump --out /backups/backup-$(date +%Y%m%d-%H%M%S)
    
    # Pull latest images and deploy
    docker-compose -f docker-compose.prod.yml pull
    docker-compose -f docker-compose.prod.yml up -d --remove-orphans
    
    # Wait for health check
    log_info "Waiting for application to be healthy..."
    for i in {1..30}; do
        if curl -f http://localhost/api/v1/health > /dev/null 2>&1; then
            log_info "Application is healthy ✅"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "Application failed to become healthy"
            exit 1
        fi
        sleep 10
    done
    
    # Clean up old images
    docker image prune -f
    
    log_info "Production deployment completed successfully ✅"
}

# Deploy to staging
deploy_staging() {
    log_info "Deploying to staging..."
    
    # Use staging compose file
    docker-compose -f docker-compose.staging.yml up -d --build
    
    log_info "Staging deployment completed ✅"
}

# Rollback deployment
rollback() {
    log_warn "Rolling back deployment..."
    
    # Get previous image tag from Docker registry or local backup
    PREVIOUS_TAG=$(docker images ${APP_NAME} --format "table {{.Tag}}" | head -2 | tail -1)
    
    if [ -z "$PREVIOUS_TAG" ]; then
        log_error "No previous version found for rollback"
        exit 1
    fi
    
    log_info "Rolling back to tag: $PREVIOUS_TAG"
    
    # Update image tag and redeploy
    export IMAGE_TAG=$PREVIOUS_TAG
    docker-compose -f docker-compose.prod.yml up -d
    
    log_info "Rollback completed ✅"
}

# Main deployment function
main() {
    case "${1:-deploy}" in
        "build")
            check_requirements
            build_image
            ;;
        "test")
            check_requirements
            build_image
            run_tests
            ;;
        "deploy")
            check_requirements
            build_image
            run_tests
            security_scan
            if [ "$ENVIRONMENT" = "production" ]; then
                deploy_production
            else
                deploy_staging
            fi
            ;;
        "rollback")
            rollback
            ;;
        *)
            echo "Usage: $0 {build|test|deploy|rollback}"
            echo "Environment variables:"
            echo "  ENVIRONMENT: production|staging (default: production)"
            echo "  IMAGE_TAG: Docker image tag (default: latest)"
            echo "  DOCKER_REGISTRY: Docker registry URL"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
