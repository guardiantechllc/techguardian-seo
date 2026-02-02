# DEPLOY ALL PAGES - Run in Hetzner Web Console

## Run these commands ONE AT A TIME in your Hetzner console

---

### COMMAND 1: List all pages to get IDs
```
docker exec wordpress bash -c "cd /var/www/html && wp post list --post_type=page --fields=ID,post_name,post_title,post_status --allow-root"
```
Write down the IDs for: specials, faq

---

### COMMAND 2: Clear Elementor data from AI Solutions (ID 2178)
```
docker exec wordpress bash -c "cd /var/www/html && wp post meta delete 2178 _elementor_data --allow-root; wp post meta delete 2178 _elementor_edit_mode --allow-root; wp post meta delete 2178 _elementor_page_settings --allow-root; wp post meta delete 2178 _elementor_version --allow-root; echo DONE"
```

### COMMAND 3: Clear Elementor data from Watch (ID 877)
```
docker exec wordpress bash -c "cd /var/www/html && wp post meta delete 877 _elementor_data --allow-root; wp post meta delete 877 _elementor_edit_mode --allow-root; wp post meta delete 877 _elementor_page_settings --allow-root; wp post meta delete 877 _elementor_version --allow-root; echo DONE"
```

### COMMAND 4: Clear Elementor data from Specials
Replace SPECIALS_ID with the actual ID from Command 1
```
docker exec wordpress bash -c "cd /var/www/html && wp post meta delete SPECIALS_ID _elementor_data --allow-root; wp post meta delete SPECIALS_ID _elementor_edit_mode --allow-root; wp post meta delete SPECIALS_ID _elementor_page_settings --allow-root; wp post meta delete SPECIALS_ID _elementor_version --allow-root; echo DONE"
```

### COMMAND 5: Clear Elementor data from FAQ
Replace FAQ_ID with the actual ID from Command 1
```
docker exec wordpress bash -c "cd /var/www/html && wp post meta delete FAQ_ID _elementor_data --allow-root; wp post meta delete FAQ_ID _elementor_edit_mode --allow-root; wp post meta delete FAQ_ID _elementor_page_settings --allow-root; wp post meta delete FAQ_ID _elementor_version --allow-root; echo DONE"
```

---

### THEN: Go to WordPress admin and update each page:
1. Go to Pages > AI Solutions > Edit (NOT with Elementor, use regular editor)
2. Switch to "Code editor" or "HTML" mode
3. Paste the content from ai-solutions-page.html
4. Update

Repeat for Specials and FAQ pages.

### For the homepage:
1. Go to Pages > Home > Edit
2. Paste the updated valentines-homepage.html content
3. Update
