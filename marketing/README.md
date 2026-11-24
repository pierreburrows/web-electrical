# Marketing assets

- `copperline-walkthrough.mp4` — 73 s, 1920×1080, 30 fps, silent. A scripted scroll-through of the live site recorded in a headless browser, with a branded end card.
- `record-walkthrough.js` — the Playwright script that produced it. Serve the site on port 8787, then `node record-walkthrough.js <output-dir>`; it writes a `.webm` which was trimmed, faded and encoded with ffmpeg.
