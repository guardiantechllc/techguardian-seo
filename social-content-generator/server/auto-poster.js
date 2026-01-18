// Auto-Posting Agent for Tech Guardian
// Uses Ollama AI to generate content and posts to Facebook automatically

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ============= CONFIGURATION =============
const CONFIG = {
    // Business Info
    business: {
        name: "Tech Guardian",
        phone: "(816) 583-0100",
        location: "Lee's Summit, MO",
        website: "https://guardianrevives.com",
        services: [
            "iPhone Repair", "Samsung Repair", "iPad Repair", "MacBook Repair",
            "PS5 Repair", "PS4 Repair", "Xbox Repair", "Nintendo Switch Repair",
            "Screen Repair", "Battery Replacement", "Charging Port Repair",
            "Data Recovery", "Water Damage Repair", "HDMI Port Repair"
        ]
    },

    // Ollama Settings
    ollama: {
        url: process.env.OLLAMA_URL || 'http://localhost:11434',
        model: process.env.OLLAMA_MODEL || 'llama3.2'
    },

    // Facebook Settings (user needs to fill these in)
    facebook: {
        pageId: process.env.FB_PAGE_ID || '',
        accessToken: process.env.FB_ACCESS_TOKEN || ''
    },

    // Posting Schedule (times in 24h format, Central Time)
    schedule: {
        postsPerDay: 3,
        bestTimes: ['09:00', '12:30', '18:00'], // Morning, Lunch, Evening
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    }
};

// ============= AI CONTENT GENERATION =============
const CONTENT_PROMPTS = {
    urgency: `You are a social media expert for a phone/game console repair shop called Tech Guardian in Lee's Summit, MO.

Write a SHORT, punchy Facebook post (max 150 words) about {service}.

Requirements:
- Create URGENCY (limited spots, same-day service, don't wait)
- Include phone: (816) 583-0100
- Include website: guardianrevives.com
- Use 2-3 emojis max
- End with a clear call to action (CALL NOW, BOOK TODAY, etc.)
- Sound human and local, not corporate
- Mention Kansas City area

Do NOT include hashtags. Just write the post.`,

    social_proof: `You are a social media expert for Tech Guardian, a repair shop in Lee's Summit, MO.

Write a SHORT Facebook post (max 150 words) featuring a customer success story for {service}.

Requirements:
- Make up a realistic first name and brief story
- Mention how fast the repair was
- Include phone: (816) 583-0100
- Include website: guardianrevives.com
- Sound authentic and grateful
- 2-3 emojis max

Do NOT include hashtags. Just write the post.`,

    educational: `You are a social media expert for Tech Guardian repair shop in Lee's Summit, MO.

Write a SHORT educational Facebook post (max 150 words) with a helpful tip about {service}.

Requirements:
- Share one useful tip or fact
- Position Tech Guardian as the expert
- Include phone: (816) 583-0100
- Include website: guardianrevives.com
- End with "Questions? Give us a call!"
- 2-3 emojis max

Do NOT include hashtags. Just write the post.`,

    offer: `You are a social media expert for Tech Guardian repair shop in Lee's Summit, MO.

Write a SHORT promotional Facebook post (max 150 words) about a special offer for {service}.

Requirements:
- Create a compelling but believable offer (10-20% off, free screen protector, etc.)
- Add urgency (this week only, limited time, mention this post)
- Include phone: (816) 583-0100
- Include website: guardianrevives.com
- Clear call to action
- 2-3 emojis max

Do NOT include hashtags. Just write the post.`
};

async function generateWithOllama(prompt) {
    try {
        const response = await axios.post(`${CONFIG.ollama.url}/api/generate`, {
            model: CONFIG.ollama.model,
            prompt: prompt,
            stream: false,
            options: {
                temperature: 0.8,
                top_p: 0.9,
                num_predict: 300
            }
        });
        return response.data.response.trim();
    } catch (error) {
        console.error('Ollama error:', error.message);
        return null;
    }
}

async function generatePost() {
    // Pick random service and post type
    const service = CONFIG.business.services[Math.floor(Math.random() * CONFIG.business.services.length)];
    const postTypes = Object.keys(CONTENT_PROMPTS);
    const postType = postTypes[Math.floor(Math.random() * postTypes.length)];

    const prompt = CONTENT_PROMPTS[postType].replace(/{service}/g, service);

    console.log(`\n🤖 Generating ${postType} post for ${service}...`);

    const content = await generateWithOllama(prompt);

    if (content) {
        console.log('\n📝 Generated Post:\n');
        console.log(content);
        console.log('\n---');
    }

    return { content, service, type: postType };
}

// ============= FACEBOOK POSTING =============
async function postToFacebook(message, imageUrl = null) {
    if (!CONFIG.facebook.pageId || !CONFIG.facebook.accessToken) {
        console.log('⚠️  Facebook not configured. Set FB_PAGE_ID and FB_ACCESS_TOKEN in .env');
        return { success: false, error: 'Not configured' };
    }

    try {
        const url = `https://graph.facebook.com/v18.0/${CONFIG.facebook.pageId}/feed`;
        const params = {
            message: message,
            access_token: CONFIG.facebook.accessToken
        };

        // If image URL provided, post as photo instead
        if (imageUrl) {
            const photoUrl = `https://graph.facebook.com/v18.0/${CONFIG.facebook.pageId}/photos`;
            const response = await axios.post(photoUrl, {
                url: imageUrl,
                caption: message,
                access_token: CONFIG.facebook.accessToken
            });
            return { success: true, postId: response.data.id };
        }

        const response = await axios.post(url, params);
        console.log('✅ Posted to Facebook! Post ID:', response.data.id);
        return { success: true, postId: response.data.id };
    } catch (error) {
        console.error('❌ Facebook error:', error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

// ============= LOGGING =============
function logPost(post, fbResult) {
    const logFile = path.join(__dirname, '..', 'post-history.json');
    let history = [];

    try {
        if (fs.existsSync(logFile)) {
            history = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        }
    } catch (e) {}

    history.push({
        timestamp: new Date().toISOString(),
        service: post.service,
        type: post.type,
        content: post.content,
        fbPostId: fbResult?.postId || null,
        success: fbResult?.success || false
    });

    // Keep last 100 posts
    if (history.length > 100) {
        history = history.slice(-100);
    }

    fs.writeFileSync(logFile, JSON.stringify(history, null, 2));
}

// ============= MAIN FUNCTIONS =============
async function generateAndPost() {
    console.log('\n🚀 Auto-Poster Starting...');
    console.log('📅', new Date().toLocaleString());

    const post = await generatePost();

    if (post.content) {
        const result = await postToFacebook(post.content);
        logPost(post, result);
        return { post, result };
    }

    return { post: null, result: { success: false, error: 'Generation failed' } };
}

async function generateBatch(count = 7) {
    console.log(`\n📦 Generating ${count} posts for the week...\n`);
    const posts = [];

    for (let i = 0; i < count; i++) {
        const post = await generatePost();
        if (post.content) {
            posts.push(post);
        }
        // Small delay between generations
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`\n✅ Generated ${posts.length} posts!`);
    return posts;
}

// ============= CLI INTERFACE =============
const args = process.argv.slice(2);
const command = args[0];

if (command === 'generate') {
    // Just generate a post (don't publish)
    generatePost().then(() => process.exit(0));

} else if (command === 'post') {
    // Generate and post to Facebook
    generateAndPost().then(() => process.exit(0));

} else if (command === 'batch') {
    // Generate a week's worth of posts
    const count = parseInt(args[1]) || 7;
    generateBatch(count).then(posts => {
        const outFile = path.join(__dirname, '..', 'scheduled-posts.json');
        fs.writeFileSync(outFile, JSON.stringify(posts, null, 2));
        console.log(`\n💾 Saved to ${outFile}`);
        process.exit(0);
    });

} else if (command === 'test-fb') {
    // Test Facebook connection
    postToFacebook('🔧 Test post from Tech Guardian Auto-Poster! If you see this, automation is working. Delete me!')
        .then(() => process.exit(0));

} else {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║           TECH GUARDIAN AUTO-POSTER                          ║
║           Powered by Ollama AI                               ║
╚══════════════════════════════════════════════════════════════╝

Usage:
  node auto-poster.js generate     Generate a single post (preview only)
  node auto-poster.js post         Generate and post to Facebook
  node auto-poster.js batch [n]    Generate n posts (default 7) and save
  node auto-poster.js test-fb      Test Facebook connection

Setup:
  1. Create .env file with:
     FB_PAGE_ID=your_page_id
     FB_ACCESS_TOKEN=your_access_token

  2. To get Facebook credentials:
     - Go to developers.facebook.com
     - Create an app
     - Add Facebook Login product
     - Get Page Access Token with pages_manage_posts permission

  3. Set up cron for auto-posting:
     0 9,12,18 * * 1-6 cd /opt/techguardian-seo/social-content-generator && node server/auto-poster.js post
`);
}

module.exports = { generatePost, generateAndPost, generateBatch, postToFacebook };
