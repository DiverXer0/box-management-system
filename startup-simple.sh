#!/bin/sh
# Simple startup script

# Create directories
mkdir -p /data/db /var/log/mongodb /var/log/supervisor /var/log/backend /var/log/nginx

# Start supervisor
/usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf