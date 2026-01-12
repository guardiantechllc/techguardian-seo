# Magic Story Book - Kids Book Generator

**100% Open Source** AI-powered children's book generator that creates personalized stories with illustrations for kids ages 2-7.

No API costs - runs entirely on your own hardware!

## Features

- **Personalized Stories** - Enter child's name and customize the adventure
- **Fun Companions** - Bunny, puppy, dragon, unicorn, owl, kitten, bear
- **Magical Settings** - Enchanted forest, underwater kingdom, space, magical farm, candy land, dinosaur world
- **Meaningful Themes** - Kindness, bravery, friendship, sharing, curiosity, perseverance
- **AI Illustrations** - Beautiful Stable Diffusion generated images
- **PDF Download** - Save and print the story book

## Tech Stack (100% Open Source)

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express
- **Story Generation**: [Ollama](https://ollama.ai/) (Llama, Mistral, etc.)
- **Image Generation**: [Stable Diffusion](https://github.com/AUTOMATIC1111/stable-diffusion-webui) (Automatic1111 or ComfyUI)
- **PDF Generation**: Puppeteer

## Prerequisites

### 1. Install Ollama (Story Generation)

```bash
# macOS/Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows - Download from https://ollama.ai/download
```

Pull a model (recommended: llama3.2 for best results):
```bash
ollama pull llama3.2
```

Start Ollama:
```bash
ollama serve
```

### 2. Install Stable Diffusion (Image Generation)

#### Option A: Automatic1111 Web UI (Recommended)

```bash
# Clone the repository
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
cd stable-diffusion-webui

# Run with API enabled
./webui.sh --api
# On Windows: webui-user.bat (edit to add --api flag)
```

Download a children's illustration model (recommended):
- [DreamShaper](https://civitai.com/models/4384/dreamshaper)
- [Anything V5](https://civitai.com/models/9409/anything-v5)

#### Option B: ComfyUI

```bash
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI
pip install -r requirements.txt
python main.py
```

### 3. Install Node.js

Download from [nodejs.org](https://nodejs.org/) (v18 or higher)

## Quick Start

### 1. Install Dependencies

```bash
cd kids-book-generator
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` if needed (defaults work for local installation):
```env
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
SD_URL=http://localhost:7860
SD_API_TYPE=automatic1111
PORT=3000
```

### 3. Start the Services

Terminal 1 - Ollama:
```bash
ollama serve
```

Terminal 2 - Stable Diffusion:
```bash
cd stable-diffusion-webui
./webui.sh --api
```

Terminal 3 - Kids Book Generator:
```bash
cd kids-book-generator
npm start
```

### 4. Open in Browser

Visit `http://localhost:3000`

## Server Deployment

### Using PM2 (Process Manager)

```bash
npm install -g pm2
pm2 start server/index.js --name kids-book
pm2 save
pm2 startup
```

### With Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }
}
```

### GPU Requirements

For best image generation performance:
- **Minimum**: 6GB VRAM (GTX 1060, RTX 2060)
- **Recommended**: 8GB+ VRAM (RTX 3070, RTX 4070)
- **CPU-only**: Possible but slow (10+ minutes per image)

## Customization

### Add New Themes

Edit `server/storyGenerator.js`:
```javascript
const themeMorals = {
    // existing themes...
    newTheme: "Your moral message here"
};
```

### Add New Settings

Edit both `server/storyGenerator.js` and `server/imageGenerator.js`:
```javascript
const settingDescriptions = {
    // existing settings...
    'new-setting': 'description of the magical place'
};
```

### Change Image Style

Edit `server/imageGenerator.js` to modify the base prompt:
```javascript
const baseStyle = `your custom art style description`;
```

### Recommended SD Checkpoints for Kids Art

1. **DreamShaper** - Great for fantasy illustrations
2. **Anything V5** - Anime/cartoon style
3. **Deliberate** - Versatile, good colors
4. **ToonYou** - Cartoon/Disney style

## Troubleshooting

### "Ollama is not running"
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama
ollama serve
```

### "Stable Diffusion is not running"
```bash
# Make sure to start with --api flag
./webui.sh --api
```

### Slow image generation
- Use a GPU if possible
- Lower the steps in `imageGenerator.js` (20 instead of 25)
- Use a smaller resolution (512x512 instead of 768x768)

### Out of memory
- Use a smaller model in Ollama: `ollama pull llama3.2:1b`
- Enable model offloading in SD: `--medvram` or `--lowvram`

## Project Structure

```
kids-book-generator/
├── public/
│   ├── index.html      # Frontend UI
│   ├── styles.css      # Colorful styles
│   └── app.js          # Frontend logic
├── server/
│   ├── index.js        # Express server
│   ├── storyGenerator.js   # Ollama integration
│   ├── imageGenerator.js   # Stable Diffusion integration
│   └── pdfGenerator.js     # PDF export
├── package.json
├── .env.example
└── README.md
```

## License

MIT License - Free to use and modify!

---

Made with love for kids everywhere!
