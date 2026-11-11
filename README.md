# NOVA AI

A mobile-first (9:16) AI assistant with a red black-hole orb that emits particles, voice input, animated gradient background and dark/light themes. Plain HTML, CSS and JavaScript. No build step.

## Structure
```
my-project/
├── index.html          # Entry point
├── README.md
├── css/style.css       # Styles (theme tokens, animated gradient)
├── js/config.js        # Provider, model and API keys
├── js/script.js        # App logic, key rotation, voice, orb
└── assets/images/      # Icons (icon.svg)
```

## Run locally
Open `index.html` in a browser, or run `python3 -m http.server` in this folder and visit http://localhost:8000. Voice input needs Chrome or Safari and a secure origin (https or localhost).

## API keys
Put up to four keys in `js/config.js`. NOVA uses them in order and moves to the next when one hits a rate or billing limit (HTTP 401, 402, 403, 429 or a quota message). With no keys it runs in Local mode (maths, time, date only).

**Security warning:** this is a client-side app, so every key in `config.js` is visible to anyone who opens your site. Never commit real keys to a public repository. For a public site, put the keys on a small server or serverless function and have the page call that instead.

## Deploy on GitHub Pages
Push the folder, then Settings > Pages > Deploy from branch > `main` / root.

## Fonts
Sora and Inter load from Google Fonts. To self-host, download the `.woff2` files into `assets/fonts/` and uncomment the `@font-face` block at the top of `css/style.css`.

## Features
Chat history with delete and export, copy and redo buttons, stop button, voice input with spoken replies when you speak, dark and light mode, drag-to-tilt orb, reduced-motion support.
