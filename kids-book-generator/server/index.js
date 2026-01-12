// Kids Book Generator - Server
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { generateStory } = require('./storyGenerator');
const { generateImages } = require('./imageGenerator');
const { createPDF } = require('./pdfGenerator');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Store generated books temporarily (in production, use a database)
const generatedBooks = new Map();

// Generate book endpoint
app.post('/api/generate-book', async (req, res) => {
    try {
        const { childName, age, theme, setting, companion } = req.body;

        // Validate input
        if (!childName || !age || !theme || !setting || !companion) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        console.log(`📚 Generating book for ${childName}...`);

        // Generate the story
        const story = await generateStory({
            childName,
            age: parseInt(age),
            theme,
            setting,
            companion
        });

        console.log(`✍️ Story generated! Creating illustrations...`);

        // Generate illustrations for each page
        const images = await generateImages(story.pages, setting, companion);

        // Combine story with images
        const bookPages = story.pages.map((page, index) => ({
            ...page,
            image: images[index] || null
        }));

        // Create book object
        const bookId = `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const book = {
            id: bookId,
            childName,
            age,
            theme,
            setting,
            companion,
            pages: bookPages,
            createdAt: new Date().toISOString()
        };

        // Store for PDF generation
        generatedBooks.set(bookId, book);

        // Clean up old books (keep last 100)
        if (generatedBooks.size > 100) {
            const oldestKey = generatedBooks.keys().next().value;
            generatedBooks.delete(oldestKey);
        }

        console.log(`✨ Book "${bookId}" created successfully!`);

        res.json(book);

    } catch (error) {
        console.error('Error generating book:', error);
        res.status(500).json({ error: 'Failed to generate book' });
    }
});

// Download PDF endpoint
app.post('/api/download-pdf', async (req, res) => {
    try {
        const { bookId } = req.body;

        if (!bookId) {
            return res.status(400).json({ error: 'Book ID required' });
        }

        const book = generatedBooks.get(bookId);
        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }

        console.log(`📄 Generating PDF for book "${bookId}"...`);

        const pdfBuffer = await createPDF(book);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${book.childName}-story.pdf"`);
        res.send(pdfBuffer);

        console.log(`✅ PDF sent successfully!`);

    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`
    🌟 ======================================= 🌟
    ✨  Kids Book Generator Server            ✨
    ✨  100% Open Source - No API Costs!      ✨
    🌟 ======================================= 🌟

    🚀 Server running at http://localhost:${PORT}
    📚 Ready to create magical stories!

    Prerequisites:
    - Ollama running at ${process.env.OLLAMA_URL || 'http://localhost:11434'}
    - Stable Diffusion at ${process.env.SD_URL || 'http://localhost:7860'}
    `);
});
