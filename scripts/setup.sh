#!/bin/bash

# AI Agents Platform Development Setup
set -e

echo "🚀 Setting up AI Agents Platform development environment..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    REQUIRED_VERSION="18.0.0"
    
    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
        log_error "Node.js version $NODE_VERSION is not supported. Please upgrade to Node.js 18+"
        exit 1
    fi
    
    log_info "Node.js version $NODE_VERSION ✅"
}

# Check if npm is installed
check_npm() {
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    log_info "npm $(npm -v) ✅"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    npm ci
    log_info "Dependencies installed ✅"
}

# Setup environment file
setup_env() {
    if [ ! -f ".env" ]; then
        log_info "Creating .env file from template..."
        cp .env.example .env
        log_warn "Please update .env file with your actual configuration values"
    else
        log_info ".env file already exists ✅"
    fi
}

# Setup Git hooks
setup_git_hooks() {
    if [ -d ".git" ]; then
        log_info "Setting up Git hooks..."
        npx husky install
        npx husky add .husky/pre-commit "npm run precommit"
        npx husky add .husky/commit-msg "npx commitlint --edit"
        log_info "Git hooks configured ✅"
    else
        log_warn "Not a Git repository, skipping Git hooks setup"
    fi
}

# Create necessary directories
create_directories() {
    log_info "Creating necessary directories..."
    mkdir -p logs
    mkdir -p uploads
    mkdir -p temp
    log_info "Directories created ✅"
}

# Setup Docker environment
setup_docker() {
    if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
        log_info "Setting up Docker development environment..."
        docker-compose up -d mongo redis
        log_info "Docker services started ✅"
        log_info "MongoDB: localhost:27017"
        log_info "Redis: localhost:6379"
    else
        log_warn "Docker not found, skipping Docker setup"
        log_warn "You'll need to set up MongoDB and Redis manually"
    fi
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    npm run migrate
    log_info "Database migrations completed ✅"
}

# Setup development data
setup_dev_data() {
    read -p "Do you want to seed the database with development data? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Seeding database with development data..."
        npm run seed
        log_info "Development data seeded ✅"
    fi
}

# Verify setup
verify_setup() {
    log_info "Verifying setup..."
    
    # Check if we can start the server
    timeout 30s npm run dev &
    SERVER_PID=$!
    
    sleep 10
    
    if curl -f http://localhost:3000/api/v1/health > /dev/null 2>&1; then
        log_info "Server health check passed ✅"
        kill $SERVER_PID 2>/dev/null || true
    else
        log_error "Server health check failed"
        kill $SERVER_PID 2>/dev/null || true
        exit 1
    fi
}

# Main setup function
main() {
    log_info "Starting development environment setup..."
    
    check_node
    check_npm
    install_dependencies
    setup_env
    create_directories
    setup_git_hooks
    setup_docker
    
    # Wait a bit for Docker services to start
    if command -v docker &> /dev/null; then
        log_info "Waiting for Docker services to be ready..."
        sleep 10
    fi
    
    run_migrations
    setup_dev_data
    verify_setup
    
    log_info "🎉 Development environment setup completed!"
    echo
    echo "Next steps:"
    echo "1. Update your .env file with actual API keys and configuration"
    echo "2. Start the development server: npm run dev"
    echo "3. Visit http://localhost:3000/api/v1/health to verify"
    echo "4. Visit http://localhost:3000/api-docs for API documentation"
    echo
    echo "Happy coding! 🚀"
}

# Run setup
main
