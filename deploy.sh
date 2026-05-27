#!/bin/bash
# ═══════════════════════════════════════════════════════
# Curaé — Script de déploiement
# Compatible Ubuntu 22.04 / Debian 12
# Usage: bash deploy.sh
# ═══════════════════════════════════════════════════════

set -e
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log() { echo -e "${GREEN}[Curaé]${NC} $1"; }
warn() { echo -e "${YELLOW}[Warn]${NC} $1"; }
err() { echo -e "${RED}[Erreur]${NC} $1"; exit 1; }

log "🫀 Déploiement Curaé v1.0.0"
log "================================"

# ── Vérifications ────────────────────────────────────────
[ "$(id -u)" -ne 0 ] && err "Lancez avec sudo ou en root"
[ ! -f ".env" ] && err "Fichier .env manquant — copier .env.production.example en .env"

# ── Dépendances système ──────────────────────────────────
log "Installation des dépendances système..."
apt-get update -qq
apt-get install -y -qq curl git ufw nginx certbot python3-certbot-nginx

# ── Docker ───────────────────────────────────────────────
if ! command -v docker &> /dev/null; then
  log "Installation de Docker..."
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker $SUDO_USER 2>/dev/null || true
fi

if ! command -v docker-compose &> /dev/null; then
  log "Installation de Docker Compose..."
  curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
fi

log "Docker $(docker --version | cut -d' ' -f3 | tr -d ',')"

# ── Firewall ─────────────────────────────────────────────
log "Configuration firewall..."
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable
log "Firewall: SSH + HTTP + HTTPS autorisés"

# ── Build et démarrage ───────────────────────────────────
log "Build des images Docker..."
docker-compose build --no-cache

log "Démarrage des services..."
docker-compose up -d postgres

log "Attente PostgreSQL..."
sleep 10

log "Migrations base de données..."
docker-compose run --rm backend node dist/lib/migrate.js
docker-compose run --rm backend node dist/lib/migrate_abonnements.js
docker-compose run --rm backend node dist/lib/seed.js

log "Démarrage complet..."
docker-compose up -d

# ── Vérification ─────────────────────────────────────────
log "Vérification des services..."
sleep 15

if curl -sf http://localhost:4000/health > /dev/null; then
  log "✅ API backend opérationnelle"
else
  warn "⚠ API backend ne répond pas encore (attendre 30s)"
fi

if curl -sf http://localhost/health > /dev/null; then
  log "✅ Frontend opérationnel"
else
  warn "⚠ Frontend ne répond pas encore"
fi

# ── SSL (optionnel si domaine configuré) ─────────────────
if grep -q "https://" .env 2>/dev/null; then
  DOMAIN=$(grep FRONTEND_URL .env | cut -d= -f2 | sed 's|https://||' | sed 's|/.*||')
  if [ -n "$DOMAIN" ] && [ "$DOMAIN" != "localhost" ]; then
    log "Configuration SSL pour $DOMAIN..."
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@"$DOMAIN" || warn "SSL échoué — configurer manuellement"
  fi
fi

# ── Résumé ───────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}  Curaé déployé avec succès ! 🫀${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo "  Frontend  → http://$(curl -s ifconfig.me 2>/dev/null || echo 'VOTRE_IP')"
echo "  API       → http://$(curl -s ifconfig.me 2>/dev/null || echo 'VOTRE_IP'):4000/health"
echo ""
echo "  Logs      → docker-compose logs -f"
echo "  Arrêt     → docker-compose down"
echo "  Mise à jour → git pull && docker-compose up -d --build"
echo ""
echo "  Credentials démo:"
echo "  Email     → dr.kone@cabinet-cardio-abidjan.ci"
echo "  Mot de passe → curae2025"
echo ""
