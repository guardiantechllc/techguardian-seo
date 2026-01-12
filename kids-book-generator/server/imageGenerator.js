// Image Generator using DALL-E
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Setting art styles
const settingStyles = {
    'enchanted-forest': 'magical forest with glowing mushrooms and rainbow flowers',
    'underwater-kingdom': 'sparkling underwater scene with coral and bubbles',
    'space-adventure': 'colorful outer space with cute planets and stars',
    'magical-farm': 'whimsical farm with oversized vegetables and happy animals',
    'candy-land': 'candy-themed landscape with lollipop trees and chocolate rivers',
    'dinosaur-world': 'prehistoric scene with friendly cartoon dinosaurs'
};

// Companion art descriptions
const companionStyles = {
    bunny: 'cute fluffy white bunny with big eyes',
    puppy: 'adorable golden puppy with floppy ears',
    kitten: 'cute orange tabby kitten',
    dragon: 'friendly small purple dragon with sparkles',
    unicorn: 'magical white unicorn with rainbow mane',
    owl: 'cute wise owl with golden eyes',
    bear: 'cuddly brown teddy bear'
};

async function generateImages(pages, setting, companion) {
    const images = [];
    const settingStyle = settingStyles[setting] || 'magical colorful world';
    const companionStyle = companionStyles[companion] || 'cute animal friend';

    // Base style prompt for consistency
    const baseStyle = `Children's book illustration style, bright vibrant colors, soft rounded shapes,
        warm and friendly atmosphere, cute kawaii-inspired characters, watercolor texture,
        storybook quality, age-appropriate for young children, no scary elements,
        ${settingStyle}`;

    for (const page of pages) {
        try {
            if (page.type === 'cover') {
                // Generate cover image
                const coverPrompt = `${baseStyle}.
                    Cover illustration for a children's book titled "${page.title}".
                    Show a happy young child with their ${companionStyle} companion,
                    standing at the entrance of an adventure.
                    Magical sparkles and rainbow colors.
                    Warm, inviting, and exciting mood.`;

                const coverImage = await generateSingleImage(coverPrompt);
                images.push(coverImage);

            } else if (page.type === 'story' && page.sceneDescription) {
                // Generate story page illustration
                const storyPrompt = `${baseStyle}.
                    ${page.sceneDescription}.
                    Include a young child character and their ${companionStyle} friend.
                    Cute, colorful, and engaging illustration for young children.`;

                const storyImage = await generateSingleImage(storyPrompt);
                images.push(storyImage);

            } else if (page.type === 'end') {
                // Generate ending image
                const endPrompt = `${baseStyle}.
                    Heartwarming ending scene showing a happy young child hugging their ${companionStyle} friend.
                    Sunset or starry sky background, warm golden light,
                    peaceful and joyful mood, "happily ever after" feeling.`;

                const endImage = await generateSingleImage(endPrompt);
                images.push(endImage);

            } else {
                images.push(null);
            }

            // Add a small delay between requests to avoid rate limiting
            await delay(500);

        } catch (error) {
            console.error(`Failed to generate image for page ${page.pageNumber}:`, error.message);
            images.push(getPlaceholderImage(page.type));
        }
    }

    return images;
}

async function generateSingleImage(prompt) {
    try {
        const response = await openai.images.generate({
            model: 'dall-e-3',
            prompt: prompt,
            n: 1,
            size: '1024x1024',
            quality: 'standard',
            style: 'vivid'
        });

        return response.data[0].url;

    } catch (error) {
        console.error('DALL-E error:', error.message);

        // If DALL-E 3 fails, try DALL-E 2
        try {
            const fallbackResponse = await openai.images.generate({
                model: 'dall-e-2',
                prompt: prompt.substring(0, 1000), // DALL-E 2 has shorter prompt limit
                n: 1,
                size: '512x512'
            });

            return fallbackResponse.data[0].url;

        } catch (fallbackError) {
            console.error('DALL-E 2 fallback also failed:', fallbackError.message);
            throw fallbackError;
        }
    }
}

// Placeholder SVG images when API fails
function getPlaceholderImage(type) {
    // Return a colorful placeholder data URI
    const colors = {
        cover: '#FF6B9D',
        story: '#9B59B6',
        end: '#2ECC71'
    };

    const color = colors[type] || '#3498DB';

    // Simple colorful placeholder SVG
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
            <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#F1C40F;stop-opacity:1" />
                </linearGradient>
            </defs>
            <rect width="512" height="512" fill="url(#grad)"/>
            <text x="256" y="240" text-anchor="middle" fill="white" font-size="80" font-family="Arial">✨</text>
            <text x="256" y="300" text-anchor="middle" fill="white" font-size="24" font-family="Arial">Magic Loading...</text>
        </svg>
    `;

    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { generateImages };
