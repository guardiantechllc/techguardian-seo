# Tech Guardian SEO Website

## Project Overview

Static SEO-focused website for **Tech Guardian LLC**, a device repair business located in Lee's Summit, MO serving the Kansas City metro area. Hosted on GitHub Pages at `guardiantechllc.github.io/techguardian-seo`.

## Business Information

- **Company**: Tech Guardian LLC
- **Phone**: (816) 697-9268
- **Email**: tech@guardianlabs.digital
- **Address**: 1239 NE Douglas St Suite D, Lee's Summit, MO 64086
- **Website**: https://guardandrevive.com
- **Hours**: Mon-Sat 10:00 AM - 6:00 PM

## Project Structure

```
techguardian-seo/
├── services/           # Location/service-specific landing pages
│   └── kansas-city.html
└── CLAUDE.MD
```

## Tech Stack

- **HTML5** - Static pages with semantic markup
- **CSS** - Embedded styles using CSS custom properties
- **Google Fonts** - Inter font family
- **Schema.org** - JSON-LD structured data for SEO

## Development Guidelines

### HTML Pages

- Each page is self-contained with embedded CSS (no external stylesheets)
- Use semantic HTML5 elements
- Include proper meta tags: description, keywords, robots, geo tags
- Set canonical URLs pointing to the GitHub Pages domain

### SEO Requirements

- Every page must include JSON-LD structured data for:
  - `LocalBusiness` schema with full business details
  - `Service` schema for specific services offered
- Include `geo.region` and `geo.placename` meta tags for local SEO
- Use descriptive, keyword-rich title tags
- Meta descriptions should include phone number and key selling points

### Brand Colors

```css
--blue: #180EC0;        /* Primary brand color */
--blue-glow: rgba(24,14,192,0.4);  /* Glow effect */
```

### Design Patterns

- Dark theme (black background, white text)
- Uppercase headings with `.highlight` class for brand color emphasis
- CTA buttons with glow hover effects
- Mobile-responsive using `clamp()` for fluid typography

## Common Tasks

### Adding a New Location Page

1. Copy an existing page from `services/`
2. Update the city name throughout the page
3. Update meta tags (title, description, keywords, geo tags)
4. Update canonical URL
5. Update JSON-LD structured data (areaServed, description)

### Testing

- Validate HTML at https://validator.w3.org/
- Test structured data at https://search.google.com/test/rich-results
- Check mobile responsiveness

## Deployment

Site is deployed via GitHub Pages. Push to main branch to deploy.
