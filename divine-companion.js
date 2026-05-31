// =============================================================
// Divine — angelic AI voice companion. Loaded on every page by
// topbar.js. Renders the orb visualizer, handles the microphone +
// speech recognition, talks to Claude via /api/divine-chat, speaks
// via /api/divine-tts, and performs dashboard voice actions.
//
// No secrets live here. All API keys are held server-side in the
// Vercel functions under /api.
// =============================================================
(function () {
  'use strict';
  if (window.__divineCompanion) return;
  window.__divineCompanion = true;
  // Don't run inside the water iframe embedded in health.html.
  try { if (window.self !== window.top) return; } catch (e) { return; }

  // -------- Supabase (same public anon project as the rest of the app) --------
  const SUPA_URL = 'https://reatwgqnfuiomdidrhdd.supabase.co';
  const SUPA_KEY = 'sb_publishable_hjm63T8ml2uo-2wNndQYmg_sA2oc4iZ';

  const IS_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const PURPLE = '#C9B6FF';

  const SYSTEM_PROMPT =
    "You are Divine, an angelic AI companion living inside a personal life dashboard. " +
    "You are warm, calm, ethereal and speak like a gentle guardian angel. You are aware of " +
    "which page the user is on and can see their data from localStorage. Keep responses concise " +
    "and conversational.";

  // ===========================================================
  // State
  // ===========================================================
  let visualState = 'idle';   // 'idle' | 'listening' | 'speaking'
  let micGranted = false;
  let muted = false;
  let recognizing = false;
  let recognition = null;
  let micStream = null;
  let audioCtx = null;
  let analyserMic = null, analyserTts = null;
  let audioEl = null, ttsSourceNode = null;
  let audioUnlocked = false;
  let smoothAmp = 0;
  let history = [];          // [{role, content}]
  let busy = false;          // awaiting Claude/TTS

  // ===========================================================
  // Date helpers (match the rest of the app)
  // ===========================================================
  function pad(n) { return String(n).padStart(2, '0'); }
  function activeDateKey() {           // goals + stack use a 6AM rollover
    const now = new Date(), d = new Date(now);
    if (now.getHours() < 6) d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function calendarDateKey() {         // water uses the plain calendar day
    const d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function pageName() {
    const p = location.pathname;
    if (p.includes('/health')) return 'Stack';
    if (p.includes('/gym')) return 'Gym Tracker';
    if (p.includes('/finance')) return 'Finances';
    if (p.includes('/po-water')) return 'Water';
    return 'Dashboard';
  }

  // ===========================================================
  // CSS
  // ===========================================================
  function injectCSS() {
    const css = `
    .divine-orb-wrap {
      position: fixed; left: 50%; transform: translateX(-50%);
      bottom: calc(16px + env(safe-area-inset-bottom));
      z-index: 60; display: flex; flex-direction: column; align-items: center; gap: 8px;
      pointer-events: none; font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
    }
    .divine-orb-wrap.has-tabbar { bottom: calc(84px + env(safe-area-inset-bottom)); }
    .divine-caption {
      max-width: min(78vw, 460px); pointer-events: none;
      background: var(--divine-surface, rgba(14,13,9,0.92));
      color: var(--divine-text-1, #F8F3E4);
      border: 1px solid var(--divine-border, rgba(245,205,110,0.18));
      box-shadow: 0 6px 26px rgba(0,0,0,0.40);
      padding: 9px 14px; border-radius: 14px; font-size: 13.5px; line-height: 1.45;
      opacity: 0; transform: translateY(6px); transition: opacity 0.25s, transform 0.25s;
      text-align: center; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    }
    .divine-caption.show { opacity: 1; transform: translateY(0); }
    .divine-orb-btn {
      pointer-events: auto; background: none; border: none; padding: 0; cursor: pointer;
      -webkit-tap-highlight-color: transparent; line-height: 0; position: relative;
    }
    .divine-orb-canvas { display: block; }
    .divine-hint {
      position: absolute; bottom: -2px; left: 50%; transform: translateX(-50%);
      font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase;
      color: var(--divine-text-2, rgba(248,243,228,0.6)); white-space: nowrap; pointer-events: none;
    }
    .divine-mute-dot {
      position: absolute; top: 6px; right: 6px; width: 9px; height: 9px; border-radius: 50%;
      background: #ff6b6b; box-shadow: 0 0 6px rgba(255,107,107,0.7); display: none;
    }
    .divine-orb-wrap.is-muted .divine-mute-dot { display: block; }
    .divine-perm {
      pointer-events: auto; max-width: min(82vw, 320px);
      background: var(--divine-surface, rgba(14,13,9,0.96));
      color: var(--divine-text-1, #F8F3E4);
      border: 1px solid var(--divine-border, rgba(245,205,110,0.22));
      box-shadow: 0 10px 40px rgba(0,0,0,0.5); border-radius: 16px; padding: 16px 16px 14px;
      text-align: center; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    }
    .divine-perm h4 { margin: 0 0 6px; font-size: 14px; color: var(--divine-accent, #FFD700); letter-spacing: 0.02em; }
    .divine-perm p { margin: 0 0 12px; font-size: 12.5px; line-height: 1.5; color: var(--divine-text-2, rgba(248,243,228,0.7)); }
    .divine-perm-row { display: flex; gap: 8px; }
    .divine-perm button {
      flex: 1; font-family: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer;
      padding: 9px 10px; border-radius: 10px; -webkit-tap-highlight-color: transparent;
    }
    .divine-perm .divine-allow {
      background: linear-gradient(180deg, #FFE27A, var(--divine-accent, #FFD700));
      color: #1C1608; border: none;
    }
    .divine-perm .divine-deny {
      background: transparent; color: var(--divine-text-2, rgba(248,243,228,0.7));
      border: 1px solid var(--divine-border, rgba(245,205,110,0.2));
    }
    @media (max-width: 480px) {
      .divine-caption { font-size: 12.5px; max-width: 86vw; }
    }
    `;
    const s = document.createElement('style');
    s.id = 'divine-companion-style';
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ===========================================================
  // DOM
  // ===========================================================
  let wrap, canvas, ctx2d, captionEl, hintEl, permEl;
  let ORB = IS_MOBILE ? 92 : 120;

  function buildDOM() {
    wrap = document.createElement('div');
    wrap.className = 'divine-orb-wrap';
    if (document.querySelector('.tabbar, .bottom-tabs')) wrap.classList.add('has-tabbar');

    captionEl = document.createElement('div');
    captionEl.className = 'divine-caption';

    const btn = document.createElement('button');
    btn.className = 'divine-orb-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Divine voice companion');

    canvas = document.createElement('canvas');
    canvas.className = 'divine-orb-canvas';
    ctx2d = canvas.getContext('2d');

    const muteDot = document.createElement('span');
    muteDot.className = 'divine-mute-dot';

    hintEl = document.createElement('span');
    hintEl.className = 'divine-hint';
    hintEl.textContent = '';

    btn.appendChild(canvas);
    btn.appendChild(muteDot);
    btn.appendChild(hintEl);
    wrap.appendChild(captionEl);
    wrap.appendChild(btn);
    document.body.appendChild(wrap);

    sizeCanvas();
    window.addEventListener('resize', sizeCanvas);
    btn.addEventListener('click', onOrbClick);
  }

  function sizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(ORB * dpr);
    canvas.height = Math.round(ORB * dpr);
    canvas.style.width = ORB + 'px';
    canvas.style.height = ORB + 'px';
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function setHint(t) { if (hintEl) hintEl.textContent = t || ''; }
  let captionTimer = null;
  function showCaption(text, holdMs) {
    if (!captionEl) return;
    captionEl.textContent = text;
    captionEl.classList.add('show');
    clearTimeout(captionTimer);
    if (holdMs) captionTimer = setTimeout(() => captionEl.classList.remove('show'), holdMs);
  }
  function hideCaption() { if (captionEl) captionEl.classList.remove('show'); }

  // ===========================================================
  // Canvas visualizer — angelic orb (whites + gold + light purple)
  // ===========================================================
  function gold() {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--divine-accent').trim();
    return v || '#FFD700';
  }
  function amplitude(analyser) {
    if (!analyser) return 0;
    const buf = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) { const d = (buf[i] - 128) / 128; sum += d * d; }
    return Math.min(1, Math.sqrt(sum / buf.length) * 3.2);
  }

  function draw(ts) {
    requestAnimationFrame(draw);
    if (!ctx2d) return;
    const c = ORB / 2, baseR = ORB * 0.26;
    ctx2d.clearRect(0, 0, ORB, ORB);

    let target = 0;
    if (visualState === 'listening') target = amplitude(analyserMic);
    else if (visualState === 'speaking') target = amplitude(analyserTts);
    else target = 0.04 + Math.sin(ts / 900) * 0.03 + 0.03;   // idle breathing
    smoothAmp += (target - smoothAmp) * 0.18;

    const accent = gold();
    const pulse = baseR * (1 + smoothAmp * 0.85);

    // Outer halo glow
    const halo = ctx2d.createRadialGradient(c, c, baseR * 0.3, c, c, ORB * 0.5);
    halo.addColorStop(0, hexA(accent, 0.30 + smoothAmp * 0.4));
    halo.addColorStop(0.45, hexA(PURPLE, 0.10 + smoothAmp * 0.18));
    halo.addColorStop(1, 'rgba(255,255,255,0)');
    ctx2d.fillStyle = halo;
    ctx2d.beginPath(); ctx2d.arc(c, c, ORB * 0.5, 0, Math.PI * 2); ctx2d.fill();

    // Circular waveform ring reacting to amplitude
    const N = 72;
    ctx2d.beginPath();
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const wob = Math.sin(a * 5 + ts / 220) * smoothAmp * baseR * 0.5
                + Math.sin(a * 9 - ts / 320) * smoothAmp * baseR * 0.28;
      const rr = pulse + wob;
      const x = c + Math.cos(a) * rr, y = c + Math.sin(a) * rr;
      if (i === 0) ctx2d.moveTo(x, y); else ctx2d.lineTo(x, y);
    }
    ctx2d.closePath();
    ctx2d.lineWidth = 1.6;
    ctx2d.strokeStyle = hexA(accent, 0.85);
    ctx2d.shadowColor = accent;
    ctx2d.shadowBlur = 12 + smoothAmp * 26;
    ctx2d.stroke();
    ctx2d.shadowBlur = 0;

    // Bright soft core
    const core = ctx2d.createRadialGradient(c, c, 0, c, c, pulse);
    core.addColorStop(0, 'rgba(255,255,255,0.95)');
    core.addColorStop(0.55, hexA(accent, 0.55));
    core.addColorStop(1, hexA(accent, 0.05));
    ctx2d.fillStyle = core;
    ctx2d.beginPath(); ctx2d.arc(c, c, pulse, 0, Math.PI * 2); ctx2d.fill();
  }
  function hexA(hex, a) {
    hex = (hex || '#FFD700').replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
    const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  // ===========================================================
  // Audio graph
  // ===========================================================
  function ensureAudioCtx() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }
  function unlockAudio() {
    if (audioUnlocked) return;
    ensureAudioCtx();
    if (!audioEl) {
      audioEl = new Audio();
      audioEl.setAttribute('playsinline', '');
      try {
        ttsSourceNode = audioCtx.createMediaElementSource(audioEl);
        analyserTts = audioCtx.createAnalyser(); analyserTts.fftSize = 1024;
        ttsSourceNode.connect(analyserTts); analyserTts.connect(audioCtx.destination);
      } catch (e) {}
    }
    // Nudge mobile autoplay policy with a silent play/pause within the gesture.
    try { audioEl.muted = true; audioEl.play().then(() => { audioEl.pause(); audioEl.muted = false; }).catch(() => { audioEl.muted = false; }); } catch (e) {}
    audioUnlocked = true;
  }

  // ===========================================================
  // Microphone + permission
  // ===========================================================
  function showPerm() {
    permEl = document.createElement('div');
    permEl.className = 'divine-perm';
    permEl.innerHTML =
      '<h4>✦ Divine is here</h4>' +
      '<p>I am your companion. Allow your microphone so I can listen and speak with you.</p>' +
      '<div class="divine-perm-row">' +
      '<button class="divine-deny" type="button">Not now</button>' +
      '<button class="divine-allow" type="button">Allow mic</button>' +
      '</div>';
    wrap.insertBefore(permEl, captionEl);
    permEl.querySelector('.divine-allow').addEventListener('click', () => { unlockAudio(); requestMic(true); });
    permEl.querySelector('.divine-deny').addEventListener('click', () => { permEl.remove(); permEl = null; setHint('tap to talk'); });
  }
  function removePerm() { if (permEl) { permEl.remove(); permEl = null; } }

  async function requestMic(fromGesture) {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micGranted = true;
      try { localStorage.setItem('divine-mic-granted', '1'); } catch (e) {}
      removePerm();
      ensureAudioCtx();
      try {
        const src = audioCtx.createMediaStreamSource(micStream);
        analyserMic = audioCtx.createAnalyser(); analyserMic.fftSize = 1024;
        src.connect(analyserMic);   // not connected to destination — no feedback
      } catch (e) {}
      setupRecognition();
      if (!IS_MOBILE) { startRecognition(); setHint('listening'); }
      else { setHint('tap to talk'); if (fromGesture) startRecognition(); }
      greet();
    } catch (e) {
      micGranted = false;
      setHint('tap to talk');
      showCaption('I could not reach your microphone — you can still tap me to talk.', 5000);
    }
  }

  let greeted = false;
  function greet() {
    if (greeted) return; greeted = true;
    speak("I'm here with you. Speak, and I will listen.");
  }

  // ===========================================================
  // Speech recognition
  // ===========================================================
  function setupRecognition() {
    if (!SR || recognition) return;
    recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = !IS_MOBILE;   // continuous desktop, single-shot mobile
    recognition.onstart = () => { recognizing = true; if (visualState !== 'speaking') setState('listening'); };
    recognition.onerror = (ev) => { if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') micGranted = false; };
    recognition.onend = () => {
      recognizing = false;
      if (visualState === 'listening') setState('idle');
      // Desktop: keep the mic alive by restarting unless muted/speaking.
      if (!IS_MOBILE && micGranted && !muted && visualState !== 'speaking') {
        setTimeout(() => { try { recognition.start(); } catch (e) {} }, 250);
      }
    };
    recognition.onresult = (ev) => {
      let finalText = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else if (visualState === 'listening') showCaption(r[0].transcript, 0);
      }
      finalText = finalText.trim();
      if (finalText) handleUtterance(finalText);
    };
  }
  function startRecognition() {
    if (!recognition || recognizing || muted) return;
    try { recognition.start(); } catch (e) {}
  }
  function stopRecognition() { if (recognition && recognizing) { try { recognition.abort(); } catch (e) {} } }

  // ===========================================================
  // Orb click — gesture unlock + mobile tap-to-talk / desktop mute
  // ===========================================================
  function onOrbClick() {
    unlockAudio();
    if (!micGranted) {
      const remembered = (function () { try { return localStorage.getItem('divine-mic-granted') === '1'; } catch (e) { return false; } })();
      if (permEl) return;       // prompt already up
      if (remembered) { requestMic(true); return; }
      showPerm(); return;
    }
    if (IS_MOBILE) {
      // tap-to-talk: each tap starts one listening turn
      if (visualState === 'speaking') { stopSpeaking(); return; }
      if (recognizing) { stopRecognition(); setState('idle'); }
      else { setState('listening'); startRecognition(); }
    } else {
      // desktop: toggle mute of the always-on mic
      muted = !muted;
      wrap.classList.toggle('is-muted', muted);
      if (muted) { stopRecognition(); setState('idle'); setHint('muted'); }
      else { startRecognition(); setHint('listening'); }
    }
  }

  // ===========================================================
  // Conversation
  // ===========================================================
  function setState(s) {
    visualState = s;
    if (s === 'listening') setHint(IS_MOBILE ? 'listening…' : 'listening');
    else if (s === 'speaking') setHint('speaking…');
    else if (!muted) setHint(IS_MOBILE ? 'tap to talk' : (micGranted ? 'listening' : 'tap to talk'));
  }

  function localContext() {
    const ctx = { page: pageName() };
    try {
      const goals = JSON.parse(localStorage.getItem('goals:' + activeDateKey()) || '[]');
      ctx.goalsToday = goals.map(g => ({ text: g.text, done: !!g.done }));
    } catch (e) {}
    try {
      const items = JSON.parse(localStorage.getItem('stack:items') || '[]');
      ctx.supplements = items.map(i => i.name).filter(Boolean).slice(0, 40);
    } catch (e) {}
    try {
      const w = JSON.parse(localStorage.getItem('po_water_v1') || 'null');
      if (w && w.logs) ctx.waterToday = w.logs[calendarDateKey()] || 0;
    } catch (e) {}
    return ctx;
  }

  async function handleUtterance(text) {
    if (busy) return;
    showCaption(text, 0);
    // Try a dashboard action first; if handled, confirm and stop.
    const action = await tryAction(text);
    if (action) { history.push({ role: 'user', content: text }); history.push({ role: 'assistant', content: action }); speak(action); return; }

    busy = true;
    history.push({ role: 'user', content: text });
    if (history.length > 12) history = history.slice(-12);
    const ctxLine = 'The user is on the ' + pageName() + ' page. Their current dashboard data: ' + JSON.stringify(localContext()) + '.';
    const messages = history.slice();
    messages[messages.length - 1] = { role: 'user', content: text + '\n\n[context: ' + ctxLine + ']' };
    try {
      const r = await fetch('/api/divine-chat', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ system: SYSTEM_PROMPT, messages }),
      });
      const data = await r.json();
      busy = false;
      if (!r.ok || !data.text) { showCaption(data.error ? ('Divine is resting: ' + data.error) : 'I could not find my words just now.', 5000); setState('idle'); return; }
      history.push({ role: 'assistant', content: data.text });
      speak(data.text);
    } catch (e) {
      busy = false;
      showCaption('I could not reach the heavens (network).', 5000);
      setState('idle');
    }
  }

  // ===========================================================
  // Voice → dashboard actions
  // ===========================================================
  const NUM = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  function toNum(w) { if (w == null) return null; if (/^\d+$/.test(w)) return parseInt(w, 10); return NUM[String(w).toLowerCase()] || null; }
  function normWindow(w) {
    w = (w || '').toLowerCase();
    if (/morning|breakfast|am\b/.test(w)) return 'morning';
    if (/lunch|noon|midday|afternoon/.test(w)) return 'lunch';
    if (/evening|night|dinner|bed|pm\b/.test(w)) return 'evening';
    return 'anytime';
  }

  // Returns a confirmation string if an action was performed, else null.
  async function tryAction(text) {
    const t = text.toLowerCase().trim();

    // --- WATER: "I drank 2 bottles / had a glass of water" ---
    let m = t.match(/\b(?:i\s+)?(?:drank|had|log(?:ged)?|add)\s+(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten)?\s*(bottle|glass|cup)s?\b/);
    if (m && (/(water|bottle|glass|cup)/.test(t))) {
      const n = toNum(m[1]) || 1;
      let w = {};
      try { w = JSON.parse(localStorage.getItem('po_water_v1') || '{}') || {}; } catch (e) {}
      if (typeof w !== 'object') w = {};
      w.logs = w.logs || {};
      const k = calendarDateKey();
      w.logs[k] = (w.logs[k] || 0) + n;
      writeLS('po_water_v1', w);
      await supaPatch('health', cur => { cur.po_water_v1 = w; return cur; });
      return 'Logged ' + n + ' ' + (m[2] || 'serving') + (n > 1 ? 's' : '') + ' of water. Stay nourished.';
    }

    // --- SUPPLEMENT: "add magnesium 200mg in the evening" ---
    m = t.match(/\badd\s+(.+?)(?:\s+(\d+\s?(?:mg|mcg|g|iu|ml|cap|caps|capsule|capsules|tablet|tablets|serving|servings|scoop|scoops)\b[\w\s]*?))?\s*(?:in the\s+|at\s+|during\s+)?(morning|lunch|noon|midday|afternoon|evening|night|dinner|breakfast|bedtime|anytime)?\s*$/);
    if (m && /supplement|stack|vitamin|take|pill|mg|mcg|cap|dose|magnesium|creatine|protein|omega|zinc|\bd3\b|\bb12\b/.test(t) && !/goal|task|water/.test(t)) {
      const name = titleCase(m[1].replace(/\bto (my )?stack\b/, '').trim());
      if (name) {
        const dose = (m[2] || '').trim();
        const win = normWindow(m[3]);
        let items = [];
        try { items = JSON.parse(localStorage.getItem('stack:items') || '[]') || []; } catch (e) {}
        items.push({ id: 'v' + Date.now(), name: name, dose: dose, window: win, note: '', tag: null, ordered: true });
        writeLS('stack:items', items);
        await supaPatch('health', cur => { cur['stack:items'] = items; return cur; });
        return 'Added ' + name + (dose ? ' (' + dose + ')' : '') + ' to your ' + win + ' stack.';
      }
    }

    // --- GOALS: "add finish the report to my goals" ---
    m = t.match(/\badd\s+(.+?)\s+to\s+(?:my\s+)?goals?\b/) || t.match(/\badd\s+(?:a\s+)?goal\s+(?:to\s+)?(.+)$/);
    if (m) {
      const goalText = capFirst(m[1].trim());
      if (goalText) {
        const key = 'goals:' + activeDateKey();
        let arr = [];
        try { arr = JSON.parse(localStorage.getItem(key) || '[]') || []; } catch (e) {}
        arr.push({ text: goalText, done: false });
        writeLS(key, arr);
        await supaPatch('goals', cur => { cur[key] = arr; return cur; });
        return 'Added "' + goalText + '" to today\'s goals. You can do this.';
      }
    }

    // --- GYM: "change monday to push day" ---
    m = t.match(/\bchange\s+(\w+)\s+to\s+(.+)$/);
    if (m && /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|day)\b/.test(m[1] + ' ' + t)) {
      const dayWord = m[1].toLowerCase();
      const workout = titleCase(m[2].replace(/\bday\b/, '').trim());
      let st = null;
      try { st = JSON.parse(localStorage.getItem('po_coach_v1') || 'null'); } catch (e) {}
      if (st && Array.isArray(st.days)) {
        let day = st.days.find(d => (d.name || '').toLowerCase().includes(dayWord) || (d.id || '').toLowerCase().includes(dayWord));
        if (!day) day = st.days.find(d => (d.name || '').toLowerCase().startsWith(dayWord.slice(0, 3)));
        if (day && workout) {
          day.name = workout;
          writeLS('po_coach_v1', st);
          await supaPatch('po-coach', cur => { cur['po_coach_v1'] = st; return cur; });
          return 'Changed ' + capFirst(dayWord) + ' to ' + workout + '.';
        }
      }
      return null; // fall through to Claude if gym data isn't here
    }

    return null;
  }

  function titleCase(s) { return (s || '').replace(/\b\w/g, c => c.toUpperCase()).trim(); }
  function capFirst(s) { s = (s || '').trim(); return s ? s[0].toUpperCase() + s.slice(1) : s; }

  function writeLS(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
    try { window.dispatchEvent(new Event('storage')); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('goals-changed')); } catch (e) {}
  }
  async function supaPatch(appKey, mutate) {
    if (!window.supabase) return;
    try {
      const c = window.supabase.createClient(SUPA_URL, SUPA_KEY);
      const { data } = await c.from('app_state').select('data').eq('key', appKey).maybeSingle();
      const cur = (data && data.data) || {};
      const next = mutate(Object.assign({}, cur));
      await c.from('app_state').upsert({ key: appKey, data: next, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    } catch (e) {}
  }

  // ===========================================================
  // TTS playback
  // ===========================================================
  async function speak(text) {
    showCaption(text, 0);
    setState('speaking');
    // Pause listening while Divine speaks so she doesn't hear herself.
    stopRecognition();
    try {
      const r = await fetch('/api/divine-tts', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!r.ok) { afterSpeak(); showCaption(text, 6000); return; }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      unlockAudio();
      ensureAudioCtx();
      audioEl.src = url;
      audioEl.onended = () => { URL.revokeObjectURL(url); afterSpeak(); };
      audioEl.onerror = () => { URL.revokeObjectURL(url); afterSpeak(); };
      try { await audioEl.play(); }
      catch (e) {
        // Mobile blocked autoplay — show text and wait for a tap.
        setHint('tap me to hear');
        afterSpeak(); showCaption(text, 8000);
      }
    } catch (e) { afterSpeak(); }
  }
  function stopSpeaking() { try { audioEl.pause(); audioEl.currentTime = 0; } catch (e) {} afterSpeak(); }
  function afterSpeak() {
    setState('idle');
    showCaption(captionEl ? captionEl.textContent : '', 4000);
    if (!IS_MOBILE && micGranted && !muted) startRecognition();
  }

  // ===========================================================
  // Boot
  // ===========================================================
  function boot() {
    injectCSS();
    buildDOM();
    requestAnimationFrame(draw);

    const remembered = (function () { try { return localStorage.getItem('divine-mic-granted') === '1'; } catch (e) { return false; } })();
    if (!SR) { setHint('voice not supported'); showCaption('This browser does not support voice recognition — Divine listens best in Chrome or Safari.', 6000); return; }
    if (remembered && !IS_MOBILE) {
      // Returning desktop visitor — re-acquire mic silently (a gesture may still be needed).
      setHint('tap to wake');
    } else {
      setHint('tap to begin');
    }
    // First-time friendly prompt appears after a short beat.
    if (!remembered) setTimeout(() => { if (!micGranted && !permEl) showPerm(); }, 1200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
