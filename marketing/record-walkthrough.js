const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const dir = process.argv[2];
  const W = 1920, H = 1080;
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1,
    recordVideo: { dir, size: { width: W, height: H } } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:8787/', { waitUntil: 'load' });
  // disable CSS smooth scroll so our easing drives everything; wait for clips to buffer
  await page.addStyleTag({ content: 'html{scroll-behavior:auto !important}' });
  await page.evaluate(() => new Promise(res => {
    const vids = [...document.querySelectorAll('video')];
    let n = 0; const done = () => { if (++n >= vids.length) res(); };
    vids.forEach(v => { if (v.readyState >= 3) done(); else { v.addEventListener('canplaythrough', done, { once: true }); setTimeout(done, 8000); } });
  }));
  await page.evaluate(() => {
    window.__glide = (y, ms) => new Promise(res => {
      const y0 = scrollY, d = y - y0, t0 = performance.now();
      const ease = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
      const step = now => { const t = Math.min(1, (now - t0) / ms); scrollTo(0, y0 + d * ease(t)); if (t < 1) requestAnimationFrame(step); else res(); };
      requestAnimationFrame(step);
    });
    window.__chapter = (id, frac) => { const el = document.getElementById(id); const r = el.getBoundingClientRect(); return Math.round(r.top + scrollY + frac * (r.height - innerHeight)); };
    window.__top = id => { const el = document.getElementById(id); return Math.round(el.getBoundingClientRect().top + scrollY); };
  });
  const glide = (y, ms) => page.evaluate(([y, ms]) => window.__glide(y, ms), [y, ms]);
  const chap = (id, f) => page.evaluate(([id, f]) => window.__chapter(id, f), [id, f]);
  const top = id => page.evaluate(id => window.__top(id), id);

  await sleep(500);                      // settle
  await page.evaluate(() => scrollTo(0, 0));
  await sleep(3200);                     // hero loop

  // Chapter 1: six scenes
  const n1 = 6;
  for (let i = 1; i <= n1; i++) {
    const f = Math.min(1, (i + 0.55) / n1);           // land a bit past each scene boundary
    await glide(await chap('panels', f), 2400);
    await sleep(i === 2 || i === 3 ? 1900 : 1500);
  }
  // Breaker board
  await glide(await top('try-it') - 40, 1800);
  await sleep(1200);
  for (const i of [1, 0, 3, 7, 2]) { await page.click(`.brk[data-i="${i}"]`); await sleep(420); }
  await sleep(600);
  await page.click('#allOn'); await sleep(1600);

  // Chapter 2
  for (let i = 0; i < 3; i++) {
    await glide(await chap('generators', Math.min(1, (i + 0.6) / 3)), 2600);
    await sleep(i === 1 ? 2000 : 1500);
  }
  // Chapter 3
  for (let i = 0; i < 3; i++) {
    await glide(await chap('ev-chargers', Math.min(1, (i + 0.6) / 3)), 2600);
    await sleep(i === 2 ? 2000 : 1400);
  }
  // Pricing + book
  await glide(await top('pricing') - 20, 1800); await sleep(2600);
  await glide(await top('book') - 20, 1600); await sleep(2200);
  await sleep(600);
  await ctx.close(); await browser.close();
  console.log('recorded');
})();
