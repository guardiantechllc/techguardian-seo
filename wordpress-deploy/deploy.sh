#!/bin/bash
# ============================================
# TECH GUARDIAN - DEPLOY SCRIPT
# Run this from YOUR machine (not Claude Code)
# ============================================
# Usage: bash deploy.sh
# ============================================

SERVER="root@135.181.82.228"
PASS="techsrage"
WP_PATH="/var/www"  # Will be auto-detected

echo "=== Tech Guardian Deploy Script ==="
echo ""

# Check for sshpass
if ! command -v sshpass &>/dev/null; then
    echo "[!] sshpass not found. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install sshpass 2>/dev/null || brew install hudochenkov/sshpass/sshpass
    else
        sudo apt-get install -y sshpass
    fi
fi

# Find WordPress installation
echo "[1/5] Finding WordPress installation..."
WP_ROOT=$(sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no "$SERVER" "find /var/www -name 'wp-config.php' -type f 2>/dev/null | head -1 | xargs dirname")

if [ -z "$WP_ROOT" ]; then
    echo "[!] Could not find WordPress. Trying common paths..."
    for path in /var/www/html /var/www/wordpress /var/www/guardianrevives.com /var/www/public_html; do
        EXISTS=$(sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no "$SERVER" "test -f $path/wp-config.php && echo yes")
        if [ "$EXISTS" = "yes" ]; then
            WP_ROOT="$path"
            break
        fi
    done
fi

if [ -z "$WP_ROOT" ]; then
    echo "[ERROR] Cannot find WordPress installation. Check server manually."
    exit 1
fi

echo "    Found WordPress at: $WP_ROOT"

# Detect active theme
echo "[2/5] Detecting active theme..."
THEME=$(sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no "$SERVER" "cd $WP_ROOT && wp option get stylesheet --allow-root 2>/dev/null || grep -r 'stylesheet' $WP_ROOT/wp-content/options* 2>/dev/null | head -1")
THEME_DIR="$WP_ROOT/wp-content/themes/$THEME"
echo "    Active theme: $THEME"

# Upload custom CSS
echo "[3/5] Uploading custom CSS..."
sshpass -p "$PASS" scp -o StrictHostKeyChecking=no custom-homepage.css "$SERVER:$WP_ROOT/wp-content/themes/$THEME/custom-homepage.css"

# Inject CSS into theme (functions.php)
echo "[4/5] Injecting CSS into theme..."
sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no "$SERVER" "
cd $WP_ROOT
# Add CSS enqueue to functions.php if not already there
if ! grep -q 'custom-homepage.css' wp-content/themes/$THEME/functions.php 2>/dev/null; then
    echo \"
// Tech Guardian Custom Homepage Styles
function tg_custom_homepage_styles() {
    wp_enqueue_style('tg-custom-homepage', get_template_directory_uri() . '/custom-homepage.css', array(), '1.0.0');
}
add_action('wp_enqueue_scripts', 'tg_custom_homepage_styles');
\" >> wp-content/themes/$THEME/functions.php
    echo '    CSS enqueued in functions.php'
else
    echo '    CSS already enqueued'
fi
"

# Upload services page
echo "[5/5] Uploading services page..."
sshpass -p "$PASS" scp -o StrictHostKeyChecking=no services-page.html "$SERVER:$WP_ROOT/services-page.html"

# Create services page in WordPress via WP-CLI
sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no "$SERVER" "
cd $WP_ROOT
if command -v wp &>/dev/null; then
    # Check if services page exists
    EXISTING=\$(wp post list --post_type=page --name=services --field=ID --allow-root 2>/dev/null)
    if [ -z \"\$EXISTING\" ]; then
        wp post create --post_type=page --post_title='Services' --post_name='services' --post_status=publish --post_content=\"\$(cat services-page.html)\" --allow-root
        echo '    Services page created'
    else
        wp post update \$EXISTING --post_content=\"\$(cat services-page.html)\" --allow-root
        echo '    Services page updated'
    fi
else
    echo '    [NOTE] WP-CLI not found. Upload services-page.html content manually via WordPress admin.'
    echo '    Go to: Pages > Add New > paste the HTML content > set slug to \"services\"'
fi
"

echo ""
echo "=== DEPLOY COMPLETE ==="
echo ""
echo "Next steps:"
echo "  1. Go to guardianrevives.com/wp-admin"
echo "  2. Edit the homepage in Elementor"
echo "  3. Remove/hide the text overlay on the hero video"
echo "  4. Add 3 Custom HTML widgets below the video with the content from homepage-sections.html"
echo "     - Section 1: Metro's Guardian"
echo "     - Section 2: How It Works"
echo "     - Section 3: Valentine's Day Promo"
echo "  5. Check guardianrevives.com/services/ to verify the services page"
echo ""
echo "Questions? Text (816) 697-9268"
