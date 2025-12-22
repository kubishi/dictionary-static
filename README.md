# Kubishi Dictionary - Static Site

A fully static dictionary website that builds from a .lift file and uses client-side smart search with TF-IDF ranking.

## Features

- 📖 Static site generation from .lift XML files (SIL FieldWorks format)
- 🔍 Smart search using TF-IDF algorithm for intelligent result ranking
- 🚀 Fast, no backend required - all data pre-processed at build time
- 🌓 Light/dark mode toggle with persistent preference
- 📱 Fully responsive design - works great on mobile and desktop
- 🎲 Random word discovery
- 🌐 Works offline after initial load
- ♿ Accessible and semantic HTML

## Setup

1. Install dependencies:
```bash
npm install
```

2. Place your `.lift` dictionary file in the project root as `dictionary.lift`

3. Build the data files from the .lift file:
```bash
npm run build:data
```

4. Run the development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
```

The production build will be in the `dist/` folder, ready to deploy to any static hosting service.

## Project Structure

```
dictionary-static/
├── build-scripts/        # Build-time .lift parsing
│   └── parse-lift.js    # Main parser that extracts data from .lift
├── src/
│   ├── main.js          # App entry point
│   ├── App.vue          # Main app component with navigation and dark mode
│   ├── assets/
│   │   └── style.css    # Global styles with CSS variables
│   ├── components/      # Reusable components (if needed)
│   ├── views/           # Page components
│   │   ├── Home.vue     # Search page with acknowledgements
│   │   ├── Browse.vue   # Browse all words alphabetically
│   │   ├── Word.vue     # Detailed word view with all metadata
│   │   ├── Pronunciation.vue  # Pronunciation guide
│   │   └── About.vue    # About page with credits
│   ├── services/
│   │   ├── data.js      # Data loading and management
│   │   └── smart-search.js  # TF-IDF search implementation
│   └── router/
│       └── index.js     # Vue Router configuration
├── public/              # Static assets
│   └── favicon.svg      # Site icon
├── data/                # Generated JSON data (created by build script)
│   ├── words.json       # All dictionary entries
│   ├── sentences.json   # All example sentences
│   ├── searchable.json  # Searchable text for each entry
│   └── index.json       # Metadata about the dictionary
└── dictionary.lift      # Your source dictionary file (place here)
```

## How It Works

### Build Process
1. The `.lift` XML file is parsed during build time using `fast-xml-parser`
2. All entries, words, senses, definitions, glosses, and sentences are extracted
3. Searchable text is generated for each entry
4. JSON data files are created in the `data/` directory
5. The frontend is built with all data embedded as static JSON

### Runtime
1. The Vue app loads the pre-generated JSON data on first visit
2. TF-IDF search index is built in the browser for fast, intelligent search
3. All search and filtering happens client-side
4. Dark mode preference is saved to localStorage
5. No server required - everything runs in the browser!

### Search Algorithm
The search uses **TF-IDF (Term Frequency-Inverse Document Frequency)**, a proven information retrieval algorithm:
- Tokenizes queries and documents
- Calculates term importance based on frequency across all documents
- Uses cosine similarity to rank results
- Applies boosts for exact matches and prefix matches
- Returns the most relevant results first

## .lift File Format

This project expects a standard SIL FieldWorks .lift (Lexicon Interchange FormaT) XML dictionary file. The parser extracts:
- Lexical entries (words and headwords)
- Forms in multiple writing systems
- Senses with definitions and glosses
- Example sentences with translations
- Grammatical information (part of speech, etc.)
- Notes and metadata
- Entry dates and GUIDs

## Deployment

The built site is completely static and can be deployed to:
- **GitHub Pages** - Free hosting with custom domains
- **Netlify** - Automatic deploys from git
- **Vercel** - Optimized for modern frameworks
- **Any static hosting service** - Just upload the `dist/` folder

### Example: Deploy to GitHub Pages

1. Build the site: `npm run build`
2. Push the `dist/` folder to a gh-pages branch
3. Enable GitHub Pages in your repository settings

## Customization

### Styling
Edit [src/assets/style.css](src/assets/style.css) to customize colors and appearance. CSS variables make it easy:
- `--bg-primary`, `--bg-secondary` - Background colors
- `--text-primary`, `--text-secondary` - Text colors
- `--accent-primary` - Accent/link color
- All variables have separate dark mode values

### Content
- Update [src/views/About.vue](src/views/About.vue) with your credits and information
- Modify [src/views/Pronunciation.vue](src/views/Pronunciation.vue) for your language's pronunciation
- Edit acknowledgements in [src/views/Home.vue](src/views/Home.vue)

## Credits

This site displays data from Glenn Nelson Jr.'s *Owens Valley Paiute Dictionary*, made possible through the contributions of native speakers and elders.

Built with Vue 3, Vite, and custom TF-IDF search implementation.
