# Magic Story Book - Kids Book Generator ✨

An AI-powered children's book generator that creates personalized stories with illustrations for kids ages 2-7.

## Features

- 🎨 **Personalized Stories** - Enter child's name and customize the adventure
- 🦄 **Fun Companions** - Choose from bunnies, puppies, dragons, unicorns, and more
- 🌍 **Magical Settings** - Enchanted forests, underwater kingdoms, space adventures
- 💝 **Meaningful Themes** - Kindness, bravery, friendship, sharing, and more
- 🖼️ **AI Illustrations** - Beautiful DALL-E generated images for each page
- 📥 **PDF Download** - Save and print the story book

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express
- **AI Story Generation**: OpenAI GPT-4
- **AI Images**: DALL-E 3
- **PDF Generation**: Puppeteer

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

Edit `.env` and add your OpenAI API key:

```
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
```

### 3. Run the Server

```bash
npm start
```

### 4. Open in Browser

Visit `http://localhost:3000`

## Server Deployment

To deploy on your server:

1. Upload the `kids-book-generator` folder to your server
2. Install Node.js (v18 or higher recommended)
3. Run `npm install`
4. Set up your `.env` file with API keys
5. Use PM2 for production: `pm2 start server/index.js --name kids-book`

### With Nginx (optional)

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
    }
}
```

## API Costs

This app uses OpenAI APIs which have associated costs:
- **GPT-4**: ~$0.03-0.06 per story generation
- **DALL-E 3**: ~$0.04-0.08 per image (8 images per book)
- **Estimated total**: ~$0.35-0.70 per book

Consider setting up usage limits in your OpenAI dashboard.

## Customization

### Add New Themes

Edit `server/storyGenerator.js` and add to `themeMorals`:

```javascript
const themeMorals = {
    // existing themes...
    newTheme: "Your moral message here"
};
```

### Add New Settings

Edit both `server/storyGenerator.js` and `server/imageGenerator.js` to add new magical worlds.

### Adjust for Age

The story complexity automatically adjusts based on age (simpler for 2-3, slightly more complex for 5-7).

## License

MIT License - Feel free to use and modify for your projects!

---

Made with ✨ magic and 💜 love for kids everywhere!
