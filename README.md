# 🏥 Second Opinion — Plain HTML / CSS / JS Version

**Second Opinion** is a web application that explains medical reports in simple, plain language — in **English or Hindi** — using Gemini AI principles and Web Speech API.

> ⚕️ "Your test report says a lot. Nobody ever explains what it means."

---

## ⚡ Tech Stack (Pure Vanilla Stack)

- 📄 **HTML5** (Semantic structure)
- 🎨 **CSS3** (Custom Design System, Fraunces serif + IBM Plex Sans typography, HSL/Tailored colors)
- ⚡ **Vanilla JavaScript (ES6+)** (No dependencies, zero build steps, direct browser execution)
- 🎙️ **Web Speech API** (Native Speech-to-Text & Text-to-Speech)
- 💾 **LocalStorage API** (Persistent report history & session storage)

---

## 🚀 How to Run Locally

You don't need `npm` or any node modules! Simply open `index.html` in any browser:

1. Double-click `index.html` to open directly in Chrome/Safari/Edge/Firefox.
2. OR use any lightweight local web server (VS Code Live Server, Python `python -m http.server 8000`, etc.)

---

## 🌐 Deploy to GitHub Pages (For Phone Access)

1. Push this folder to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of HTML version"
   git remote add origin https://github.com/nilesh24n/SecondOpinion-HTML.git
   git push -u origin main
   ```
2. On GitHub, go to **Settings** → **Pages** → Branch: `main` → Folder: `/ (root)` → Save.
3. Your site will be live at `https://nilesh24n.github.io/SecondOpinion-HTML/` in under 1 minute! You can open it on your phone immediately!
