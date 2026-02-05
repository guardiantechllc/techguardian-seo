# GuardianRevives.com - Indexing Fix Guide

Based on Google Search Console data, here's what needs to be fixed to get pages indexed.

---

## Critical Issues Summary

| Issue | Pages | Priority |
|-------|-------|----------|
| Server error (5xx) | 7 | **CRITICAL** |
| Not found (404) | 13 | **HIGH** |
| Crawled - currently not indexed | 19 | **MEDIUM** |
| Page with redirect | 3 | **MEDIUM** |
| Excluded by 'noindex' tag | 2 | **HIGH** |
| Redirect error | 1 | **HIGH** |

---

## 1. Server Error (5xx) - 7 Pages

**What it means:** Google tried to access these pages but your server returned an error.

**How to fix:**
1. Go to Search Console > Indexing > Pages > Server error (5xx)
2. Click to see which URLs are affected
3. Check your Hetzner server logs:
   ```bash
   ssh root@135.181.82.228
   docker logs wordpress 2>&1 | grep -i error
   ```
4. Common causes:
   - PHP memory limit exceeded (increase in wp-config.php)
   - Database connection issues
   - Plugin conflicts
   - .htaccess issues

**Quick fixes:**
```bash
# Check if WordPress container is running
docker ps | grep wordpress

# Restart WordPress container
docker restart wordpress

# Check WordPress error logs
docker exec wordpress cat /var/www/html/wp-content/debug.log
```

**After fixing:** Request re-indexing in Search Console for each URL.

---

## 2. Not Found (404) - 13 Pages

**What it means:** These URLs don't exist anymore but Google has them indexed.

**How to fix:**
1. Go to Search Console > Indexing > Pages > Not found (404)
2. Export the list of 404 URLs
3. For each URL, decide:
   - **If content moved:** Set up 301 redirect to new URL
   - **If content deleted:** Leave as 404 (Google will eventually remove)
   - **If URL should exist:** Recreate the page

**Setting up redirects in WordPress:**
1. Install "Redirection" plugin
2. Or add to .htaccess:
   ```apache
   Redirect 301 /old-page/ /new-page/
   ```

**Bulk redirect example:**
```php
// Add to functions.php
function custom_redirects() {
    $redirects = array(
        '/old-url-1/' => '/new-url-1/',
        '/old-url-2/' => '/new-url-2/',
    );

    $current_url = $_SERVER['REQUEST_URI'];
    if (isset($redirects[$current_url])) {
        wp_redirect(site_url($redirects[$current_url]), 301);
        exit;
    }
}
add_action('template_redirect', 'custom_redirects');
```

---

## 3. Crawled - Currently Not Indexed (19 Pages)

**What it means:** Google found these pages but decided not to index them. Usually indicates:
- Thin content (not enough valuable content)
- Duplicate content
- Low quality signals

**How to fix:**

### A. Improve Content Quality
Each page needs:
- **Minimum 500+ words** of unique, helpful content
- Clear headings (H1, H2, H3 hierarchy)
- Internal links to/from other pages
- Images with alt text
- Schema markup

### B. Check for Duplicate Content
```bash
# Check if pages have same title/description
# In WordPress admin: Tools > Site Health > Info > Duplicate Content
```

### C. Build Internal Links
- Link from homepage to important service pages
- Link between related service pages
- Add a proper sitemap

### D. Request Indexing
After improvements:
1. Go to Search Console
2. Enter URL in inspection bar
3. Click "Request Indexing"

---

## 4. Page with Redirect (3 Pages)

**What it means:** These pages redirect but the final destination might have issues.

**How to fix:**
1. Identify the redirect chains
2. Make all redirects point directly to final destination (no chains)
3. Update internal links to point to final URLs

**Check redirect chains:**
```bash
curl -IL https://guardianrevives.com/old-url/
```

---

## 5. Excluded by 'noindex' Tag (2 Pages)

**What it means:** These pages have `<meta name="robots" content="noindex">` or X-Robots-Tag header.

**How to fix:**
1. Find which pages in Search Console
2. Check the page source for noindex meta tag
3. Remove it if the page should be indexed

**Common causes:**
- WordPress "Discourage search engines" setting enabled
- Yoast/RankMath SEO plugin settings
- Theme settings

**Check WordPress settings:**
1. Settings > Reading > "Discourage search engines from indexing this site" should be **UNCHECKED**
2. Check individual page SEO settings if using Yoast/RankMath

---

## 6. Redirect Error (1 Page)

**What it means:** Redirect loop or broken redirect.

**How to fix:**
1. Find the URL in Search Console
2. Test the redirect:
   ```bash
   curl -IL https://guardianrevives.com/problem-url/
   ```
3. Fix the redirect chain/loop

---

## Priority Action List

### Do Today:
1. [ ] Fix server errors (5xx) - Check Hetzner server health
2. [ ] Remove noindex tags from 2 pages
3. [ ] Fix redirect error

### This Week:
4. [ ] Set up 301 redirects for valid 404s
5. [ ] Fix redirect chains (3 pages)
6. [ ] Improve content on 19 "crawled not indexed" pages

### Ongoing:
7. [ ] Request re-indexing after each fix
8. [ ] Monitor Search Console weekly
9. [ ] Build backlinks to important pages

---

## Quick Win: Force Homepage Re-Index

Since analytics show visitors only hit the homepage:

1. Go to: https://search.google.com/search-console
2. Enter: `https://guardianrevives.com/`
3. Click "Request Indexing"
4. Also submit your sitemap: Indexing > Sitemaps > Add `sitemap.xml`

---

## Sitemap Setup

Make sure you have a proper sitemap:

```bash
# Check if sitemap exists
curl https://guardianrevives.com/sitemap.xml

# If using Yoast, it's at:
curl https://guardianrevives.com/sitemap_index.xml
```

Submit sitemap to Search Console if not already done.

---

## Server Health Check Script

Run this on your Hetzner server:

```bash
#!/bin/bash
echo "=== WordPress Container Status ==="
docker ps | grep wordpress

echo -e "\n=== Recent Errors ==="
docker logs wordpress 2>&1 | tail -50 | grep -i error

echo -e "\n=== Disk Space ==="
df -h /mnt/HC_Volume_104295046/

echo -e "\n=== Memory Usage ==="
free -h

echo -e "\n=== Testing Homepage ==="
curl -s -o /dev/null -w "%{http_code}" https://guardianrevives.com/
```

---

## Contact

For server issues on Hetzner: Check the start-wordpress.sh script in this repo.

Server IP: 135.181.82.228
WordPress volume: /mnt/HC_Volume_104295046/wordpress
