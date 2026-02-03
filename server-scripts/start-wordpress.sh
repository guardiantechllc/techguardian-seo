#!/bin/bash
# WordPress container start script for Hetzner server (135.181.82.228)
# Use this if you ever need to recreate the WordPress container
#
# IMPORTANT: The real WordPress files live on the Hetzner volume at:
#   /mnt/HC_Volume_104295046/wordpress
# Do NOT use /var/lib/docker/volumes/wordpress_data - that's an empty volume.
#
# MySQL password: wordpress
# WordPress network: wordpress-net (shared with mysql container)
# Caddy reverse proxies port 8081 for guardianrevives.com

docker run -d \
  --name wordpress \
  --network wordpress-net \
  -p 8081:80 \
  -e WORDPRESS_DB_HOST=mysql \
  -e WORDPRESS_DB_USER=root \
  -e WORDPRESS_DB_PASSWORD=wordpress \
  -e WORDPRESS_DB_NAME=wordpress \
  -v /mnt/HC_Volume_104295046/wordpress:/var/www/html \
  wordpress:latest
