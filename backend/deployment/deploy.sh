#!/bin/bash

# GameHub Production Deployment Helper Script
# Run this on your Ubuntu EC2 instance

set -e

echo "🚀 Starting GameHub Deployment..."

# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install dependencies
sudo apt install -y nginx docker.io docker-compose certbot python3-certbot-nginx git

# 3. Enable and start services
echo "⚙️ Enabling Nginx..."
sudo systemctl enable --now nginx

# 4. Setup Docker permissions
echo "🐳 Setting up Docker permissions..."
sudo usermod -aG docker $USER
newgrp docker || true

# 5. Validate nginx config exists
if [ ! -f "./nginx.conf" ]; then
  echo "❌ nginx.conf not found in current directory"
  exit 1
fi

# 6. Setup Nginx Config
echo "⚙️ Configuring Nginx..."
sudo cp ./nginx.conf /etc/nginx/sites-available/gamehub
sudo ln -sf /etc/nginx/sites-available/gamehub /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx config before restart
sudo nginx -t

# Restart nginx to apply changes
sudo systemctl restart nginx

# 7. Firewall Setup (safe order)
echo "🛡️ Setting up firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# 8. Final checks
echo ""
echo "--------------------------------------------------------"
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Point your domain A records to this server's IP"
echo "2. Wait for DNS propagation (5 min - 24 hours)"
echo "3. Run SSL setup:"
echo ""
echo "   sudo certbot --nginx -d my-gamehub.com -d api.my-gamehub.com"
echo ""
echo "4. Start backend:"
echo ""
echo "   docker compose up -d --build"
echo ""
echo "--------------------------------------------------------"