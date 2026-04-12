#!/usr/bin/env bash
# ============================================================
# Tech Guardian — EspoCRM customization installer
#
# This script copies the custom entity files into a running
# EspoCRM Docker container and rebuilds the cache so the
# RepairTicket entity appears immediately.
#
# Usage:
#   ./install.sh                 # uses default container name
#   ./install.sh my-container    # specify a custom container name
# ============================================================

set -euo pipefail

CONTAINER="${1:-techguardian-crm}"
CUSTOM_SRC="$(cd "$(dirname "$0")/custom" && pwd)"

echo "Tech Guardian — EspoCRM customization installer"
echo "================================================"
echo "Container: $CONTAINER"
echo "Source:    $CUSTOM_SRC"
echo ""

# Verify the container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    echo "ERROR: Container '$CONTAINER' is not running."
    echo "Start it first: docker compose up -d"
    exit 1
fi

# Copy custom files into the container
echo "[1/4] Copying custom entity files..."
docker cp "$CUSTOM_SRC/." "${CONTAINER}:/var/www/html/custom/"

# Fix file ownership so Apache can read them
echo "[2/4] Fixing file permissions..."
docker exec "$CONTAINER" chown -R www-data:www-data /var/www/html/custom/

# Rebuild EspoCRM's metadata cache
echo "[3/4] Rebuilding EspoCRM cache..."
docker exec "$CONTAINER" php command.php rebuild

# Verify the entity exists
echo "[4/4] Verifying RepairTicket entity..."
RESULT=$(docker exec "$CONTAINER" php -r "
    require_once 'bootstrap.php';
    \$app = new \Espo\Core\Application();
    \$app->setupSystemUser();
    \$metadata = \$app->getContainer()->getByClass(\Espo\Core\Utils\Metadata::class);
    echo \$metadata->get('scopes.RepairTicket.entity') ? 'OK' : 'MISSING';
" 2>/dev/null || echo "SKIP")

if [ "$RESULT" = "OK" ]; then
    echo ""
    echo "RepairTicket entity installed and verified."
elif [ "$RESULT" = "SKIP" ]; then
    echo ""
    echo "Cache rebuilt (entity verification skipped — check the UI)."
else
    echo ""
    echo "WARNING: RepairTicket entity not found after rebuild."
    echo "Try clearing your browser cache and refreshing EspoCRM."
fi

echo ""
echo "================================================"
echo "Next steps:"
echo "  1. Log in at ${ESPOCRM_SITE_URL:-http://localhost:8080}"
echo "  2. Go to Admin > Rebuild (top right menu)"
echo "  3. Repair Tickets should appear in the top nav"
echo "  4. Build workflows — see docs/WORKFLOWS.md"
echo "  5. Set up dashboard — see docs/DASHBOARD.md"
echo "================================================"
