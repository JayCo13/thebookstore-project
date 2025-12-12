#!/bin/bash

# SSL Setup Script for tamnguon.com
# Run this on your VPS

set -e

DOMAIN="tamnguon.com"
EMAIL="thebookstore.vn@gmail.com"  # Change this to your email

echo "🔐 Setting up SSL for $DOMAIN"
echo "================================"

# Create required directories
mkdir -p ./certbot/www
mkdir -p ./certbot/conf

# Step 1: Make sure containers are running
echo ""
echo "📦 Starting services..."
docker compose -f docker-compose.prod.yml up -d

# Wait for nginx to be ready
sleep 5

# Step 2: Get SSL certificate
echo ""
echo "🔑 Obtaining SSL certificate..."
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN \
    -d www.$DOMAIN

# Step 3: Check if certificate was obtained
if [ -d "./certbot/conf/live/$DOMAIN" ]; then
    echo ""
    echo "✅ SSL certificate obtained successfully!"
    echo ""
    echo "📝 Now you need to:"
    echo "   1. Update nginx.conf to enable HTTPS (already done if you pulled latest)"
    echo "   2. Restart nginx: docker compose -f docker-compose.prod.yml restart nginx"
    echo ""
    echo "🔄 Certificate will auto-renew via the certbot container"
else
    echo ""
    echo "❌ Failed to obtain certificate. Check the logs above for errors."
    echo ""
    echo "Common issues:"
    echo "  - DNS not pointing to this server yet (A record needed)"
    echo "  - Port 80 not accessible from internet"
    echo "  - Domain not resolving correctly"
fi
