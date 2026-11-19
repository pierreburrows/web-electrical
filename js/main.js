/* Copperline — scroll engine, HUD, breaker board */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- HUD content per chapter ---------------- */
  const HUD = {
    panels(i, l, p) {
      const status = ['Standby', 'Standby', 'Door open', 'Testing', 'Inspecting', 'Live'][i];
      const tone = ['', '', 'amber', 'mint', 'amber', 'mint'][i];
      const live = i === 5 ? Math.round(clamp(l / 0.8, 0, 1) * 18) : 0;
      return { status, tone, v: { volts: i >= 3 ? '240.2 V' : '— V', main: '100 A', live: `${live} / 18` } };
    },
    generators(i, l, p) {
      const starting = i === 1 && l < 0.55;
      const status = i === 0 ? 'Outage' : starting ? 'Starting' : 'On generator';
      const tone = i === 0 ? 'orange' : starting ? 'amber' : 'mint';
      const gen = i === 0 || (i === 1 && l < 0.3) ? 'Standby' : '3,000 rpm · 230 V';
      return { status, tone, v: { utility: '0 V', gen, elapsed: `${Math.round(p * 12)} s` } };
    },
    ev(i, l, p) {
      const charging = i === 2 && l > 0.6;
      const kw = charging ? 7.4 * clamp((l - 0.6) / 0.3, 0, 1) : 0;
      return {
        status: charging ? 'Charging' : 'Installing',
        tone: charging ? 'mint' : 'amber',
        v: { circuit: '32 A · 230 V', output: `${kw.toFixed(1)} kW`, range: charging && l > 0.8 ? '25 mi / hr' : '—' },
        checks: p
      };
    }
  };

  /* ---------------- Chapters ---------------- */
  const chapters = $$('.chapter').map(el => {
    const media = $$('.media > img, .media > video', el);
    const c = {
      el, name: el.dataset.chapter, n: +el.dataset.scenes,
      media,
      fx: $$('.fx', el),
      scenes: $$('.scene', el),
      hud: $('.hud', el),
      railDot: $('.rail i', el),
      bar: $('.tag__bar b', el),
      next: $('.tag__next', el),
      top: 0, height: 0, idx: -1,
      scrub: media.filter(m => m.classList.contains('scrub')).map(v => ({ v, t: 0, target: 0, ready: false }))
    };
    c.scrub.forEach(s => {
      s.v.addEventListener('loadedmetadata', () => { s.ready = true; });
      s.v.load();
    });
    c.next.addEventListener('click', () => {
      const vh = innerHeight;
      const target = c.idx + 1 < c.n
        ? c.top + ((c.idx + 1) / c.n) * (c.height - vh) + 4
        : c.top + c.height;
      scrollTo({ top: target, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
    return c;
  });

  function measure() {
    chapters.forEach(c => {
      const r = c.el.getBoundingClientRect();
      c.top = r.top + scrollY;
      c.height = r.height;
    });
  }

  function applyHud(c, i, l, p) {
    const d = HUD[c.name](i, l, p);
    const st = $('[data-status]', c.hud);
    if (st.textContent !== d.status) st.textContent = d.status;
    c.hud.dataset.tone = d.tone;
    for (const k in d.v) {
      const el = c.hud.querySelector(`[data-key="${k}"]`);
      if (el && el.textContent !== d.v[k]) el.textContent = d.v[k];
    }
    if (d.checks !== undefined) {
      $$('.hud__checks li', c.hud).forEach(li => li.classList.toggle('is-done', p >= +li.dataset.at));
    }
  }

  function updateChapter(c) {
    const vh = innerHeight;
    const y = scrollY;
    if (y + vh < c.top - vh || y > c.top + c.height + vh) return; // far away
    const p = clamp((y - c.top) / (c.height - vh), 0, 1);
    const f = p * c.n;
    const i = Math.min(Math.floor(f), c.n - 1);
    const l = clamp(f - i, 0, 1);

    // media stacking
    c.media.forEach(m => {
      const k = +m.dataset.scene, span = +(m.dataset.span || 1), e = k + span - 1;
      const on = i >= k && i <= e;
      m.classList.toggle('is-on', on);
      m.classList.toggle('is-under', e < i);
      m.classList.toggle('is-gone', e < i - 1 || k > i + 1);
      if (m.tagName === 'IMG') {
        const s = reduceMotion ? 1 : on ? 1 + l * 0.07 : e < i ? 1.07 : 1;
        m.style.transform = `scale(${s.toFixed(4)})`;
      } else if (m.classList.contains('loop')) {
        if (on) { if (m.paused) m.play().catch(() => {}); }
        else if (!m.paused) m.pause();
      }
    });
    c.fx.forEach(f => {
      const on = +f.dataset.scene === i;
      f.classList.toggle('is-on', on);
      if (on) f.style.setProperty('--y', `${12 + l * 74}%`);
    });

    // scrub targets
    c.scrub.forEach(s => {
      const k = +s.v.dataset.scene, span = +(s.v.dataset.span || 1), e = k + span - 1;
      if (i < k) s.target = 0;
      else if (i > e) s.target = 1;
      else s.target = ((i - k) + l) / span;
    });

    // copy
    c.scenes.forEach(sc => {
      const k = +sc.dataset.scene;
      const reveal = +(sc.dataset.reveal || 0);
      const isIn = k === i && l >= reveal;
      sc.classList.toggle('is-in', isIn);
      sc.classList.toggle('is-out', k < i);
    });

    // chrome
    if (c.railDot) c.railDot.style.transform = `translateY(${(p * 355).toFixed(1)}%)`;
    if (c.bar) c.bar.style.width = `${(p * 100).toFixed(1)}%`;
    applyHud(c, i, l, p);
    c.idx = i;
  }

  /* video scrubbing (smoothed) */
  function tickScrub() {
    chapters.forEach(c => c.scrub.forEach(s => {
      if (!s.ready) return;
      const dur = s.v.duration || 0;
      if (!dur) return;
      const target = reduceMotion ? 1 : s.target;
      s.t = Math.abs(target - s.t) < 0.002 ? target : lerp(s.t, target, 0.18);
      const time = clamp(s.t * (dur - 0.04), 0, dur);
      if (Math.abs(s.v.currentTime - time) > 0.016 && !s.v.seeking) {
        try { s.v.currentTime = time; } catch (e) { /* not ready */ }
      }
    }));
    requestAnimationFrame(tickScrub);
  }

  let queued = false;
  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; chapters.forEach(updateChapter); });
  }

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { measure(); onScroll(); });
  addEventListener('load', () => { measure(); onScroll(); });
  measure(); onScroll(); requestAnimationFrame(tickScrub);

  /* ---------------- Mobile menu ---------------- */
  const burger = $('#burger'), menu = $('#menu');
  burger.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') !== 'true';
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
  });
  $$('a', menu).forEach(a => a.addEventListener('click', () => burger.click()));

  /* ---------------- Breaker board ---------------- */
  const CIRCUITS = [
    { name: 'Living room',       amps: 16, load: 3,  room: true },
    { name: 'Kitchen / dining',  amps: 32, load: 5,  room: true },
    { name: 'Hall + porch',      amps: 6,  load: 1,  room: true },
    { name: 'Main bedroom',      amps: 16, load: 2,  room: true },
    { name: 'Bedroom 2',         amps: 16, load: 2,  room: true },
    { name: 'Bedroom 3',         amps: 16, load: 2,  room: true },
    { name: 'Loft room',         amps: 16, load: 2,  room: true },
    { name: 'Garage + outside',  amps: 20, load: 3,  room: true },
    { name: 'Garden lighting',   amps: 6,  load: 1,  room: true },
    { name: 'Heat pump',         amps: 32, load: 12, room: false },
    { name: 'EV charger',        amps: 32, load: 32, room: false },
    { name: 'Cooker',            amps: 32, load: 15, room: false }
  ];
  const grid = $('#grid'), mainSw = $('#mainSw'), panelui = $('.panelui');
  const state = { main: false, on: CIRCUITS.map(() => false) };
  const ROOMS = CIRCUITS.filter(c => c.room).length;

  grid.innerHTML = CIRCUITS.map((c, i) => `
    <button class="brk" type="button" data-i="${i}" aria-pressed="false">
      <span class="sw" aria-hidden="true"><i></i></span>
      <span><span class="brk__name">${c.name}</span><span class="brk__spec">${c.amps} A · RCBO</span></span>
      <i class="brk__led" aria-hidden="true"></i>
    </button>`).join('');
  const brks = $$('.brk', grid);

  function render() {
    const live = state.main;
    let load = 0, rooms = 0;
    CIRCUITS.forEach((c, i) => {
      const on = state.on[i];
      const b = brks[i];
      b.setAttribute('aria-pressed', String(on));
      $('.sw', b).setAttribute('aria-checked', String(on));
      b.classList.toggle('is-on', on && live);
      if (on && live) { load += c.load; if (c.room) rooms++; }
    });
    mainSw.setAttribute('aria-checked', String(state.main));
    panelui.classList.toggle('is-main-off', !state.main);
    $('#statLoad').textContent = `${load} A`;
    $('#statRooms').textContent = `${rooms} / ${ROOMS}`;
    const pct = Math.round(load / 100 * 100);
    $('#meterFill').style.width = `${Math.min(100, pct)}%`;
    $('#meterText').textContent = `${pct}% of a 100 A supply`;
    $('#houseLit').style.opacity = live ? (rooms / ROOMS).toFixed(3) : 0;
  }
  grid.addEventListener('click', e => {
    const b = e.target.closest('.brk'); if (!b) return;
    const i = +b.dataset.i; state.on[i] = !state.on[i];
    if (state.on[i] && !state.main) state.main = true; // first flip wakes the main
    render();
  });
  mainSw.addEventListener('click', () => { state.main = !state.main; render(); });
  $('#allOn').addEventListener('click', () => { state.main = true; state.on = state.on.map(() => true); render(); });
  $('#reset').addEventListener('click', () => { state.main = false; state.on = state.on.map(() => false); render(); });
  render();

  /* ---------------- Form + misc ---------------- */
  const form = $('#bookForm');
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    $('#formOk').hidden = false;
    form.querySelector('button[type=submit]').disabled = true;
  });
  $('#year').textContent = new Date().getFullYear();
})();
