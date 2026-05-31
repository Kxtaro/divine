// =============================================================
// Divine — angelic AI voice companion. Loaded on every page by
// topbar.js. Renders the orb visualizer, captures the microphone,
// transcribes via /api/divine-stt (ElevenLabs), talks to Claude via
// /api/divine-chat, speaks via /api/divine-tts, and performs dashboard
// voice actions.
//
// Voice uses record→transcribe (MediaRecorder + server STT) instead of
// the Web Speech API, so it works in Edge, Safari, Brave and mobile —
// not just Chrome.
//
// No secrets live here. All API keys are held server-side in /api.
// =============================================================
(function () {
  'use strict';
  if (window.__divineCompanion) return;
  window.__divineCompanion = true;
  try { if (window.self !== window.top) return; } catch (e) { return; } // skip iframes

  const SUPA_URL = 'https://reatwgqnfuiomdidrhdd.supabase.co';
  const SUPA_KEY = 'sb_publishable_hjm63T8ml2uo-2wNndQYmg_sA2oc4iZ';
  const IS_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
  const PURPLE = '#C9B6FF';

  const SYSTEM_PROMPT =
    "You are Divine, a calm and caring AI companion inside a personal life dashboard. " +
    "You are aware of which page the user is on and can see their data from localStorage. " +
    "Keep replies short, clear and conversational. " +
    "Write in plain text with correct, simple grammar. " +
    "Do not use em dashes, en dashes, semicolons, exclamation marks, emojis, or decorative " +
    "punctuation. Avoid unnecessary commas. Speak naturally, like a thoughtful friend.";

  // Strip exaggerated punctuation so captions and speech stay plain.
  function plainText(s) {
    return String(s || '')
      .replace(/[—–]/g, ' ')                       // em/en dash -> space
      .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}←-⇿⬀-⯿️✨✴]/gu, '') // emoji/symbols
      .replace(/\s*;\s*/g, '. ')                              // semicolons -> period
      .replace(/!+/g, '.')                                    // exclamations -> period
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([.,?])/g, '$1')
      .replace(/\.\s*\./g, '.')
      .trim();
  }

  // ---- state ----
  let visualState = 'idle';   // idle | listening | thinking | speaking
  let micGranted = false;
  let micStream = null;
  let audioCtx = null, analyserMic = null, analyserTts = null;
  let audioEl = null, ttsSourceNode = null, audioUnlocked = false;
  let recorder = null, chunks = [], recMime = '';
  let recording = false;
  let heardSpeech = false, lastLoudTs = 0, recStartTs = 0;
  let smoothAmp = 0, lastSpeechTs = 0;
  let history = [], busy = false, greeted = false;

  // ---- date helpers (match the app) ----
  function pad(n) { return String(n).padStart(2, '0'); }
  function activeDateKey() {
    const now = new Date(), d = new Date(now);
    if (now.getHours() < 6) d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function calendarDateKey() {
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
      background: var(--divine-surface, rgba(14,13,9,0.95));
      color: var(--divine-text-1, #F8F3E4);
      border: 1px solid var(--divine-border, rgba(245,205,110,0.20));
      box-shadow: 0 6px 26px rgba(0,0,0,0.40);
      padding: 9px 14px; border-radius: 14px; font-size: 13.5px; line-height: 1.45;
      opacity: 0; transform: translateY(6px); transition: opacity 0.25s, transform 0.25s;
      text-align: center; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    }
    .divine-caption.show { opacity: 1; transform: translateY(0); }
    .divine-orb-btn { pointer-events: auto; background: none; border: none; padding: 0; cursor: pointer; -webkit-tap-highlight-color: transparent; line-height: 0; position: relative; }
    .divine-orb-canvas { display: block; }
    .divine-hint {
      position: absolute; bottom: -2px; left: 50%; transform: translateX(-50%);
      font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase;
      color: var(--divine-text-2, rgba(248,243,228,0.65)); white-space: nowrap; pointer-events: none;
    }
    .divine-perm {
      pointer-events: auto; max-width: min(82vw, 320px);
      background: var(--divine-surface, rgba(14,13,9,0.97));
      color: var(--divine-text-1, #F8F3E4);
      border: 1px solid var(--divine-border, rgba(245,205,110,0.24));
      box-shadow: 0 10px 40px rgba(0,0,0,0.5); border-radius: 16px; padding: 16px 16px 14px;
      text-align: center; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    }
    .divine-perm h4 { margin: 0 0 6px; font-size: 14px; color: var(--divine-accent, #FFD700); letter-spacing: 0.02em; }
    .divine-perm p { margin: 0 0 12px; font-size: 12.5px; line-height: 1.5; color: var(--divine-text-2, rgba(248,243,228,0.72)); }
    .divine-perm-row { display: flex; gap: 8px; }
    .divine-perm button { flex: 1; font-family: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer; padding: 9px 10px; border-radius: 10px; -webkit-tap-highlight-color: transparent; }
    .divine-perm .divine-allow { background: linear-gradient(180deg, #FFE27A, var(--divine-accent, #FFD700)); color: #1C1608; border: none; }
    .divine-perm .divine-deny { background: transparent; color: var(--divine-text-2, rgba(248,243,228,0.72)); border: 1px solid var(--divine-border, rgba(245,205,110,0.22)); }
    @media (max-width: 480px) { .divine-caption { font-size: 12.5px; max-width: 86vw; } }
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
  const ORB = IS_MOBILE ? 92 : 120;

  function buildDOM() {
    wrap = document.createElement('div');
    wrap.className = 'divine-orb-wrap';
    if (document.querySelector('.tabbar, .bottom-tabs')) wrap.classList.add('has-tabbar');

    captionEl = document.createElement('div');
    captionEl.className = 'divine-caption';

    const btn = document.createElement('button');
    btn.className = 'divine-orb-btn'; btn.type = 'button';
    btn.setAttribute('aria-label', 'Divine voice companion');

    canvas = document.createElement('canvas');
    canvas.className = 'divine-orb-canvas';
    ctx2d = canvas.getContext('2d');

    hintEl = document.createElement('span');
    hintEl.className = 'divine-hint';

    btn.appendChild(canvas);
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
    if (!captionEl || !text) return;
    captionEl.textContent = text;
    captionEl.classList.add('show');
    clearTimeout(captionTimer);
    if (holdMs) captionTimer = setTimeout(() => captionEl.classList.remove('show'), holdMs);
  }

  // ===========================================================
  // Visualizer
  // ===========================================================
  function gold() {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--divine-accent').trim();
    return v || '#FFD700';
  }
  function amplitude(an) {
    if (!an) return 0;
    const buf = new Uint8Array(an.fftSize);
    an.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) { const d = (buf[i] - 128) / 128; sum += d * d; }
    return Math.min(1, Math.sqrt(sum / buf.length) * 3.2);
  }
  function hexA(hex, a) {
    hex = (hex || '#FFD700').replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
    const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }
  function draw(ts) {
    requestAnimationFrame(draw);
    if (!ctx2d) return;
    const c = ORB / 2, baseR = ORB * 0.26;
    ctx2d.clearRect(0, 0, ORB, ORB);

    let target = 0;
    if (visualState === 'listening') target = Math.max(amplitude(analyserMic), 0.12 + Math.abs(Math.sin(ts / 240)) * 0.06);
    else if (visualState === 'speaking') target = 0.30 + Math.abs(Math.sin(ts / 130)) * 0.4;   // procedural while speaking
    else if (visualState === 'thinking') target = 0.10 + Math.abs(Math.sin(ts / 200)) * 0.12;
    else target = 0.04 + Math.sin(ts / 900) * 0.03 + 0.03;
    smoothAmp += (target - smoothAmp) * 0.18;

    const accent = gold();
    const pulse = baseR * (1 + smoothAmp * 0.85);

    const halo = ctx2d.createRadialGradient(c, c, baseR * 0.3, c, c, ORB * 0.5);
    halo.addColorStop(0, hexA(accent, 0.30 + smoothAmp * 0.4));
    halo.addColorStop(0.45, hexA(PURPLE, 0.10 + smoothAmp * 0.18));
    halo.addColorStop(1, 'rgba(255,255,255,0)');
    ctx2d.fillStyle = halo;
    ctx2d.beginPath(); ctx2d.arc(c, c, ORB * 0.5, 0, Math.PI * 2); ctx2d.fill();

    const N = 72;
    ctx2d.beginPath();
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const wob = Math.sin(a * 5 + ts / 220) * smoothAmp * baseR * 0.5 + Math.sin(a * 9 - ts / 320) * smoothAmp * baseR * 0.28;
      const rr = pulse + wob;
      const x = c + Math.cos(a) * rr, y = c + Math.sin(a) * rr;
      if (i === 0) ctx2d.moveTo(x, y); else ctx2d.lineTo(x, y);
    }
    ctx2d.closePath();
    ctx2d.lineWidth = 1.6;
    ctx2d.strokeStyle = hexA(accent, 0.85);
    ctx2d.shadowColor = accent; ctx2d.shadowBlur = 12 + smoothAmp * 26;
    ctx2d.stroke(); ctx2d.shadowBlur = 0;

    const core = ctx2d.createRadialGradient(c, c, 0, c, c, pulse);
    core.addColorStop(0, 'rgba(255,255,255,0.95)');
    core.addColorStop(0.55, hexA(accent, 0.55));
    core.addColorStop(1, hexA(accent, 0.05));
    ctx2d.fillStyle = core;
    ctx2d.beginPath(); ctx2d.arc(c, c, pulse, 0, Math.PI * 2); ctx2d.fill();
  }

  // ===========================================================
  // Audio
  // ===========================================================
  function ensureAudioCtx() {
    if (!audioCtx) { const AC = window.AudioContext || window.webkitAudioContext; audioCtx = new AC(); }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }
  function unlockAudio() {
    if (audioUnlocked) return;
    ensureAudioCtx();
    // Play the audio element DIRECTLY to the speakers. We deliberately do not
    // route it through a MediaElementSource graph, because that goes silent
    // whenever the AudioContext is suspended (the "no voice" bug).
    if (!audioEl) { audioEl = new Audio(); audioEl.setAttribute('playsinline', ''); }
    try {
      audioEl.muted = true;
      const p = audioEl.play();
      if (p && p.then) p.then(() => { audioEl.pause(); audioEl.currentTime = 0; audioEl.muted = false; }).catch(() => { audioEl.muted = false; });
    } catch (e) { audioEl.muted = false; }
    audioUnlocked = true;
  }

  // ===========================================================
  // Microphone permission
  // ===========================================================
  function showPerm() {
    if (permEl) return;
    permEl = document.createElement('div');
    permEl.className = 'divine-perm';
    permEl.innerHTML =
      '<h4>✦ Divine is here</h4>' +
      '<p>I am your companion. Allow your microphone so I can listen and speak with you.</p>' +
      '<div class="divine-perm-row"><button class="divine-deny" type="button">Not now</button><button class="divine-allow" type="button">Allow mic</button></div>';
    wrap.insertBefore(permEl, captionEl);
    permEl.querySelector('.divine-allow').addEventListener('click', () => { unlockAudio(); requestMic(true); });
    permEl.querySelector('.divine-deny').addEventListener('click', () => { removePerm(); setHint('tap to talk'); });
  }
  function removePerm() { if (permEl) { permEl.remove(); permEl = null; } }

  async function requestMic(autoStart) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
      showCaption('This browser cannot access the microphone for voice.', 6000); return;
    }
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      micGranted = true;
      try { localStorage.setItem('divine-mic-granted', '1'); } catch (e) {}
      removePerm();
      ensureAudioCtx();
      try {
        const src = audioCtx.createMediaStreamSource(micStream);
        analyserMic = audioCtx.createAnalyser(); analyserMic.fftSize = 1024;
        src.connect(analyserMic);   // amplitude only — not routed to output
      } catch (e) {}
      greet(autoStart);
    } catch (e) {
      micGranted = false;
      setHint('tap to talk');
      showCaption('I could not reach your microphone. Check the browser permission to talk with me.', 6000);
    }
  }
  function greet(thenListen) {
    if (greeted) { if (thenListen && !IS_MOBILE) startListening(); else setHint(IS_MOBILE ? 'tap to talk' : 'tap or speak'); return; }
    greeted = true;
    speak("I am here. Tap me or speak whenever you are ready.", thenListen && !IS_MOBILE);
  }

  // ===========================================================
  // Record → transcribe
  // ===========================================================
  function pickMime() {
    const cands = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg'];
    for (const m of cands) { try { if (MediaRecorder.isTypeSupported(m)) return m; } catch (e) {} }
    return '';
  }
  function startListening() {
    if (!micGranted || recording || visualState === 'speaking' || busy) return;
    try {
      recMime = pickMime();
      recorder = recMime ? new MediaRecorder(micStream, { mimeType: recMime }) : new MediaRecorder(micStream);
      recMime = recorder.mimeType || recMime || 'audio/webm';
    } catch (e) { showCaption('Recording is not available in this browser.', 5000); return; }
    chunks = [];
    recorder.ondataavailable = (ev) => { if (ev.data && ev.data.size) chunks.push(ev.data); };
    recorder.onstop = onRecStop;
    heardSpeech = false; lastLoudTs = 0; recStartTs = Date.now();
    try { recorder.start(); } catch (e) { return; }
    recording = true;
    setState('listening');
    monitorSilence();
  }
  function stopListening(discard) {
    if (!recording) return;
    recording = false;
    if (discard) { try { recorder.onstop = null; recorder.stop(); } catch (e) {} setState('idle'); setHint(IS_MOBILE ? 'tap to talk' : 'tap or speak'); return; }
    try { recorder.stop(); } catch (e) {}
  }
  function monitorSilence() {
    if (!recording) return;
    const amp = amplitude(analyserMic);
    const now = Date.now();
    if (amp > 0.07) { heardSpeech = true; lastLoudTs = now; lastSpeechTs = now; }
    const elapsed = now - recStartTs;
    const quietFor = now - lastLoudTs;
    // Auto-stop: after speech, 1.4s of quiet ends the turn. Hard cap 15s.
    if (heardSpeech && quietFor > 1400) { stopListening(false); return; }
    if (!heardSpeech && elapsed > 6000) { stopListening(true); return; } // nothing said
    if (elapsed > 15000) { stopListening(false); return; }
    requestAnimationFrame(monitorSilence);
  }
  async function onRecStop() {
    const blob = new Blob(chunks, { type: recMime });
    chunks = [];
    if (!blob.size || !heardSpeech) { setState('idle'); setHint(IS_MOBILE ? 'tap to talk' : 'tap or speak'); return; }
    setState('thinking'); setHint('thinking…');
    try {
      const buf = await blob.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = ''; const CH = 0x8000;
      for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
      const b64 = btoa(bin);
      const r = await fetch('/api/divine-stt', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ audio: b64, mime: recMime }),
      });
      const data = await r.json();
      if (!r.ok || !data.text) { showCaption(data.error ? ('I could not hear that: ' + data.error) : 'I did not catch that.', 5000); idleOrRearm(); return; }
      handleUtterance(data.text);
    } catch (e) { showCaption('I could not hear you. Please try again.', 5000); idleOrRearm(); }
  }
  function idleOrRearm() {
    setState('idle');
    if (!IS_MOBILE && micGranted) setTimeout(() => startListening(), 400);
    else setHint('tap to talk');
  }

  // ===========================================================
  // Orb click
  // ===========================================================
  function onOrbClick() {
    unlockAudio();
    if (!micGranted) {
      const remembered = (function () { try { return localStorage.getItem('divine-mic-granted') === '1'; } catch (e) { return false; } })();
      if (remembered) requestMic(true); else showPerm();
      return;
    }
    if (visualState === 'speaking') { stopSpeaking(); return; }
    if (recording) { stopListening(false); return; }   // tap to finish turn now
    if (busy || visualState === 'thinking') return;
    startListening();
  }

  // ===========================================================
  // Conversation
  // ===========================================================
  function setState(s) {
    visualState = s;
    if (s === 'listening') setHint(IS_MOBILE ? 'listening… tap to send' : 'listening…');
    else if (s === 'thinking') setHint('thinking…');
    else if (s === 'speaking') setHint('speaking…');
    else setHint(micGranted ? (IS_MOBILE ? 'tap to talk' : 'tap or speak') : 'tap to begin');
  }
  function localContext() {
    const ctx = { page: pageName() };
    try { const g = JSON.parse(localStorage.getItem('goals:' + activeDateKey()) || '[]'); ctx.goalsToday = g.map(x => ({ text: x.text, done: !!x.done })); } catch (e) {}
    try { const it = JSON.parse(localStorage.getItem('stack:items') || '[]'); ctx.supplements = it.map(i => i.name).filter(Boolean).slice(0, 40); } catch (e) {}
    try { const w = JSON.parse(localStorage.getItem('po_water_v1') || 'null'); if (w && w.logs) ctx.waterToday = w.logs[calendarDateKey()] || 0; } catch (e) {}
    return ctx;
  }
  async function handleUtterance(text) {
    if (busy) return;
    showCaption(text, 0);
    const action = await tryAction(text);
    if (action) { history.push({ role: 'user', content: text }); history.push({ role: 'assistant', content: action }); speak(action, true); return; }

    busy = true; setState('thinking');
    history.push({ role: 'user', content: text });
    if (history.length > 12) history = history.slice(-12);
    const ctxLine = 'The user is on the ' + pageName() + ' page. Their current dashboard data: ' + JSON.stringify(localContext()) + '.';
    const messages = history.slice();
    messages[messages.length - 1] = { role: 'user', content: text + '\n\n[context: ' + ctxLine + ']' };
    try {
      const r = await fetch('/api/divine-chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ system: SYSTEM_PROMPT, messages }) });
      const data = await r.json();
      busy = false;
      if (!r.ok || !data.text) { showCaption(data.error ? ('Something went wrong: ' + data.error) : 'I could not find a reply.', 5000); idleOrRearm(); return; }
      history.push({ role: 'assistant', content: data.text });
      speak(data.text, true);
    } catch (e) { busy = false; showCaption('I could not connect. Please try again.', 5000); idleOrRearm(); }
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
  async function tryAction(text) {
    const t = text.toLowerCase().trim();
    let m = t.match(/\b(?:i\s+)?(?:drank|had|log(?:ged)?|add)\s+(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten)?\s*(bottle|glass|cup)s?\b/);
    if (m && /(water|bottle|glass|cup)/.test(t)) {
      const n = toNum(m[1]) || 1;
      let w = {}; try { w = JSON.parse(localStorage.getItem('po_water_v1') || '{}') || {}; } catch (e) {}
      if (typeof w !== 'object') w = {};
      w.logs = w.logs || {}; const k = calendarDateKey();
      w.logs[k] = (w.logs[k] || 0) + n;
      writeLS('po_water_v1', w);
      await supaPatch('health', cur => { cur.po_water_v1 = w; return cur; });
      return 'Logged ' + n + ' ' + (m[2] || 'serving') + (n > 1 ? 's' : '') + ' of water.';
    }
    m = t.match(/\badd\s+(.+?)(?:\s+(\d+\s?(?:mg|mcg|g|iu|ml|cap|caps|capsule|capsules|tablet|tablets|serving|servings|scoop|scoops)\b[\w\s]*?))?\s*(?:in the\s+|at\s+|during\s+)?(morning|lunch|noon|midday|afternoon|evening|night|dinner|breakfast|bedtime|anytime)?\s*$/);
    if (m && /supplement|stack|vitamin|take|pill|mg|mcg|cap|dose|magnesium|creatine|protein|omega|zinc|\bd3\b|\bb12\b/.test(t) && !/goal|task|water/.test(t)) {
      const name = titleCase(m[1].replace(/\bto (my )?stack\b/, '').trim());
      if (name) {
        const dose = (m[2] || '').trim(); const win = normWindow(m[3]);
        let items = []; try { items = JSON.parse(localStorage.getItem('stack:items') || '[]') || []; } catch (e) {}
        items.push({ id: 'v' + Date.now(), name: name, dose: dose, window: win, note: '', tag: null, ordered: true });
        writeLS('stack:items', items);
        await supaPatch('health', cur => { cur['stack:items'] = items; return cur; });
        return 'Added ' + name + (dose ? ' ' + dose : '') + ' to your ' + win + ' stack.';
      }
    }
    m = t.match(/\badd\s+(.+?)\s+to\s+(?:my\s+)?goals?\b/) || t.match(/\badd\s+(?:a\s+)?goal\s+(?:to\s+)?(.+)$/);
    if (m) {
      const goalText = capFirst(m[1].trim());
      if (goalText) {
        const key = 'goals:' + activeDateKey();
        let arr = []; try { arr = JSON.parse(localStorage.getItem(key) || '[]') || []; } catch (e) {}
        arr.push({ text: goalText, done: false });
        writeLS(key, arr);
        await supaPatch('goals', cur => { cur[key] = arr; return cur; });
        return 'Added ' + goalText + ' to your goals for today.';
      }
    }
    m = t.match(/\bchange\s+(\w+)\s+to\s+(.+)$/);
    if (m && /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|day)\b/.test(m[1] + ' ' + t)) {
      const dayWord = m[1].toLowerCase();
      const workout = titleCase(m[2].replace(/\bday\b/, '').trim());
      let st = null; try { st = JSON.parse(localStorage.getItem('po_coach_v1') || 'null'); } catch (e) {}
      if (st && Array.isArray(st.days)) {
        let day = st.days.find(d => (d.name || '').toLowerCase().includes(dayWord) || (d.id || '').toLowerCase().includes(dayWord));
        if (!day) day = st.days.find(d => (d.name || '').toLowerCase().startsWith(dayWord.slice(0, 3)));
        if (day && workout) {
          day.name = workout; writeLS('po_coach_v1', st);
          await supaPatch('po-coach', cur => { cur['po_coach_v1'] = st; return cur; });
          return 'Changed ' + capFirst(dayWord) + ' to ' + workout + '.';
        }
      }
    }
    return null;
  }

  // ===========================================================
  // TTS playback
  // ===========================================================
  async function speak(text, thenListen) {
    text = plainText(text);
    showCaption(text, 0);
    setState('speaking');
    try {
      const r = await fetch('/api/divine-tts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) });
      if (!r.ok) { showCaption(text, 7000); afterSpeak(thenListen); return; }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      if (!audioEl) { audioEl = new Audio(); audioEl.setAttribute('playsinline', ''); }
      audioEl.src = url;
      audioEl.onended = () => { URL.revokeObjectURL(url); afterSpeak(thenListen); };
      audioEl.onerror = () => { URL.revokeObjectURL(url); afterSpeak(thenListen); };
      try { await audioEl.play(); }
      catch (e) { setHint('tap me to hear'); showCaption(text, 8000); afterSpeak(false); }
    } catch (e) { afterSpeak(thenListen); }
  }
  function stopSpeaking() { try { audioEl.pause(); audioEl.currentTime = 0; } catch (e) {} afterSpeak(false); }
  function afterSpeak(thenListen) {
    setState('idle');
    if (thenListen && !IS_MOBILE && micGranted) setTimeout(() => startListening(), 350);
  }

  // ===========================================================
  // Boot
  // ===========================================================
  function boot() {
    injectCSS();
    buildDOM();
    requestAnimationFrame(draw);
    const remembered = (function () { try { return localStorage.getItem('divine-mic-granted') === '1'; } catch (e) { return false; } })();
    setHint(remembered ? (IS_MOBILE ? 'tap to talk' : 'tap to wake') : 'tap to begin');
    if (!remembered) setTimeout(() => { if (!micGranted && !permEl) showPerm(); }, 1200);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
