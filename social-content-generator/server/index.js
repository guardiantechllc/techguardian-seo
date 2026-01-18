// Social Media Content Generator - Server
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Business Info - Tech Guardian
const BUSINESS = {
    name: "Tech Guardian",
    phone: "(816) 697-9268",
    phoneLink: "tel:+18166979268",
    location: "Lee's Summit, MO",
    website: "https://guardianrevives.com",
    services: [
        "iPhone Repair", "Samsung Repair", "iPad Repair", "MacBook Repair",
        "PS5 Repair", "PS4 Repair", "Xbox Repair", "Nintendo Switch Repair",
        "Screen Repair", "Battery Replacement", "Charging Port Repair",
        "Data Recovery", "Water Damage Repair", "HDMI Port Repair"
    ],
    areas: ["Kansas City", "Lee's Summit", "Independence", "Blue Springs", "Overland Park", "Olathe", "Raytown", "Grandview"]
};

// Ollama settings
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Post templates that convert
const POST_TEMPLATES = {
    urgency: [
        "🚨 {service} emergency? We fix it TODAY!\n\n⏰ Same-day repairs available\n📍 {location}\n📞 Call NOW: {phone}\n\nDon't wait - {problem}!\n\n#PhoneRepair #KansasCity #{hashtag}",
        "⚡ SLOTS FILLING UP ⚡\n\nOnly {slots} same-day repair spots left!\n\n✅ {service}\n✅ Most repairs under 1 hour\n✅ Warranty included\n\n📞 {phone}\n📍 {location}\n\n#{hashtag} #TechRepair #KC",
        "🔥 Your {device} broken?\n\nEvery hour you wait = more damage!\n\n💪 We fix it in {time}\n💰 Starting at ${price}\n📞 {phone}\n\nWalk-ins welcome! 📍 {location}"
    ],
    social_proof: [
        "✅ JUST FIXED: Another happy customer!\n\n\"{testimonial}\"\n\n{service} ➡️ Done in {time}!\n\nYour turn? 📞 {phone}\n📍 {location}\n\n#{hashtag} #5StarService",
        "📱 Before ➡️ After\n\nAnother {device} saved! 🎉\n\nCustomer walked in with {problem}...\nWalked out {time} later with a perfect {device}!\n\n📞 Need yours fixed? {phone}\n\n#{hashtag} #RepairMagic",
        "🏆 {number}+ repairs this month!\n\nWhy KC trusts Tech Guardian:\n✅ Same-day service\n✅ Fair prices\n✅ Real warranty\n✅ Local owned\n\n📞 {phone}\n📍 {location}"
    ],
    offer: [
        "💥 THIS WEEK ONLY 💥\n\n{service} - ${price}!\n(Regular ${regular_price})\n\n✅ {benefit1}\n✅ {benefit2}\n✅ {benefit3}\n\nMention this post! 📞 {phone}\n\n#{hashtag} #Deal #KCDeals",
        "🎁 FREE with any repair this week:\n\n➡️ {freebie}!\n\nPlus:\n• {service} from ${price}\n• Done in {time}\n• Warranty included\n\n📞 {phone} | 📍 {location}\n\n#{hashtag}",
        "⚡ FLASH SALE ⚡\n\nNext {hours} hours only!\n\n{service}: ${price}\n\nFirst come, first served.\n📞 Call NOW: {phone}\n\n#{hashtag} #FlashSale"
    ],
    problem_solution: [
        "😫 {problem}?\n\nDon't panic. Don't buy new.\n\n✅ We fix {device} {solution}\n⏰ Usually {time}\n💰 Way cheaper than new\n\n📞 {phone}\n📍 {location}\n\nSave your {device} AND your money! 💪\n\n#{hashtag}",
        "🤔 Is your {device}:\n\n❌ {symptom1}?\n❌ {symptom2}?\n❌ {symptom3}?\n\nThat's usually {diagnosis} - and we fix it FAST.\n\n📞 Free diagnostic: {phone}\n📍 {location}\n\n#{hashtag}",
        "STOP! 🛑\n\nBefore you:\n❌ Buy a new {device}\n❌ Pay Apple/Samsung prices\n❌ Give up on your data\n\nCall us: {phone}\n\nWe've saved thousands of devices others said were \"dead.\"\n\n📍 {location}\n\n#{hashtag}"
    ],
    educational: [
        "💡 PRO TIP: {tip}\n\nBut if it's too late... we're here!\n\n{service} ✅\nSame-day repairs ✅\nWarranty included ✅\n\n📞 {phone}\n📍 {location}\n\n#{hashtag} #TechTips",
        "❓ Did you know?\n\n{fact}\n\nThat's why we always recommend {recommendation}.\n\nNeed help? 📞 {phone}\n📍 {location}\n\n#{hashtag} #TheMoreYouKnow",
        "🔧 What really happens when {scenario}:\n\n1️⃣ {step1}\n2️⃣ {step2}\n3️⃣ {step3}\n\nDon't DIY - let the pros handle it.\n📞 {phone}\n\n#{hashtag}"
    ]
};

// Content data for generation
const CONTENT_DATA = {
    problems: [
        "cracked screen", "dead battery", "won't charge", "water damage",
        "broken charging port", "no signal", "frozen screen", "overheating",
        "no display", "speaker not working", "camera broken", "buttons stuck"
    ],
    symptoms: {
        battery: ["dying at 50%", "won't hold charge", "getting hot", "swelling"],
        screen: ["cracked glass", "black spots", "touch not working", "flickering"],
        charging: ["loose connection", "only works at angle", "slow charging", "not recognized"]
    },
    testimonials: [
        "Thought my phone was dead but they fixed it in 30 minutes!",
        "Best price in KC and super fast service",
        "Saved all my photos when Apple said no way",
        "My kid's Switch works perfect now. Life saver!",
        "Fair price, honest people, quick turnaround",
        "They fixed what Best Buy said couldn't be fixed"
    ],
    tips: [
        "Never charge your phone on a soft surface - it traps heat",
        "A screen protector costs $10. A new screen costs $150+",
        "If your phone gets wet, DON'T put it in rice. Bring it to us ASAP",
        "Battery swelling? Stop using it immediately - fire hazard",
        "Slow charging usually means lint in the port, not a bad battery"
    ],
    facts: [
        "90% of 'dead' phones can actually be repaired",
        "A quality repair costs 70% less than buying new",
        "Most phone repairs take under an hour",
        "Water damage spreads every hour you wait",
        "Your phone battery is designed to last 2-3 years"
    ],
    freebies: [
        "Screen protector", "Phone case", "Charging cable", "Car mount",
        "Cleaning kit", "Tempered glass", "Pop socket"
    ],
    times: ["30 minutes", "45 minutes", "1 hour", "same day", "while you wait"],
    hashtags: {
        iphone: "iPhoneRepair",
        samsung: "SamsungRepair",
        ipad: "iPadRepair",
        macbook: "MacBookRepair",
        ps5: "PS5Repair",
        xbox: "XboxRepair",
        switch: "NintendoSwitch",
        screen: "ScreenRepair",
        battery: "BatteryReplacement",
        general: "PhoneRepair"
    }
};

// Generate post using templates (fast, no AI needed)
function generateTemplatePost(type, service, customData = {}) {
    const templates = POST_TEMPLATES[type];
    const template = templates[Math.floor(Math.random() * templates.length)];

    // Get service-specific hashtag
    let hashtag = CONTENT_DATA.hashtags.general;
    const serviceLower = service.toLowerCase();
    for (const [key, tag] of Object.entries(CONTENT_DATA.hashtags)) {
        if (serviceLower.includes(key)) {
            hashtag = tag;
            break;
        }
    }

    // Random data selection
    const data = {
        service: service,
        phone: BUSINESS.phone,
        location: BUSINESS.location,
        website: BUSINESS.website,
        device: service.replace(' Repair', '').replace(' Replacement', ''),
        problem: CONTENT_DATA.problems[Math.floor(Math.random() * CONTENT_DATA.problems.length)],
        testimonial: CONTENT_DATA.testimonials[Math.floor(Math.random() * CONTENT_DATA.testimonials.length)],
        tip: CONTENT_DATA.tips[Math.floor(Math.random() * CONTENT_DATA.tips.length)],
        fact: CONTENT_DATA.facts[Math.floor(Math.random() * CONTENT_DATA.facts.length)],
        time: CONTENT_DATA.times[Math.floor(Math.random() * CONTENT_DATA.times.length)],
        freebie: CONTENT_DATA.freebies[Math.floor(Math.random() * CONTENT_DATA.freebies.length)],
        hashtag: hashtag,
        slots: Math.floor(Math.random() * 3) + 2,
        number: Math.floor(Math.random() * 50) + 100,
        hours: Math.floor(Math.random() * 12) + 12,
        price: customData.price || Math.floor(Math.random() * 50) + 49,
        regular_price: customData.regular_price || Math.floor(Math.random() * 50) + 99,
        benefit1: "Quality parts",
        benefit2: "Warranty included",
        benefit3: "Same-day service",
        symptom1: "dying fast",
        symptom2: "getting hot",
        symptom3: "won't hold charge",
        diagnosis: "a battery issue",
        solution: "quickly and affordably",
        recommendation: "professional repair over DIY",
        scenario: "you drop your phone",
        step1: "The glass cracks or chips",
        step2: "Moisture and dust get inside",
        step3: "Internal damage spreads",
        ...customData
    };

    // Replace all placeholders
    let post = template;
    for (const [key, value] of Object.entries(data)) {
        post = post.replace(new RegExp(`{${key}}`, 'g'), value);
    }

    return post;
}

// Generate post using AI (Ollama)
async function generateAIPost(type, service, customInstructions = '') {
    const prompt = `You are a social media manager for Tech Guardian, a phone/electronics repair shop in Lee's Summit, MO.

Create a ${type} Facebook/Instagram post about ${service}.

Business Info:
- Name: Tech Guardian
- Phone: (816) 697-9268
- Location: Lee's Summit, MO
- Website: guardianrevives.com

Post Requirements:
- Must include phone number
- Must have clear call-to-action (call, visit, text)
- Create urgency
- Keep under 300 characters for engagement
- Use relevant emojis
- Include 2-3 hashtags
- Sound authentic, not corporate
${customInstructions ? `\nCustom instructions: ${customInstructions}` : ''}

Write the post now:`;

    try {
        const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
            model: OLLAMA_MODEL,
            prompt: prompt,
            stream: false,
            options: { temperature: 0.9, num_predict: 500 }
        }, { timeout: 60000 });

        return response.data.response.trim();
    } catch (error) {
        console.error('AI generation failed, using template:', error.message);
        return generateTemplatePost(type, service);
    }
}

// API Endpoints

// Get business info
app.get('/api/business', (req, res) => {
    res.json(BUSINESS);
});

// Generate single post
app.post('/api/generate', async (req, res) => {
    try {
        const { type, service, useAI, customInstructions, customData } = req.body;

        let post;
        if (useAI) {
            post = await generateAIPost(type, service, customInstructions);
        } else {
            post = generateTemplatePost(type, service, customData);
        }

        res.json({
            post,
            type,
            service,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Generation error:', error);
        res.status(500).json({ error: 'Failed to generate post' });
    }
});

// Generate batch of posts
app.post('/api/generate-batch', async (req, res) => {
    try {
        const { count = 7, services, types, useAI } = req.body;

        const selectedServices = services || BUSINESS.services;
        const selectedTypes = types || Object.keys(POST_TEMPLATES);

        const posts = [];
        for (let i = 0; i < count; i++) {
            const service = selectedServices[Math.floor(Math.random() * selectedServices.length)];
            const type = selectedTypes[Math.floor(Math.random() * selectedTypes.length)];

            let post;
            if (useAI) {
                post = await generateAIPost(type, service);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
            } else {
                post = generateTemplatePost(type, service);
            }

            posts.push({
                id: i + 1,
                post,
                type,
                service,
                suggestedTime: getSuggestedPostTime(i),
                timestamp: new Date().toISOString()
            });
        }

        res.json({ posts, count: posts.length });
    } catch (error) {
        console.error('Batch generation error:', error);
        res.status(500).json({ error: 'Failed to generate posts' });
    }
});

// Get suggested post time
function getSuggestedPostTime(index) {
    const times = [
        'Monday 9:00 AM', 'Tuesday 12:00 PM', 'Wednesday 3:00 PM',
        'Thursday 6:00 PM', 'Friday 10:00 AM', 'Saturday 11:00 AM',
        'Sunday 2:00 PM'
    ];
    return times[index % times.length];
}

// Webhook for n8n integration
app.post('/api/webhook/generate', async (req, res) => {
    try {
        const { type = 'urgency', service } = req.body;
        const selectedService = service || BUSINESS.services[Math.floor(Math.random() * BUSINESS.services.length)];

        const post = generateTemplatePost(type, selectedService);

        res.json({
            text: post,
            service: selectedService,
            type: type,
            business: BUSINESS.name,
            phone: BUSINESS.phone
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', business: BUSINESS.name });
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`
    📱 ===================================== 📱
    🚀 Social Content Generator             🚀
    📱 ===================================== 📱

    Server: http://localhost:${PORT}
    Business: ${BUSINESS.name}
    Phone: ${BUSINESS.phone}

    Ready to generate converting content!
    `);
});
