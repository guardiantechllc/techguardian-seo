// Kids Book Generator - Frontend JavaScript

class KidsBookGenerator {
    constructor() {
        this.currentPage = 0;
        this.totalPages = 0;
        this.bookData = null;

        this.initElements();
        this.attachEventListeners();
    }

    initElements() {
        // Sections
        this.creatorSection = document.getElementById('creator-section');
        this.loadingSection = document.getElementById('loading-section');
        this.bookSection = document.getElementById('book-section');

        // Form
        this.storyForm = document.getElementById('story-form');

        // Loading
        this.loadingMessage = document.getElementById('loading-message');
        this.progressFill = document.getElementById('progress-fill');

        // Book
        this.book = document.getElementById('book');
        this.prevBtn = document.getElementById('prev-btn');
        this.nextBtn = document.getElementById('next-btn');
        this.pageIndicator = document.getElementById('page-indicator');
        this.newStoryBtn = document.getElementById('new-story-btn');
        this.downloadBtn = document.getElementById('download-btn');
    }

    attachEventListeners() {
        this.storyForm.addEventListener('submit', (e) => this.handleSubmit(e));
        this.prevBtn.addEventListener('click', () => this.prevPage());
        this.nextBtn.addEventListener('click', () => this.nextPage());
        this.newStoryBtn.addEventListener('click', () => this.newStory());
        this.downloadBtn.addEventListener('click', () => this.downloadPDF());

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (this.bookSection.classList.contains('hidden')) return;
            if (e.key === 'ArrowLeft') this.prevPage();
            if (e.key === 'ArrowRight') this.nextPage();
        });
    }

    async handleSubmit(e) {
        e.preventDefault();

        const formData = new FormData(this.storyForm);
        const data = {
            childName: formData.get('childName'),
            age: formData.get('age'),
            theme: formData.get('theme'),
            setting: formData.get('setting'),
            companion: formData.get('companion')
        };

        // Validate
        if (!data.childName || !data.age || !data.theme || !data.setting || !data.companion) {
            alert('Please fill in all fields to create your story!');
            return;
        }

        this.showLoading();
        await this.generateBook(data);
    }

    showLoading() {
        this.creatorSection.classList.add('hidden');
        this.loadingSection.classList.remove('hidden');
        this.bookSection.classList.add('hidden');

        // Animate progress and messages
        const messages = [
            'Gathering stardust and imagination...',
            'Mixing colors of the rainbow...',
            'Waking up the story fairies...',
            'Painting magical illustrations...',
            'Adding sparkles and wonder...',
            'Putting the finishing touches...',
            'Your story is almost ready!'
        ];

        let progress = 0;
        let messageIndex = 0;

        const interval = setInterval(() => {
            progress += Math.random() * 15 + 5;
            if (progress > 95) progress = 95;
            this.progressFill.style.width = progress + '%';

            if (progress > (messageIndex + 1) * 14 && messageIndex < messages.length - 1) {
                messageIndex++;
                this.loadingMessage.textContent = messages[messageIndex];
            }
        }, 800);

        this.loadingInterval = interval;
    }

    hideLoading() {
        if (this.loadingInterval) {
            clearInterval(this.loadingInterval);
        }
        this.progressFill.style.width = '100%';

        setTimeout(() => {
            this.loadingSection.classList.add('hidden');
            this.bookSection.classList.remove('hidden');
        }, 500);
    }

    async generateBook(data) {
        try {
            const response = await fetch('/api/generate-book', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error('Failed to generate book');
            }

            this.bookData = await response.json();
            this.renderBook();
            this.hideLoading();

        } catch (error) {
            console.error('Error generating book:', error);
            alert('Oops! Something went wrong creating your story. Please try again!');
            this.newStory();
        }
    }

    renderBook() {
        if (!this.bookData || !this.bookData.pages) return;

        this.book.innerHTML = '';
        this.totalPages = this.bookData.pages.length;
        this.currentPage = 0;

        this.bookData.pages.forEach((page, index) => {
            const pageEl = document.createElement('div');
            pageEl.className = `book-page-content ${index === 0 ? 'active' : ''}`;
            pageEl.dataset.page = index;

            if (page.type === 'cover') {
                pageEl.classList.add('cover-page');
                pageEl.innerHTML = `
                    <h1>${page.title}</h1>
                    ${page.image ? `<img src="${page.image}" alt="Cover" class="cover-image">` : ''}
                    <p class="author">A story for ${this.bookData.childName}</p>
                `;
            } else if (page.type === 'story') {
                pageEl.classList.add('story-page');
                pageEl.innerHTML = `
                    ${page.image ? `<img src="${page.image}" alt="Illustration" class="illustration">` : ''}
                    <p class="text">${page.text}</p>
                    <span class="page-number">${page.pageNumber}</span>
                `;
            } else if (page.type === 'end') {
                pageEl.classList.add('end-page');
                pageEl.innerHTML = `
                    <h2>The End</h2>
                    <p class="moral">${page.moral}</p>
                `;
            }

            this.book.appendChild(pageEl);
        });

        this.updateNavigation();
    }

    updateNavigation() {
        this.prevBtn.disabled = this.currentPage === 0;
        this.nextBtn.disabled = this.currentPage === this.totalPages - 1;
        this.pageIndicator.textContent = `Page ${this.currentPage + 1} of ${this.totalPages}`;
    }

    showPage(pageIndex) {
        const pages = this.book.querySelectorAll('.book-page-content');
        pages.forEach((page, index) => {
            page.classList.toggle('active', index === pageIndex);
        });
        this.currentPage = pageIndex;
        this.updateNavigation();
    }

    prevPage() {
        if (this.currentPage > 0) {
            this.showPage(this.currentPage - 1);
        }
    }

    nextPage() {
        if (this.currentPage < this.totalPages - 1) {
            this.showPage(this.currentPage + 1);
        }
    }

    newStory() {
        this.creatorSection.classList.remove('hidden');
        this.loadingSection.classList.add('hidden');
        this.bookSection.classList.add('hidden');
        this.storyForm.reset();
        this.progressFill.style.width = '0%';
        this.loadingMessage.textContent = 'Gathering stardust and imagination...';
    }

    async downloadPDF() {
        if (!this.bookData) return;

        this.downloadBtn.disabled = true;
        this.downloadBtn.innerHTML = '<span>⏳</span> Creating PDF...';

        try {
            const response = await fetch('/api/download-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ bookId: this.bookData.id })
            });

            if (!response.ok) {
                throw new Error('Failed to generate PDF');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.bookData.childName}-story.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();

        } catch (error) {
            console.error('Error downloading PDF:', error);
            alert('Oops! Could not create PDF. Please try again!');
        } finally {
            this.downloadBtn.disabled = false;
            this.downloadBtn.innerHTML = '<span>📥</span> Download PDF';
        }
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    window.app = new KidsBookGenerator();
});
