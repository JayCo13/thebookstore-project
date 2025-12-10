#!/bin/bash

# SSL Setup Script using Let's Encrypt
# Run this AFTER docker-compose is running (without SSL)

# Configuration
DOMAIN="tamnguon.com"
EMAIL="admin@tamnguon.com"

echo "=== SSL Certificate Setup for $DOMAIN ==="

# Create certbot directories
mkdir -p certbot/www certbot/conf

# Step 1: Get initial certificate
echo "Step 1: Obtaining SSL certificate..."
docker-compose -f docker-compose.prod.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN \
    -d www.$DOMAIN

# Step 2: Update nginx config
echo "Step 2: Update nginx/nginx.conf:"
echo "  1. Replace 'yourdomain.com' with your actual domain"
echo "  2. Uncomment the HTTPS server block"
echo "  3. Uncomment the HTTP to HTTPS redirect"

# Step 3: Reload nginx
echo "Step 3: Reloading nginx..."
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload

echo ""
echo "=== SSL Setup Complete ==="
echo "Your site should now be available at https://$DOMAIN"
echo ""
echo "Certificate will auto-renew via certbot container."
