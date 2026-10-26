#!/usr/bin/env bash
set -e

# ==============================================================================
# QELVORA SCHOOL CRM - DIGITALOCEAN DROPLET ISOLATED DEPLOYMENT SCRIPT
# Safe for shared VPS running other applications (INKCRM, Physioedvance, etc.)
# ==============================================================================

DOMAIN="${1:-}"
SSL_EMAIL="${2:-admin@$DOMAIN}"

echo "========================================================="
echo " Starting Qelvora School CRM Deployment on DigitalOcean"
echo " Time: $(date)"
echo " Domain: ${DOMAIN:-'(None specified)'}"
echo "========================================================="

# 1. Ensure user is in docker group or running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run this script with sudo: sudo ./deploy_droplet.sh $DOMAIN $SSL_EMAIL"
    exit 1
fi

# 2. Memory protection: Add 2GB Swap if missing (prevents OOM on 2GB RAM droplets)
TOTAL_SWAP=$(free -m | awk '/^Swap:/ {print $2}')
if [ "$TOTAL_SWAP" -lt 512 ] && [ ! -f "/swapfile" ]; then
    echo "🛡️ Adding 2GB swap file to protect existing applications from memory exhaustion..."
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "✅ Swap memory enabled."
fi

# 3. Detect Docker & Compose
if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable --now docker
    rm get-docker.sh
fi

COMPOSE_CMD="docker compose"
if ! docker compose version &> /dev/null; then
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    else
        echo "📦 Installing Docker Compose plugin..."
        apt-get update && apt-get install -y docker-compose-plugin
    fi
fi

# 4. Environment File & Configuration
rm -f docker-compose.override.yml
if [ ! -f ".env" ]; then
    echo "⚙️ Creating isolated .env from .env.example..."
    cp .env.example .env
    RANDOM_JWT=$(openssl rand -hex 32 2>/dev/null || echo "prod_school_crm_jwt_$(date +%s)")
    sed -i "s/super_secret_jwt_key_school_crm_platform_2026/$RANDOM_JWT/g" .env
fi

# 5. Build & Launch Qelvora School CRM isolated containers
# Only touches school_crm containers — completely ignores any other Docker containers
echo "🚀 Building and starting Qelvora School CRM containers..."
$COMPOSE_CMD -f docker-compose.yml down --remove-orphans || true
$COMPOSE_CMD -f docker-compose.yml up -d --build

# 6. Wait for database and gateway to become healthy
echo "⏳ Waiting for services to initialize..."
sleep 10

# 7. Push Prisma schema & migrate
echo "🔄 Synchronizing database tables with Prisma..."
$COMPOSE_CMD -f docker-compose.yml exec -T gateway npx prisma db push --accept-data-loss

# 8. Seed demo data if database is fresh
echo "🌱 Checking demo seed data..."
$COMPOSE_CMD -f docker-compose.yml exec -T gateway node scripts/seedMasterDemoData.js || echo "Seed completed or skipped."

# 9. Configure Host Nginx (ISOLATED - does NOT touch any other sites)
if [ -n "$DOMAIN" ]; then
    echo "🌐 Setting up dedicated Nginx reverse proxy for $DOMAIN..."
    apt-get update && apt-get install -y nginx certbot python3-certbot-nginx

    NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"
    cat <<EOF > "$NGINX_CONF"
server {
    listen 80;
    server_name $DOMAIN;
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3850;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

    # Enable only this site (DO NOT touch any other existing sites)
    ln -sf "$NGINX_CONF" "/etc/nginx/sites-enabled/$DOMAIN"
    nginx -t && systemctl reload nginx
    echo "✅ Nginx reloaded for $DOMAIN."

    # 10. Let's Encrypt SSL
    echo "🔒 Requesting Let's Encrypt SSL certificate for $DOMAIN..."
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$SSL_EMAIL" --redirect || {
        echo "⚠️ Certbot challenge failed. Make sure your domain's DNS A Record points to this Droplet's IP."
    }
fi

echo "========================================================="
echo " 🎉 Qelvora School CRM Deployment Completed!"
echo " 🌐 All other apps & databases remain untouched and running."
if [ -n "$DOMAIN" ]; then
    echo " 🌍 Application URL: https://$DOMAIN"
else
    echo " 🌍 Application Port: http://127.0.0.1:3850"
fi
echo "========================================================="
