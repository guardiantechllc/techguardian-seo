// PDF Generator using Puppeteer
const puppeteer = require('puppeteer');

async function createPDF(book) {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();

        // Generate HTML for the book
        const html = generateBookHTML(book);

        await page.setContent(html, {
            waitUntil: 'networkidle0'
        });

        // Generate PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '0',
                right: '0',
                bottom: '0',
                left: '0'
            }
        });

        return pdfBuffer;

    } finally {
        await browser.close();
    }
}

function generateBookHTML(book) {
    const pages = book.pages.map((pageData, index) => {
        if (pageData.type === 'cover') {
            return `
                <div class="page cover-page">
                    <div class="cover-content">
                        <h1 class="cover-title">${escapeHTML(pageData.title)}</h1>
                        ${pageData.image ? `<img src="${pageData.image}" class="cover-image" alt="Cover">` : ''}
                        <p class="cover-author">A story for ${escapeHTML(book.childName)}</p>
                    </div>
                </div>
            `;
        } else if (pageData.type === 'story') {
            return `
                <div class="page story-page">
                    ${pageData.image ? `<img src="${pageData.image}" class="story-image" alt="Illustration">` : ''}
                    <p class="story-text">${escapeHTML(pageData.text)}</p>
                    <span class="page-number">${pageData.pageNumber}</span>
                </div>
            `;
        } else if (pageData.type === 'end') {
            return `
                <div class="page end-page">
                    <h2 class="end-title">The End</h2>
                    ${pageData.image ? `<img src="${pageData.image}" class="end-image" alt="The End">` : ''}
                    <div class="moral-box">
                        <p class="moral-text">${escapeHTML(pageData.moral)}</p>
                    </div>
                </div>
            `;
        }
        return '';
    }).join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Bubblegum+Sans&family=Nunito:wght@400;600;700&display=swap');

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Nunito', sans-serif;
        }

        .page {
            width: 210mm;
            height: 297mm;
            page-break-after: always;
            position: relative;
            overflow: hidden;
        }

        /* Cover Page */
        .cover-page {
            background: linear-gradient(135deg, #FF6B9D, #9B59B6, #3498DB, #2ECC71);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .cover-content {
            text-align: center;
            color: white;
            padding: 40px;
        }

        .cover-title {
            font-family: 'Bubblegum Sans', cursive;
            font-size: 48px;
            margin-bottom: 30px;
            text-shadow: 3px 3px 0 rgba(0, 0, 0, 0.2);
        }

        .cover-image {
            width: 300px;
            height: 300px;
            border-radius: 50%;
            object-fit: cover;
            border: 8px solid white;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            margin: 20px 0;
        }

        .cover-author {
            font-size: 24px;
            margin-top: 20px;
            opacity: 0.9;
        }

        /* Story Page */
        .story-page {
            background: linear-gradient(180deg, #E8F8FF 0%, #FFF5E6 100%);
            padding: 30px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }

        .story-image {
            width: 100%;
            max-height: 400px;
            object-fit: cover;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            margin-bottom: 30px;
        }

        .story-text {
            font-size: 28px;
            line-height: 1.8;
            text-align: center;
            color: #2C3E50;
            max-width: 90%;
            padding: 20px;
        }

        .page-number {
            position: absolute;
            bottom: 30px;
            right: 40px;
            font-size: 18px;
            color: #9B59B6;
            font-weight: bold;
        }

        /* End Page */
        .end-page {
            background: linear-gradient(135deg, #2ECC71, #3498DB);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
            padding: 40px;
        }

        .end-title {
            font-family: 'Bubblegum Sans', cursive;
            font-size: 64px;
            margin-bottom: 40px;
            text-shadow: 3px 3px 0 rgba(0, 0, 0, 0.2);
        }

        .end-image {
            width: 250px;
            height: 250px;
            border-radius: 50%;
            object-fit: cover;
            border: 6px solid white;
            margin-bottom: 40px;
        }

        .moral-box {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 20px;
            padding: 30px 40px;
            max-width: 80%;
        }

        .moral-text {
            font-size: 24px;
            line-height: 1.8;
            text-align: center;
            font-style: italic;
        }

        /* Decorations */
        .cover-page::before,
        .end-page::before {
            content: '✨';
            position: absolute;
            font-size: 40px;
            top: 30px;
            left: 30px;
            opacity: 0.5;
        }

        .cover-page::after,
        .end-page::after {
            content: '✨';
            position: absolute;
            font-size: 40px;
            bottom: 30px;
            right: 30px;
            opacity: 0.5;
        }
    </style>
</head>
<body>
    ${pages}
</body>
</html>
    `;
}

function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

module.exports = { createPDF };
