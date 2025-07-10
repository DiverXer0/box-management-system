#!/bin/bash
# startup.sh - Startup script for all-in-one container

# Create necessary directories
mkdir -p /var/log/supervisor
mkdir -p /var/log/mongodb
mkdir -p /var/log/backend
mkdir -p /var/log/nginx
mkdir -p /data/db

# Initialize MongoDB if needed
if [ ! -f /data/db/.initialized ]; then
    echo "Initializing MongoDB..."
    mongod --fork --logpath /var/log/mongodb/init.log --dbpath /data/db
    sleep 5
    
    # Create database and indexes
    mongosh --eval "
        use box_management;
        db.createCollection('boxes');
        db.createCollection('items');
        db.boxes.createIndex({name: 1});
        db.boxes.createIndex({location: 1});
        db.items.createIndex({name: 1});
        db.items.createIndex({box_id: 1});
    "
    
    # Stop MongoDB (supervisor will start it properly)
    mongod --shutdown
    touch /data/db/.initialized
    echo "MongoDB initialized!"
fi

# Start supervisor
echo "Starting all services..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf