// Image Generator using Stable Diffusion (Open Source)
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Stable Diffusion API endpoint (Automatic1111 Web UI or ComfyUI)
const SD_URL = process.env.SD_URL || 'http://localhost:7860';
const SD_API_TYPE = process.env.SD_API_TYPE || 'automatic1111'; // 'automatic1111' or 'comfyui'

// Setting art styles
const settingStyles = {
    'enchanted-forest': 'magical forest with glowing mushrooms and rainbow flowers, fantasy trees',
    'underwater-kingdom': 'sparkling underwater scene with coral reef and bubbles, ocean',
    'space-adventure': 'colorful outer space with cute planets and stars, galaxy, nebula',
    'magical-farm': 'whimsical farm with oversized vegetables and happy cartoon animals',
    'candy-land': 'candy-themed landscape with lollipop trees and chocolate rivers, sweets',
    'dinosaur-world': 'prehistoric scene with friendly cartoon dinosaurs, volcanoes, palm trees'
};

// Companion art descriptions
const companionStyles = {
    bunny: 'cute fluffy white bunny rabbit with big eyes',
    puppy: 'adorable golden puppy dog with floppy ears',
    kitten: 'cute orange tabby kitten cat',
    dragon: 'friendly small purple baby dragon with sparkles',
    unicorn: 'magical white unicorn with rainbow colorful mane',
    owl: 'cute wise owl bird with big golden eyes',
    bear: 'cuddly brown teddy bear plush toy'
};

async function generateImages(pages, setting, companion) {
    const images = [];
    const settingStyle = settingStyles[setting] || 'magical colorful world';
    const companionStyle = companionStyles[companion] || 'cute animal friend';

    // Base style prompt for children's book illustrations
    const baseStyle = `children's book illustration, cute kawaii style, bright vibrant colors,
        soft rounded shapes, warm friendly atmosphere, watercolor texture, storybook art,
        high quality, detailed, no text, safe for children`;

    const negativePrompt = `scary, dark, horror, violence, blood, adult content, nsfw,
        realistic, photograph, ugly, deformed, blurry, low quality, text, watermark`;

    for (const page of pages) {
        try {
            let prompt = '';

            if (page.type === 'cover') {
                prompt = `${baseStyle}, book cover art, ${settingStyle},
                    happy young child character with ${companionStyle} companion,
                    magical sparkles, rainbow colors, adventure beginning`;

            } else if (page.type === 'story' && page.sceneDescription) {
                prompt = `${baseStyle}, ${settingStyle},
                    ${page.sceneDescription},
                    young child character with ${companionStyle} friend,
                    colorful and engaging scene`;

            } else if (page.type === 'end') {
                prompt = `${baseStyle}, heartwarming ending scene,
                    happy young child hugging ${companionStyle} friend,
                    sunset or starry sky background, golden warm light,
                    peaceful joyful mood, happily ever after`;

            } else {
                images.push(null);
                continue;
            }

            console.log(`🎨 Generating image for page ${page.pageNumber}...`);

            const imageUrl = await generateSingleImage(prompt, negativePrompt);
            images.push(imageUrl);

            // Small delay between requests
            await delay(1000);

        } catch (error) {
            console.error(`Failed to generate image for page ${page.pageNumber}:`, error.message);
            images.push(getPlaceholderImage(page.type, setting));
        }
    }

    return images;
}

async function generateSingleImage(prompt, negativePrompt) {
    if (SD_API_TYPE === 'automatic1111') {
        return await generateWithAutomatic1111(prompt, negativePrompt);
    } else if (SD_API_TYPE === 'comfyui') {
        return await generateWithComfyUI(prompt, negativePrompt);
    } else {
        throw new Error(`Unknown SD_API_TYPE: ${SD_API_TYPE}`);
    }
}

// Generate image using Automatic1111 Web UI API
async function generateWithAutomatic1111(prompt, negativePrompt) {
    try {
        const response = await axios.post(`${SD_URL}/sdapi/v1/txt2img`, {
            prompt: prompt,
            negative_prompt: negativePrompt,
            steps: 25,
            cfg_scale: 7,
            width: 768,
            height: 768,
            sampler_name: 'DPM++ 2M Karras',
            seed: -1
        }, {
            timeout: 120000 // 2 minute timeout
        });

        if (response.data.images && response.data.images.length > 0) {
            // Return as base64 data URI
            return `data:image/png;base64,${response.data.images[0]}`;
        }

        throw new Error('No image returned from Stable Diffusion');

    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.error('❌ Stable Diffusion is not running!');
            console.error('Start Automatic1111 with: ./webui.sh --api');
        }
        throw error;
    }
}

// Generate image using ComfyUI API
async function generateWithComfyUI(prompt, negativePrompt) {
    // Basic ComfyUI workflow for text-to-image
    const workflow = {
        "3": {
            "inputs": {
                "seed": Math.floor(Math.random() * 1000000),
                "steps": 25,
                "cfg": 7,
                "sampler_name": "dpmpp_2m",
                "scheduler": "karras",
                "denoise": 1,
                "model": ["4", 0],
                "positive": ["6", 0],
                "negative": ["7", 0],
                "latent_image": ["5", 0]
            },
            "class_type": "KSampler"
        },
        "4": {
            "inputs": {
                "ckpt_name": "sd_xl_base_1.0.safetensors"
            },
            "class_type": "CheckpointLoaderSimple"
        },
        "5": {
            "inputs": {
                "width": 768,
                "height": 768,
                "batch_size": 1
            },
            "class_type": "EmptyLatentImage"
        },
        "6": {
            "inputs": {
                "text": prompt,
                "clip": ["4", 1]
            },
            "class_type": "CLIPTextEncode"
        },
        "7": {
            "inputs": {
                "text": negativePrompt,
                "clip": ["4", 1]
            },
            "class_type": "CLIPTextEncode"
        },
        "8": {
            "inputs": {
                "samples": ["3", 0],
                "vae": ["4", 2]
            },
            "class_type": "VAEDecode"
        },
        "9": {
            "inputs": {
                "filename_prefix": "KidsBook",
                "images": ["8", 0]
            },
            "class_type": "SaveImage"
        }
    };

    try {
        // Queue the prompt
        const queueResponse = await axios.post(`${SD_URL}/prompt`, {
            prompt: workflow
        });

        const promptId = queueResponse.data.prompt_id;

        // Poll for completion
        let result = null;
        for (let i = 0; i < 60; i++) { // Max 60 seconds
            await delay(1000);

            const historyResponse = await axios.get(`${SD_URL}/history/${promptId}`);
            if (historyResponse.data[promptId]) {
                result = historyResponse.data[promptId];
                break;
            }
        }

        if (result && result.outputs && result.outputs["9"]) {
            const imageInfo = result.outputs["9"].images[0];
            // Fetch the image
            const imageResponse = await axios.get(
                `${SD_URL}/view?filename=${imageInfo.filename}&subfolder=${imageInfo.subfolder}&type=${imageInfo.type}`,
                { responseType: 'arraybuffer' }
            );
            return `data:image/png;base64,${Buffer.from(imageResponse.data).toString('base64')}`;
        }

        throw new Error('Failed to get image from ComfyUI');

    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.error('❌ ComfyUI is not running!');
            console.error('Start ComfyUI with: python main.py');
        }
        throw error;
    }
}

// Generate colorful placeholder SVG when SD is not available
function getPlaceholderImage(type, setting) {
    const colors = {
        'enchanted-forest': { primary: '#2ECC71', secondary: '#27AE60' },
        'underwater-kingdom': { primary: '#3498DB', secondary: '#2980B9' },
        'space-adventure': { primary: '#9B59B6', secondary: '#8E44AD' },
        'magical-farm': { primary: '#F39C12', secondary: '#E67E22' },
        'candy-land': { primary: '#E91E63', secondary: '#C2185B' },
        'dinosaur-world': { primary: '#FF5722', secondary: '#E64A19' }
    };

    const typeEmojis = {
        cover: '📚',
        story: '✨',
        end: '🌟'
    };

    const settingEmojis = {
        'enchanted-forest': '🌳',
        'underwater-kingdom': '🐠',
        'space-adventure': '🚀',
        'magical-farm': '🐄',
        'candy-land': '🍭',
        'dinosaur-world': '🦕'
    };

    const color = colors[setting] || { primary: '#FF6B9D', secondary: '#9B59B6' };
    const emoji = typeEmojis[type] || '✨';
    const settingEmoji = settingEmojis[setting] || '🌈';

    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="768" height="768" viewBox="0 0 768 768">
            <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:${color.primary};stop-opacity:1" />
                    <stop offset="100%" style="stop-color:${color.secondary};stop-opacity:1" />
                </linearGradient>
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.3"/>
                </filter>
            </defs>
            <rect width="768" height="768" fill="url(#grad)"/>

            <!-- Decorative circles -->
            <circle cx="100" cy="100" r="50" fill="rgba(255,255,255,0.1)"/>
            <circle cx="668" cy="668" r="80" fill="rgba(255,255,255,0.1)"/>
            <circle cx="600" cy="150" r="30" fill="rgba(255,255,255,0.15)"/>
            <circle cx="150" cy="600" r="40" fill="rgba(255,255,255,0.1)"/>

            <!-- Main content -->
            <text x="384" y="320" text-anchor="middle" font-size="120" filter="url(#shadow)">${emoji}</text>
            <text x="384" y="450" text-anchor="middle" font-size="80">${settingEmoji}</text>

            <!-- Message -->
            <rect x="184" y="520" width="400" height="80" rx="20" fill="rgba(255,255,255,0.2)"/>
            <text x="384" y="572" text-anchor="middle" fill="white" font-size="28" font-family="Arial, sans-serif" font-weight="bold">
                Illustration Loading...
            </text>

            <!-- Sparkles -->
            <text x="250" y="200" font-size="40" opacity="0.6">✨</text>
            <text x="500" cy="250" font-size="30" opacity="0.5">⭐</text>
            <text x="180" y="500" font-size="35" opacity="0.4">💫</text>
            <text x="580" y="480" font-size="45" opacity="0.5">✨</text>
        </svg>
    `;

    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { generateImages };
