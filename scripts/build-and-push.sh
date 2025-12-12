#!/bin/bash

# Build and Push Docker Images to Docker Hub
# Usage: ./scripts/build-and-push.sh [version]
# Example: ./scripts/build-and-push.sh v1.0.0

set -e

DOCKER_USERNAME="jayden1110"
VERSION="${1:-latest}"

echo "🐳 Building and pushing images with tag: $VERSION"
echo "================================================"

# Login to Docker Hub (will prompt for password if not already logged in)
echo "📝 Checking Docker Hub login..."
docker login

# Build and push backend
echo ""
echo "🔧 Building backend image..."
docker build -t $DOCKER_USERNAME/bookstore-backend:$VERSION ./bookstore-backend
docker tag $DOCKER_USERNAME/bookstore-backend:$VERSION $DOCKER_USERNAME/bookstore-backend:latest

echo "📤 Pushing backend image..."
docker push $DOCKER_USERNAME/bookstore-backend:$VERSION
docker push $DOCKER_USERNAME/bookstore-backend:latest

# Build and push frontend
# Note: Frontend needs build args, so we pass them from .env
echo ""
echo "🔧 Building frontend image..."
source .env 2>/dev/null || true
docker build \
  --build-arg REACT_APP_API_URL="${REACT_APP_API_URL:-http://localhost:8000}" \
  --build-arg REACT_APP_GHN_API_TOKEN="${REACT_APP_GHN_API_TOKEN}" \
  --build-arg REACT_APP_GHN_SHOP_ID="${REACT_APP_GHN_SHOP_ID}" \
  --build-arg REACT_APP_GHN_API_BASE_URL="${REACT_APP_GHN_API_BASE_URL:-https://online-gateway.ghn.vn/shiip/public-api}" \
  -t $DOCKER_USERNAME/bookstore-frontend:$VERSION \
  ./bookstore-ui
docker tag $DOCKER_USERNAME/bookstore-frontend:$VERSION $DOCKER_USERNAME/bookstore-frontend:latest

echo "📤 Pushing frontend image..."
docker push $DOCKER_USERNAME/bookstore-frontend:$VERSION
docker push $DOCKER_USERNAME/bookstore-frontend:latest

echo ""
echo "✅ All images built and pushed successfully!"
echo ""
echo "Images available on Docker Hub:"
echo "  - $DOCKER_USERNAME/bookstore-backend:$VERSION"
echo "  - $DOCKER_USERNAME/bookstore-frontend:$VERSION"
echo ""
echo "On your VPS, run:"
echo "  docker compose -f docker-compose.prod.yml pull"
echo "  docker compose -f docker-compose.prod.yml up -d"
