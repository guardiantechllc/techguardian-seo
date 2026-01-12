// Story Generator using OpenAI
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

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

    const prompt = `Create a children's story for a ${age}-year-old child named ${childName}.

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
- Use lots of colorful, imaginative descriptions

Return the story as a JSON object with this EXACT structure:
{
    "title": "The story title",
    "pages": [
        {
            "type": "cover",
            "title": "The story title",
            "pageNumber": 0
        },
        {
            "type": "story",
            "text": "Page 1 text here",
            "pageNumber": 1,
            "sceneDescription": "Brief description of what to illustrate"
        },
        {
            "type": "story",
            "text": "Page 2 text here",
            "pageNumber": 2,
            "sceneDescription": "Brief description of what to illustrate"
        },
        {
            "type": "story",
            "text": "Page 3 text here",
            "pageNumber": 3,
            "sceneDescription": "Brief description of what to illustrate"
        },
        {
            "type": "story",
            "text": "Page 4 text here",
            "pageNumber": 4,
            "sceneDescription": "Brief description of what to illustrate"
        },
        {
            "type": "story",
            "text": "Page 5 text here",
            "pageNumber": 5,
            "sceneDescription": "Brief description of what to illustrate"
        },
        {
            "type": "story",
            "text": "Page 6 text here",
            "pageNumber": 6,
            "sceneDescription": "Brief description of what to illustrate"
        },
        {
            "type": "end",
            "moral": "The lesson learned",
            "pageNumber": 7
        }
    ]
}

Return ONLY the JSON object, no other text.`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: 'You are a talented children\'s book author who creates magical, educational stories for young children. You always return valid JSON.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.8,
            max_tokens: 2000
        });

        const content = response.choices[0].message.content;

        // Parse JSON from response
        let story;
        try {
            // Try to extract JSON if wrapped in code blocks
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                story = JSON.parse(jsonMatch[1]);
            } else {
                story = JSON.parse(content);
            }
        } catch (parseError) {
            console.error('Failed to parse story JSON:', parseError);
            throw new Error('Failed to parse generated story');
        }

        return story;

    } catch (error) {
        console.error('Story generation error:', error);

        // Return a fallback story if API fails
        return getFallbackStory(childName, theme, setting, companion);
    }
}

// Fallback story in case API fails
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
                text: `One sunny day, ${childName} found a magical path. Their best friend ${companionName} was by their side, ready for adventure!`,
                pageNumber: 1,
                sceneDescription: `A child and ${companion} at the start of a magical path`
            },
            {
                type: 'story',
                text: `"Let's explore!" said ${childName} with a big smile. The path sparkled with rainbow colors, leading somewhere wonderful.`,
                pageNumber: 2,
                sceneDescription: `A sparkling rainbow path through a magical landscape`
            },
            {
                type: 'story',
                text: `Along the way, they met a little creature who looked sad. "What's wrong?" asked ${childName} kindly.`,
                pageNumber: 3,
                sceneDescription: `The child and companion meeting a sad small creature`
            },
            {
                type: 'story',
                text: `"I lost my way home," the creature said. ${childName} knew just what to do. "We'll help you find it!"`,
                pageNumber: 4,
                sceneDescription: `The child offering to help the lost creature`
            },
            {
                type: 'story',
                text: `Working together, they found the creature's home. "Thank you!" it said happily. Everyone cheered!`,
                pageNumber: 5,
                sceneDescription: `Everyone celebrating at the creature's home`
            },
            {
                type: 'story',
                text: `${childName} and ${companionName} walked home under a beautiful sunset. What a wonderful day of helping others!`,
                pageNumber: 6,
                sceneDescription: `Child and companion walking into a colorful sunset`
            },
            {
                type: 'end',
                moral: themeMorals[theme] || 'Being kind and helping others makes everyone happy!',
                pageNumber: 7
            }
        ]
    };
}

module.exports = { generateStory };
