# Copperline Electric — website

A scroll-driven, cinematic one-page site for a residential electrical contractor
(panels, standby generators, EV chargers). Static HTML, CSS and vanilla JS — no build step.

## Run locally

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

Any static host works (Vercel, Netlify, GitHub Pages). `vercel.json` sets long cache headers for `assets/`.

## How it works

- `index.html` — three pinned "chapters" (`.chapter` → sticky `.stage`), an interactive breaker board, pricing, booking form and footer.
- `js/main.js` — the scroll engine. Each chapter's height is `scenes × 115vh`; scroll progress picks the active scene, crossfades the stills, scrubs the transition clips by `currentTime`, reveals copy and drives the HUD card. Also the breaker-board state machine.
- `css/styles.css` — design tokens, typography, HUD, board, pricing, responsive rules.
- `assets/img` — 14 scene stills (2048px wide JPEG).
- `assets/video` — short H.264 clips. Transition clips are encoded with a 4-frame GOP so seeking is frame-accurate when scrubbed.

All stills and clips were generated with Higgsfield (GPT Image 2.6 for stills, Kling 3.0 for the start-frame → end-frame transition clips).

## Editing

- Copy lives in the `.scene` blocks in `index.html`; HUD values per scene are in the `HUD` object in `js/main.js`.
- To add a scene: add an `<img>`/`<video data-scene="n">` in `.media`, a `.scene[data-scene="n"]` in `.copy`, and bump `data-scenes`/`--n` on the chapter.
- Breaker circuits (name, amps, poles, load) are the `CIRCUITS` array in `js/main.js`.
