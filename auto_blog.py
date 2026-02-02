#!/usr/bin/env python3
"""
Tech Guardian Auto Blog Generator
Runs every hour via cron, generates SEO content, posts to WordPress
"""

import requests
import json
import random
import base64
from datetime import datetime

# WordPress Config
WP_URL = "https://kcmetrorepair.tech/wp-json/wp/v2/posts"
WP_USER = "admin@guardianlabs.digital"
WP_APP_PASSWORD = "oAcJ 6PPb 9mmD YjaJ fau5 GgeG"

# Ollama Config
OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "tinyllama"

# Content Topics
TOPICS = [
    {"title": "PS5 HDMI Port Repair", "keywords": ["PS5", "HDMI", "no signal", "repair", "Kansas City"]},
    {"title": "Xbox Series X HDMI Issues", "keywords": ["Xbox", "HDMI", "black screen", "repair", "Kansas City"]},
    {"title": "Nintendo Switch Won't Charge", "keywords": ["Nintendo Switch", "charging port", "repair", "Kansas City"]},
    {"title": "iPhone Screen Replacement", "keywords": ["iPhone", "screen", "cracked", "repair", "Kansas City"]},
    {"title": "iPhone Battery Replacement", "keywords": ["iPhone", "battery", "drain", "repair", "Kansas City"]},
    {"title": "iPad Screen Repair", "keywords": ["iPad", "screen", "cracked", "glass", "Kansas City"]},
    {"title": "MacBook Not Turning On", "keywords": ["MacBook", "won't turn on", "repair", "Kansas City"]},
    {"title": "Data Recovery from Hard Drive", "keywords": ["data recovery", "hard drive", "crashed", "Kansas City"]},
    {"title": "PS4 Overheating Fix", "keywords": ["PS4", "overheating", "loud fan", "repair", "Kansas City"]},
    {"title": "Xbox Controller Drift Fix", "keywords": ["Xbox", "controller", "drift", "joystick", "repair"]},
    {"title": "PS5 Controller Not Charging", "keywords": ["PS5", "DualSense", "controller", "charging", "repair"]},
    {"title": "iPhone Charging Port Repair", "keywords": ["iPhone", "charging port", "not charging", "repair"]},
    {"title": "Gaming Console Disc Drive Repair", "keywords": ["PS5", "Xbox", "disc drive", "not reading", "repair"]}
]

CITIES = ["Kansas City", "Lee's Summit", "Independence", "Blue Springs", "Overland Park", "Olathe", "Shawnee", "Raytown", "Grandview", "Belton", "Liberty", "Gladstone"]

ARTICLE_TYPES = ["how_to_guide", "signs_and_symptoms", "cost_guide", "diy_vs_professional", "common_causes"]

def generate_with_ollama(prompt):
    try:
        response = requests.post(OLLAMA_URL, json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False}, timeout=120)
        if response.status_code == 200:
            return response.json().get("response", "")
    except Exception as e:
        print(f"Ollama error: {e}")
    return None

def generate_blog_post():
    topic = random.choice(TOPICS)
    city = random.choice(CITIES)
    article_type = random.choice(ARTICLE_TYPES)

    prefixes = {"how_to_guide": "How to Fix", "signs_and_symptoms": "5 Signs Your", "cost_guide": "How Much Does", "diy_vs_professional": "DIY vs Professional:", "common_causes": "Common Causes of"}
    prompts = {"how_to_guide": "Write a helpful guide on how to identify and fix", "signs_and_symptoms": "Write about 5 warning signs that indicate", "cost_guide": "Write about typical costs and pricing factors for", "diy_vs_professional": "Compare DIY vs professional repair for", "common_causes": "Explain the most common causes and solutions for"}

    title = f"{prefixes[article_type]} {topic['title']} Issues in {city}"

    prompt = f"""You are a tech repair blogger for Tech Guardian in Kansas City.

{prompts[article_type]} {topic['title'].lower()} issues.

Write a 400-500 word blog post with:
- Engaging introduction
- 3-4 sections with subheadings
- Practical tips
- Call to action for Tech Guardian in {city}
- Phone: (816) 697-9268

Keywords: {', '.join(topic['keywords'])}

Write in HTML with <h2>, <h3>, <p>, <ul>, <li> tags. No markdown. Start with content, no title."""

    content = generate_with_ollama(prompt)

    if content:
        content += f'''
<div style="background: #1a1a2e; padding: 30px; border-radius: 12px; margin-top: 30px; text-align: center;">
<h3 style="color: #4da6ff;">Need Professional {topic['title']}?</h3>
<p style="color: #fff;">Tech Guardian serves {city} and the entire KC metro. Expert repairs, fast turnaround, fair prices.</p>
<p><a href="tel:+18166979268" style="background: #4da6ff; color: #fff; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">📞 Call (816) 697-9268</a></p>
</div>'''
        return {"title": title, "content": content}
    return None

def post_to_wordpress(title, content):
    credentials = f"{WP_USER}:{WP_APP_PASSWORD}"
    token = base64.b64encode(credentials.encode()).decode()
    headers = {"Authorization": f"Basic {token}", "Content-Type": "application/json"}
    data = {"title": title, "content": content, "status": "publish"}

    try:
        response = requests.post(WP_URL, headers=headers, json=data, timeout=30)
        if response.status_code == 201:
            print(f"✅ Posted: {title}")
            print(f"   URL: {response.json().get('link', '')}")
            return True
        else:
            print(f"❌ WordPress error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    return False

def main():
    print("=" * 50)
    print("🤖 TECH GUARDIAN AUTO BLOG")
    print(f"⏰ {datetime.now()}")
    print("=" * 50)

    post = generate_blog_post()
    if post:
        print(f"📝 Title: {post['title']}")
        post_to_wordpress(post['title'], post['content'])
    else:
        print("❌ Failed to generate")

if __name__ == "__main__":
    main()
