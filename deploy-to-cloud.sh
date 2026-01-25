#!/bin/bash
# Deployment script for Google Cloud
# Run this after pushing code to GitHub

echo "🚀 Starting deployment to Google Cloud..."

# Navigate to app directory on cloud server
# Navigate to app directory on cloud server
cd ~/Networth2 || cd /home/gopihariraj2/Networth2 || cd /home/gopiadmin/Networth2 || cd /home/gopiadmin/networth-app || cd ~/networth-app || {
    echo "❌ Error: Could not find app directory (checked Networth2, networth-app)"
    exit 1
}

echo "📥 Pulling latest code from GitHub..."
git pull origin main

echo "🔨 Rebuilding and restarting Docker containers..."
docker-compose -f docker-compose.prod.yml up -d --build

echo "✅ Deployment complete!"
echo ""
echo "📊 Container status:"
docker-compose -f docker-compose.prod.yml ps
