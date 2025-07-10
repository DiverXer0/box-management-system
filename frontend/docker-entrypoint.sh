#!/bin/sh
# frontend/docker-entrypoint.sh

# This script allows runtime configuration of the React app
# It replaces placeholders in the built files with actual environment values

# Function to replace environment variables in JavaScript files
replace_env_vars() {
    # Find all JS files in the build directory
    find /usr/share/nginx/html -name "*.js" -type f -exec sh -c '
        # Create a temporary file
        temp_file=$(mktemp)
        
        # Replace REACT_APP_API_URL placeholder if it exists
        if [ -n "$REACT_APP_API_URL" ]; then
            sed "s|REACT_APP_API_URL:\".*\"|REACT_APP_API_URL:\"$REACT_APP_API_URL\"|g" "$1" > "$temp_file"
        else
            cp "$1" "$temp_file"
        fi
        
        # Move the temporary file back
        mv "$temp_file" "$1"
    ' _ {} \;
}

# Only replace if REACT_APP_API_URL is set
if [ -n "$REACT_APP_API_URL" ]; then
    echo "Setting REACT_APP_API_URL to: $REACT_APP_API_URL"
    replace_env_vars
else
    echo "Using dynamic API URL detection"
fi

# Execute the main command
exec "$@"