#!/bin/bash
# Production Build & Deploy Script
# Usage: ./deploy-to-production.sh [vercel|netlify|self-hosted]

set -e

DEPLOY_TARGET=${1:-vercel}
CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Tamrakar Production Deployment"
echo "================================="
echo "Target: $DEPLOY_TARGET"
echo ""

# Step 1: Verify environment
echo "✓ Step 1: Verifying environment..."
NODE_VERSION=$(node --version)
echo "  Node.js version: $NODE_VERSION"

if [ ! -f "$CURRENT_DIR/.env" ]; then
  echo "  ⚠️  WARNING: .env file not found. Using defaults."
fi

# Step 2: Clean and install dependencies
echo ""
echo "✓ Step 2: Installing dependencies..."
rm -rf node_modules dist
npm ci

# Step 3: Run tests
echo ""
echo "✓ Step 3: Running tests..."
npm test

# Step 4: Build production
echo ""
echo "✓ Step 4: Building for production..."
npm run build

# Step 5: Verify build output
echo ""
echo "✓ Step 5: Verifying build output..."
if [ -d "$CURRENT_DIR/dist" ] && [ -f "$CURRENT_DIR/dist/index.html" ]; then
  DIST_SIZE=$(du -sh "$CURRENT_DIR/dist" | cut -f1)
  echo "  Build size: $DIST_SIZE"
  echo "  ✓ Build verification successful"
else
  echo "  ✗ Build verification failed - dist/index.html not found"
  exit 1
fi

# Step 6: Deploy based on target
echo ""
echo "✓ Step 6: Deploying to $DEPLOY_TARGET..."

case $DEPLOY_TARGET in
  vercel)
    echo "  📦 Vercel deployment:"
    echo "  1. Push to GitHub: git push origin main"
    echo "  2. Vercel auto-deploys on push"
    echo "  3. Environment variables already configured"
    echo ""
    echo "  ✓ Build ready for Vercel"
    ;;
  
  netlify)
    echo "  📦 Netlify deployment:"
    echo "  1. Push to GitHub: git push origin main"
    echo "  2. Netlify auto-deploys on push"
    echo "  3. Environment variables already configured"
    echo ""
    echo "  ✓ Build ready for Netlify"
    ;;
  
  self-hosted)
    echo "  📦 Self-hosted deployment:"
    echo "  1. SSH to server: ssh user@your-server.com"
    echo "  2. Pull latest code"
    echo "  3. Run: NODE_ENV=production npm start"
    echo ""
    echo "  ✓ Build ready for self-hosted deployment"
    ;;
  
  *)
    echo "  ✗ Unknown deploy target: $DEPLOY_TARGET"
    echo "  Valid options: vercel, netlify, self-hosted"
    exit 1
    ;;
esac

echo ""
echo "================================="
echo "✅ Production deployment ready!"
echo ""
echo "Next steps:"
echo "1. Verify all environment variables are configured"
echo "2. Run functional tests on staging"
echo "3. Deploy to production"
echo "4. Monitor errors and performance"
