#!/bin/bash
# ============================================
# TECH GUARDIAN - DEPLOY ALL PAGES
# Copy-paste each command into Hetzner console
# Run them ONE AT A TIME in order
# ============================================

# =============================================
# COMMAND 1: List all pages to find IDs
# =============================================
docker exec wordpress bash -c "cd /var/www/html && wp post list --post_type=page --fields=ID,post_name,post_title,post_status --allow-root"

# Write down the IDs for: specials, faq
# You already know: AI Solutions = 2178, Watch = 877

# =============================================
# COMMAND 2: Clear Elementor from AI Solutions
# =============================================
docker exec wordpress bash -c "cd /var/www/html && wp post meta delete 2178 _elementor_data --allow-root; wp post meta delete 2178 _elementor_edit_mode --allow-root; wp post meta delete 2178 _elementor_page_settings --allow-root; wp post meta delete 2178 _elementor_version --allow-root; wp post meta update 2178 _wp_page_template default --allow-root; echo 'AI Solutions CLEARED'"

# =============================================
# COMMAND 3: Clear Elementor from Watch page
# =============================================
docker exec wordpress bash -c "cd /var/www/html && wp post meta delete 877 _elementor_data --allow-root; wp post meta delete 877 _elementor_edit_mode --allow-root; wp post meta delete 877 _elementor_page_settings --allow-root; wp post meta delete 877 _elementor_version --allow-root; wp post meta update 877 _wp_page_template default --allow-root; echo 'Watch CLEARED'"

# =============================================
# COMMAND 4: Clear Elementor from Specials
# >>> REPLACE SPECIALS_ID with actual ID <<<
# =============================================
# docker exec wordpress bash -c "cd /var/www/html && wp post meta delete SPECIALS_ID _elementor_data --allow-root; wp post meta delete SPECIALS_ID _elementor_edit_mode --allow-root; wp post meta delete SPECIALS_ID _elementor_page_settings --allow-root; wp post meta delete SPECIALS_ID _elementor_version --allow-root; wp post meta update SPECIALS_ID _wp_page_template default --allow-root; echo 'Specials CLEARED'"

# =============================================
# COMMAND 5: Clear Elementor from FAQ
# >>> REPLACE FAQ_ID with actual ID <<<
# =============================================
# docker exec wordpress bash -c "cd /var/www/html && wp post meta delete FAQ_ID _elementor_data --allow-root; wp post meta delete FAQ_ID _elementor_edit_mode --allow-root; wp post meta delete FAQ_ID _elementor_page_settings --allow-root; wp post meta delete FAQ_ID _elementor_version --allow-root; wp post meta update FAQ_ID _wp_page_template default --allow-root; echo 'FAQ CLEARED'"

# =============================================
# COMMAND 6: Verify slugs are correct
# =============================================
docker exec wordpress bash -c "cd /var/www/html && wp post update 2178 --post_name=ai-solutions --post_status=publish --allow-root && echo 'AI Solutions slug: /ai-solutions/'"

# For Specials and FAQ - replace IDs:
# docker exec wordpress bash -c "cd /var/www/html && wp post update SPECIALS_ID --post_name=specials --post_status=publish --allow-root && echo 'Specials slug: /specials/'"
# docker exec wordpress bash -c "cd /var/www/html && wp post update FAQ_ID --post_name=faq --post_status=publish --allow-root && echo 'FAQ slug: /faq/'"

# =============================================
# COMMAND 7: Flush rewrite rules
# =============================================
docker exec wordpress bash -c "cd /var/www/html && wp rewrite flush --allow-root && echo 'Rewrites flushed'"

# =============================================
# AFTER RUNNING THESE COMMANDS:
# =============================================
# 1. Go to guardianrevives.com/wp-admin
# 2. Pages > AI Solutions > Edit (regular editor, NOT Elementor)
#    - Click "Code Editor" (top right dots menu)
#    - Delete everything in there
#    - Paste the content from ai-solutions-page.html
#    - Click "Update"
#
# 3. Pages > Specials > Edit (regular editor, NOT Elementor)
#    - Same process: Code Editor > paste specials-page.html > Update
#
# 4. Pages > FAQ > Edit (regular editor, NOT Elementor)
#    - Same process: Code Editor > paste faq-page.html > Update
#
# 5. Pages > Home > Edit
#    - Update with the new valentines-homepage.html
#    - (has specials section + updated footer links)
#
# IMPORTANT: Use the REGULAR WordPress editor, not Elementor!
# If it opens in Elementor, go back and use "Edit" not "Edit with Elementor"
