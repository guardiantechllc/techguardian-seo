// Story Generator using Ollama (Open Source)
const axios = require('axios');

// Ollama API endpoint (default local installation)
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

// Theme messages/morals
const themeMorals = {
    kindness: "Being kind to others makes the world a brighter place, and kindness always comes back to you.",
    bravery: "Being brave doesn't mean you're not scared - it means doing the right thing even when you are!",
    friendship: "Good friends help each other, share with each other, and make every adventure more fun.",
    sharing: "When we share what we have, we make others happy and our hearts grow bigger!",
    curiosity: "Asking questions and exploring helps us learn amazing things about our wonderful world.",
    perseverance: "If at first you don't succeed, try again! Great things happen when we don't give up."
};

// Setting descriptions for story context
const settingDescriptions = {
    'enchanted-forest': 'a magical forest where the trees whisper secrets and flowers glow with rainbow colors',
    'underwater-kingdom': 'a sparkling underwater kingdom where friendly fish swim and mermaids sing',
    'space-adventure': 'outer space among twinkling stars, colorful planets, and friendly aliens',
    'magical-farm': 'a magical farm where animals can talk and vegetables grow as big as houses',
    'candy-land': 'a delicious land made entirely of candy, chocolate rivers, and cookie houses',
    'dinosaur-world': 'a prehistoric world where friendly dinosaurs roam and volcanoes make rainbow lava'
};

// Companion descriptions
const companionDescriptions = {
    bunny: 'a fluffy white bunny with floppy ears',
    puppy: 'a playful golden puppy with a wagging tail',
    kitten: 'a curious orange kitten with bright green eyes',
    dragon: 'a small friendly dragon with sparkly purple scales',
    unicorn: 'a magical unicorn with a shimmering rainbow mane',
    owl: 'a wise little owl with big golden eyes',
    bear: 'a cuddly brown teddy bear that came to life'
};

async function generateStory({ childName, age, theme, setting, companion }) {
    const moral = themeMorals[theme];
    const settingDesc = settingDescriptions[setting];
    const companionDesc = companionDescriptions[companion];

    // Adjust complexity based on age
    const complexity = age <= 3 ? 'very simple with short sentences (3-5 words each)' :
                       age <= 5 ? 'simple with short sentences (5-8 words each)' :
                       'easy to understand with slightly longer sentences (8-12 words each)';

    const prompt = `You are a children's book author. Create a story for a ${age}-year-old child named ${childName}.

STORY REQUIREMENTS:
- Setting: ${settingDesc}
- Main character: ${childName} with their companion ${companionDesc}
- Theme: ${theme}
- Moral: ${moral}
- Language: ${complexity}
- Length: Exactly 6 short story pages (2-3 sentences each page)
- Style: Bright, positive, engaging, with gentle adventure

IMPORTANT:
- Use ${childName}'s name frequently
- Make the companion character helpful and lovable
- Include sensory details (colors, sounds, feelings)
- Build up to a gentle challenge that teaches the moral
- End happily with the lesson learned
- NO scary elements - keep it cozy and fun

Return ONLY a valid JSON object with this EXACT structure (no markdown, no explanation):
{
    "title": "The story title",
    "pages": [
        {"type": "cover", "title": "The story title", "pageNumber": 0},
        {"type": "story", "text": "Page 1 text", "pageNumber": 1, "sceneDescription": "Brief scene description"},
        {"type": "story", "text": "Page 2 text", "pageNumber": 2, "sceneDescription": "Brief scene description"},
        {"type": "story", "text": "Page 3 text", "pageNumber": 3, "sceneDescription": "Brief scene description"},
        {"type": "story", "text": "Page 4 text", "pageNumber": 4, "sceneDescription": "Brief scene description"},
        {"type": "story", "text": "Page 5 text", "pageNumber": 5, "sceneDescription": "Brief scene description"},
        {"type": "story", "text": "Page 6 text", "pageNumber": 6, "sceneDescription": "Brief scene description"},
        {"type": "end", "moral": "The lesson learned", "pageNumber": 7}
    ]
}`;

    try {
        console.log(`📝 Generating story with Ollama (${OLLAMA_MODEL})...`);

        const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
            model: OLLAMA_MODEL,
            prompt: prompt,
            stream: false,
            options: {
                temperature: 0.8,
                num_predict: 2000
            }
        }, {
            timeout: 120000 // 2 minute timeout for generation
        });

        const content = response.data.response;

        // Parse JSON from response
        let story;
        try {
            // Try to extract JSON if wrapped in code blocks
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                story = JSON.parse(jsonMatch[1]);
            } else {
                // Try to find JSON object in response
                const jsonStart = content.indexOf('{');
                const jsonEnd = content.lastIndexOf('}') + 1;
                if (jsonStart !== -1 && jsonEnd > jsonStart) {
                    story = JSON.parse(content.substring(jsonStart, jsonEnd));
                } else {
                    story = JSON.parse(content);
                }
            }
        } catch (parseError) {
            console.error('Failed to parse story JSON:', parseError);
            console.log('Raw response:', content);
            throw new Error('Failed to parse generated story');
        }

        return story;

    } catch (error) {
        console.error('Story generation error:', error.message);

        // Check if Ollama is running
        if (error.code === 'ECONNREFUSED') {
            console.error('❌ Ollama is not running! Start it with: ollama serve');
        }

        // Return a fallback story if API fails
        return getFallbackStory(childName, theme, setting, companion);
    }
}

// Fallback story in case Ollama fails
function getFallbackStory(childName, theme, setting, companion) {
    const companionName = {
        bunny: 'Fluffy',
        puppy: 'Buddy',
        kitten: 'Whiskers',
        dragon: 'Sparkle',
        unicorn: 'Rainbow',
        owl: 'Hootie',
        bear: 'Cuddles'
    }[companion] || 'Friend';

    const settingName = {
        'enchanted-forest': 'the magical forest',
        'underwater-kingdom': 'the underwater kingdom',
        'space-adventure': 'outer space',
        'magical-farm': 'the magical farm',
        'candy-land': 'Candy Land',
        'dinosaur-world': 'Dinosaur World'
    }[setting] || 'a magical place';

    return {
        title: `${childName} and ${companionName}'s Big Adventure`,
        pages: [
            {
                type: 'cover',
                title: `${childName} and ${companionName}'s Big Adventure`,
                pageNumber: 0
            },
            {
                type: 'story',
                text: `One sunny day, ${childName} and their best friend ${companionName} discovered a path to ${settingName}. Everything sparkled with magic!`,
                pageNumber: 1,
                sceneDescription: `A child and ${companion} discovering a magical path`
            },
            {
                type: 'story',
                text: `"Wow!" said ${childName}. "Let's explore!" ${companionName} bounced happily beside them, ready for adventure.`,
                pageNumber: 2,
                sceneDescription: `Child and companion excitedly entering ${settingName}`
            },
            {
                type: 'story',
                text: `Along the way, they met a little creature who looked sad. "What's wrong?" asked ${childName} with a kind heart.`,
                pageNumber: 3,
                sceneDescription: `Child and companion meeting a sad small creature`
            },
            {
                type: 'story',
                text: `"I can't find my way home," the creature sniffled. ${childName} smiled warmly. "Don't worry, we'll help you!"`,
                pageNumber: 4,
                sceneDescription: `The child offering to help the lost creature`
            },
            {
                type: 'story',
                text: `Together, they searched high and low. ${companionName} found a trail of sparkles that led right to the creature's home!`,
                pageNumber: 5,
                sceneDescription: `Everyone following a sparkly trail together`
            },
            {
                type: 'story',
                text: `"Thank you so much!" cheered the creature. ${childName} and ${companionName} felt warm and happy inside. Helping others felt wonderful!`,
                pageNumber: 6,
                sceneDescription: `Happy reunion at the creature's home with everyone celebrating`
            },
            {
                type: 'end',
                moral: themeMorals[theme] || 'Being kind and helping others makes everyone happy, including yourself!',
                pageNumber: 7
            }
        ]
    };
}

module.exports = { generateStory };
