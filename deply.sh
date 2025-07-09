#!/bin/bash

# deploy.sh - Box Management System Deployment Script

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check requirements
check_requirements() {
    print_status "Checking requirements..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_status "All requirements met!"
}

# Create directory structure
create_directories() {
    print_status "Creating directory structure..."
    
    mkdir -p backend
    mkdir -p frontend/src
    mkdir -p frontend/public
    mkdir -p nginx/ssl
    
    print_status "Directory structure created!"
}

# Backup database
backup_database() {
    if [ "$1" == "prod" ]; then
        print_status "Creating database backup..."
        
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        BACKUP_DIR="./backups"
        mkdir -p $BACKUP_DIR
        
        docker-compose -f docker-compose.prod.yml exec -T mongodb mongodump --archive > "$BACKUP_DIR/mongodb_backup_$TIMESTAMP.dump"
        
        print_status "Database backed up to $BACKUP_DIR/mongodb_backup_$TIMESTAMP.dump"
    fi
}

# Deploy development environment
deploy_dev() {
    print_status "Deploying development environment..."
    
    # Check if .env file exists
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating from example..."
        cat > .env << EOF
# Development Environment Variables
NODE_ENV=development
REACT_APP_API_URL=http://localhost:8000/api
EOF
    fi
    
    # Build and start containers
    docker-compose down
    docker-compose build
    docker-compose up -d
    
    # Wait for services to be ready
    print_status "Waiting for services to start..."
    sleep 10
    
    # Check health
    if curl -f http://localhost:8000/api/health > /dev/null 2>&1; then
        print_status "Backend is healthy!"
    else
        print_error "Backend health check failed!"
    fi
    
    print_status "Development environment deployed!"
    print_status "Frontend: http://localhost:3000"
    print_status "Backend API: http://localhost:8000/api"
    print_status "API Documentation: http://localhost:8000/docs"
}

# Deploy production environment
deploy_prod() {
    print_status "Deploying production environment..."
    
    # Backup existing data
    backup_database "prod"
    
    # Check if .env.prod file exists
    if [ ! -f ".env.prod" ]; then
        print_error ".env.prod file not found. Please create it with production settings."
        exit 1
    fi
    
    # Load production environment variables
    export $(cat .env.prod | xargs)
    
    # Build and start containers
    docker-compose -f docker-compose.prod.yml down
    docker-compose -f docker-compose.prod.yml build
    docker-compose -f docker-compose.prod.yml up -d
    
    # Wait for services to be ready
    print_status "Waiting for services to start..."
    sleep 15
    
    # Check health
    if curl -f http://localhost/health > /dev/null 2>&1; then
        print_status "Production deployment successful!"
    else
        print_error "Production health check failed!"
    fi
    
    print_status "Production environment deployed!"
    print_status "Application: http://localhost (configure your domain)"
}

# Stop all containers
stop_all() {
    print_status "Stopping all containers..."
    docker-compose down
    docker-compose -f docker-compose.prod.yml down
    print_status "All containers stopped!"
}

# Show logs
show_logs() {
    service=$1
    if [ -z "$service" ]; then
        docker-compose logs -f
    else
        docker-compose logs -f $service
    fi
}

# Restore database
restore_database() {
    backup_file=$1
    if [ -z "$backup_file" ]; then
        print_error "Please provide a backup file path"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        print_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    print_status "Restoring database from $backup_file..."
    docker-compose -f docker-compose.prod.yml exec -T mongodb mongorestore --archive < "$backup_file"
    print_status "Database restored successfully!"
}

# Main menu
show_menu() {
    echo -e "\n${GREEN}Box Management System Deployment${NC}"
    echo "=================================="
    echo "1. Deploy Development Environment"
    echo "2. Deploy Production Environment"
    echo "3. Stop All Containers"
    echo "4. Show Logs"
    echo "5. Backup Database"
    echo "6. Restore Database"
    echo "7. Exit"
    echo
}

# Main script
main() {
    check_requirements
    create_directories
    
    if [ $# -eq 0 ]; then
        # Interactive mode
        while true; do
            show_menu
            read -p "Enter your choice [1-7]: " choice
            
            case $choice in
                1) deploy_dev ;;
                2) deploy_prod ;;
                3) stop_all ;;
                4) 
                    read -p "Enter service name (or press Enter for all): " service
                    show_logs $service
                    ;;
                5) backup_database "prod" ;;
                6) 
                    read -p "Enter backup file path: " backup_file
                    restore_database $backup_file
                    ;;
                7) 
                    print_status "Exiting..."
                    exit 0
                    ;;
                *) print_error "Invalid choice!" ;;
            esac
        done
    else
        # Command line mode
        case $1 in
            dev) deploy_dev ;;
            prod) deploy_prod ;;
            stop) stop_all ;;
            logs) show_logs $2 ;;
            backup) backup_database "prod" ;;
            restore) restore_database $2 ;;
            *) 
                print_error "Invalid command!"
                echo "Usage: $0 [dev|prod|stop|logs|backup|restore]"
                exit 1
                ;;
        esac
    fi
}

# Run main function
main $@