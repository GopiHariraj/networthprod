#!/bin/bash
# Complete deployment script for removing login page

echo "🚀 Deploying networth app - Login page removed"
echo "=============================================="

cd ~/Networth-app || exit 1

echo "📥 Pulling latest code..."
git pull origin main

echo "📝 Creating production environment file..."
cat > networth-frontend/.env.production << 'EOF'
NEXT_PUBLIC_API_URL=http://34.16.36.153/api
EOF

echo "✅ Environment file created:"
cat networth-frontend/.env.production

echo "🛑 Stopping containers..."
docker-compose down

echo "🔨 Rebuilding containers (no cache)..."
docker-compose build --no-cache

echo "▶️  Starting containers..."
docker-compose up -d

echo "⏳ Waiting for containers to start..."
sleep 60

echo "📊 Container status:"
docker-compose ps

echo ""
echo "✅ Deployment complete!"
echo "🌐 Visit: http://34.16.36.153"
echo "📝 Note: Login page has been completely removed"
echo "✨ You should go directly to the dashboard"
