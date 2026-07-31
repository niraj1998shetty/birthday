# 🎂 Happy Birthday — Aanya

A romantic, interactive birthday website (mobile + desktop friendly) built with plain HTML, CSS & JavaScript. Zero build step. Drops straight onto Vercel.

## ✨ Screens

1. **Welcome** — “Happy Birthday, AANYA SHARMA” + Yes / No (the No button runs away 😏)
2. **Balloon Pop** — tap all 4 balloons
3. **Blow the Candle** — tap the button **or** actually blow into the mic
4. **Make a Wish** — soft “Close your eyes & make a wish” moment
5. **Rose Bouquet** — a bouquet reveal + Continue
6. **Sweet Moments** — a swipeable photo card deck
7. **Final Love Note** — confetti + personal message + Play again

## 🖼️ What YOU need to add (optional — the site already works with placeholders)

All assets are **optional**. Without them you get emojis and gradients. To personalize:

Create these folders / files (paths are relative to project root):

```
images/
  hero-cake.png          (optional — hero bears/cake illustration)
  bouquet.png            (optional — rose bouquet photo)
  memories/
    1.jpg
    2.jpg
    3.jpg
    4.jpg
audio/
  song.mp3               (optional — background music, plays after clicking Yes)
```

### Recommended image sizes
- `memories/*.jpg` — around **800 × 1000 px** (portrait). Any size works; they’re cropped to fit.
- `hero-cake.png` / `bouquet.png` — anything with a transparent background looks best.

### Change her name / messages
Open [index.html](index.html) and edit the text inside `.title-name`, the wish text, the final love note, etc.

### Change / add memories
Open [js/app.js](js/app.js) and edit the `memories` array:

```js
const memories = [
  { img: 'images/memories/1.jpg', caption: 'Celebrating you 🎉' },
  { img: 'images/memories/2.jpg', caption: 'Our little adventures 💫' },
  // add more...
];
```

## ▶️ Run locally

Just open `index.html` in a browser. For the microphone-blow feature to work, you should serve it over `http://localhost`:

```powershell
# any static server works — for example:
npx serve .
```

Then open http://localhost:3000.

## ☁️ Deploy to Vercel

1. Push this folder to a GitHub repo.
2. Go to https://vercel.com/new, import the repo.
3. Framework preset: **Other** (it’s just static files).
4. Build command: *(leave empty)*
5. Output directory: *(leave empty — it will serve the root)*
6. Deploy. Done. 🎉

Alternatively, with the Vercel CLI:

```powershell
npm i -g vercel
vercel
```

## 📁 Structure

```
birthday/
├── index.html          # all screens
├── css/styles.css      # styles + animations
├── js/app.js           # screen logic, balloon pop, mic blow, swipe deck, confetti
├── images/             # (optional) your photos
└── audio/              # (optional) background music
```

## 💗 Notes

- The mic-based candle blow is optional. If mic permission is denied, the tap button always works.
- Reduced-motion users get a static version automatically.
- The “No” button gently runs away — it’s a joke, feel free to remove it in [js/app.js](js/app.js) if you prefer.
