// =============================================================
// Persistent dashboard top bar — Divine edition.
// Drop this on any page with:
//     <script src="topbar.js" defer></script>
// =============================================================
(function () {
  'use strict';

  // ---- Apply saved theme before any render to minimise flash ----
  try { document.documentElement.setAttribute('data-theme', localStorage.getItem('divine-theme') || 'dark'); } catch(e) {}

  // -------- Supabase config --------
  const TOPBAR_SUPABASE_URL = 'https://reatwgqnfuiomdidrhdd.supabase.co';
  const TOPBAR_SUPABASE_KEY = 'sb_publishable_hjm63T8ml2uo-2wNndQYmg_sA2oc4iZ';

  // -------- CSS --------
  const css = `
/* ── Divine theme variables ───────────────────────────────── */
:root {
  --divine-bg:          #050506;
  --divine-surface:     #0C0C0D;
  --divine-border:      rgba(255,255,255,0.09);
  --divine-text-1:      #FAFAFA;
  --divine-text-2:      rgba(250,250,250,0.65);
  --divine-accent:      #F5C518;
  --divine-accent-dim:  rgba(245,197,24,0.14);
  --divine-pill-bg:     rgba(255,255,255,0.04);
  --divine-pill-border: rgba(255,255,255,0.07);
}
html[data-theme="light"] {
  --divine-bg:          #F5F4F0;
  --divine-surface:     #FFFFFF;
  --divine-border:      rgba(0,0,0,0.09);
  --divine-text-1:      #0A0A0B;
  --divine-text-2:      rgba(10,10,11,0.68);
  --divine-accent:      #C8940A;
  --divine-accent-dim:  rgba(200,148,10,0.14);
  --divine-pill-bg:     rgba(0,0,0,0.04);
  --divine-pill-border: rgba(0,0,0,0.08);
}
html[data-theme="light"] body {
  background: var(--divine-bg) !important;
  color: var(--divine-text-2) !important;
}
/* ─────────────────────────────────────────────────────────── */

.topbar {
  position: sticky; top: 0; z-index: 40;
  display: flex; align-items: center; gap: 6px;
  padding-top: max(12px, env(safe-area-inset-top));
  padding-right: max(14px, env(safe-area-inset-right));
  padding-bottom: 10px;
  padding-left: max(14px, env(safe-area-inset-left));
  background: var(--divine-surface, #0C0C0D);
  border-bottom: 1px solid var(--divine-border, rgba(255,255,255,0.09));
  box-shadow: 0 2px 16px rgba(0,0,0,0.4);
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
  transition: background 0.25s ease, border-color 0.25s ease;
}
.topbar-pill {
  flex: 1 1 0; min-width: 0;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 12px;
  background: var(--divine-pill-bg, rgba(255,255,255,0.04));
  border: 1px solid var(--divine-pill-border, rgba(255,255,255,0.07));
  border-radius: 11px;
  text-decoration: none;
  color: var(--divine-text-1, #FAFAFA);
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.topbar-pill:hover {
  background: var(--divine-accent-dim, rgba(255,255,255,0.07));
  border-color: rgba(245,197,24,0.25);
}
.topbar-pill-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #6ee7b7; flex-shrink: 0;
  transition: background 0.2s;
}
.topbar-pill.warn .topbar-pill-dot { background: #fbbf24; }
.topbar-pill.miss .topbar-pill-dot {
  background: #ff8a8a;
  animation: topbar-miss-pulse 1.6s ease-in-out infinite;
}
@keyframes topbar-miss-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
  50%      { box-shadow: 0 0 0 5px rgba(239, 68, 68, 0); }
}
.topbar-pill-label {
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--divine-text-2, rgba(255,255,255,0.5));
  flex-shrink: 0;
}
.topbar-pill-count {
  margin-left: auto;
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 12px; font-weight: 700;
  color: var(--divine-text-1, #FAFAFA);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.topbar-water-wrap {
  flex: 1 1 0; min-width: 0;
  display: flex;
}
.topbar-water-pill {
  flex: 1; min-width: 0;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 12px;
  background: rgba(125, 211, 252, 0.07);
  border: 1px solid rgba(125, 211, 252, 0.14);
  border-right: none;
  border-radius: 11px 0 0 11px;
  text-decoration: none;
  color: var(--divine-text-1, #FAFAFA);
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s;
}
.topbar-water-pill:hover { background: rgba(125, 211, 252, 0.12); }
.topbar-water-pill .topbar-pill-dot { background: #7DD3FC; }
.topbar-water-add {
  flex: 0 0 auto;
  width: 38px;
  border: 1px solid rgba(125, 211, 252, 0.14);
  background: linear-gradient(180deg, rgba(125, 211, 252, 0.22), rgba(110, 231, 183, 0.22));
  color: #FFFFFF;
  font-family: inherit; font-size: 17px; font-weight: 700;
  cursor: pointer;
  border-radius: 0 11px 11px 0;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s, transform 0.10s;
}
.topbar-water-add:hover {
  background: linear-gradient(180deg, rgba(125, 211, 252, 0.34), rgba(110, 231, 183, 0.34));
}
.topbar-water-add:active { transform: scale(0.94); }
.topbar-water-add.flash {
  background: linear-gradient(180deg, rgba(125, 211, 252, 0.65), rgba(110, 231, 183, 0.65));
}

.topbar-label-short { display: none; }
.topbar-label-emoji { display: none; font-size: 15px; line-height: 1; }

/* ── Divine brand ────────────────────────────────────────── */
.topbar-brand {
  display: flex; align-items: center; gap: 6px;
  text-decoration: none; flex-shrink: 0;
  padding: 5px 8px 5px 4px;
  margin-right: 2px;
  border-radius: 10px;
  transition: background 0.15s;
}
.topbar-brand:hover { background: var(--divine-accent-dim, rgba(245,197,24,0.12)); }
.topbar-star {
  width: 17px; height: 17px;
  fill: var(--divine-accent, #F5C518);
  flex-shrink: 0;
  filter: drop-shadow(0 0 5px rgba(245,197,24,0.4));
  transition: fill 0.25s;
}
.topbar-name {
  font-size: 11px; font-weight: 800;
  letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--divine-accent, #F5C518);
  white-space: nowrap;
  transition: color 0.25s;
}

/* ── Theme toggle ────────────────────────────────────────── */
.topbar-theme-btn {
  flex-shrink: 0;
  width: 32px; height: 32px;
  border: 1px solid var(--divine-border, rgba(255,255,255,0.09));
  border-radius: 9px;
  background: transparent;
  color: var(--divine-text-2, rgba(250,250,250,0.65));
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  margin-left: 2px;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.topbar-theme-btn:hover {
  background: var(--divine-accent-dim, rgba(245,197,24,0.12));
  border-color: var(--divine-accent, #F5C518);
  color: var(--divine-accent, #F5C518);
}

/* ── Active pill (current page) ──────────────────────────── */
.topbar-pill.is-active {
  background: var(--divine-accent-dim, rgba(245,197,24,0.12));
  border-color: rgba(245,197,24,0.3);
}
.topbar-pill.is-active .topbar-pill-dot { background: var(--divine-accent, #F5C518); }
.topbar-pill.is-active .topbar-pill-label,
.topbar-pill.is-active .topbar-pill-count { color: var(--divine-accent, #F5C518); }

@media (max-width: 480px) {
  .topbar { padding-top: max(52px, env(safe-area-inset-top)); padding-left: max(6px, env(safe-area-inset-left)); padding-right: max(6px, env(safe-area-inset-right)); gap: 3px; }
  .topbar-pill, .topbar-water-pill { padding: 5px 6px; gap: 4px; overflow: hidden; }
  .topbar-pill-label { font-size: 9px; letter-spacing: 0.06em; flex-shrink: 1; min-width: 0; overflow: hidden; }
  .topbar-pill-count { display: none; }
  .topbar-water-pill .topbar-pill-label { display: none; }
  .topbar-water-pill .topbar-pill-count { display: none; }
  .topbar-water-add { width: 38px; font-size: 15px; }
  .topbar-pill-label { display: none; }
  .topbar-label-emoji { display: inline; }
  .topbar-name { display: none; }
  .topbar-brand { padding: 5px 4px; margin-right: 0; }
  .topbar-theme-btn { width: 28px; height: 28px; margin-left: 1px; }
}

/* === Global mobile lockdown === */
html, body {
  -webkit-text-size-adjust: 100%;
}
@media (max-width: 768px) {
  html { touch-action: manipulation; }
  ::-webkit-scrollbar { width: 0; height: 0; display: none; }
  html, body { scrollbar-width: none; -ms-overflow-style: none; }
}
.modal-bg, .modal, .po-modal-bg, .po-modal, .wt-overlay, .wt-viewer {
  overscroll-behavior: contain;
}
body.topbar-modal-open {
  overflow: hidden;
  touch-action: none;
}
@media (max-width: 480px) {
  .modal-bg, .po-modal-bg {
    padding: 0 !important;
    align-items: stretch !important;
    justify-content: stretch !important;
  }
  .modal, .po-modal {
    width: 100% !important;
    max-width: 100% !important;
    max-height: 100vh !important;
    height: 100vh !important;
    border-radius: 0 !important;
    padding-top: max(20px, env(safe-area-inset-top)) !important;
    padding-bottom: max(28px, env(safe-area-inset-bottom)) !important;
    overflow-y: auto !important;
    overscroll-behavior: contain;
  }
}
`;

  // -------- HTML --------
  const html = `
<header class="topbar" id="topbar" role="navigation" aria-label="Quick stats">
  <a href="index.html" class="topbar-brand" aria-label="Divine home">
    <svg class="topbar-star" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 1L14.5 9.5L23 12L14.5 14.5L12 23L9.5 14.5L1 12L9.5 9.5Z"/></svg>
    <span class="topbar-name">Divine</span>
  </a>
  <a href="index.html" class="topbar-pill" id="topbarGoals">
    <span class="topbar-pill-dot"></span>
    <span class="topbar-pill-label topbar-label-full">Goals</span>
    <span class="topbar-pill-label topbar-label-emoji">🎯</span>
    <span class="topbar-pill-count" id="topbarGoalsCount">—/—</span>
  </a>
  <a href="health.html" class="topbar-pill" id="topbarStack">
    <span class="topbar-pill-dot"></span>
    <span class="topbar-pill-label topbar-label-full">Stack</span>
    <span class="topbar-pill-label topbar-label-emoji">💊</span>
    <span class="topbar-pill-count" id="topbarStackCount">—/—</span>
  </a>
  <div class="topbar-water-wrap">
    <a href="health.html#water" class="topbar-water-pill" id="topbarWater">
      <span class="topbar-pill-dot"></span>
      <span class="topbar-pill-label topbar-label-full">Water</span>
      <span class="topbar-pill-label topbar-label-emoji">💧</span>
      <span class="topbar-pill-count" id="topbarWaterCount">—/—</span>
    </a>
    <button class="topbar-water-add" id="topbarWaterAdd" aria-label="Log one drink" type="button">+</button>
  </div>
  <a href="gym.html" class="topbar-pill" id="topbarGym">
    <span class="topbar-pill-dot"></span>
    <span class="topbar-pill-label topbar-label-full">Gym</span>
    <span class="topbar-pill-label topbar-label-emoji">💪</span>
  </a>
  <a href="finance.html" class="topbar-pill" id="topbarFinance">
    <span class="topbar-pill-dot"></span>
    <span class="topbar-pill-label topbar-label-full">Finance</span>
    <span class="topbar-pill-label topbar-label-emoji">💰</span>
  </a>
  <button class="topbar-theme-btn" id="topbarThemeToggle" type="button" aria-label="Toggle theme"></button>
</header>
`;

  function injectStyleAndHTML() {
    if (document.getElementById('topbar')) return; // already injected
    const style = document.createElement('style');
    style.id = 'topbar-style';
    style.textContent = css;
    document.head.appendChild(style);

    const wrap = document.createElement('div');
    wrap.innerHTML = html.trim();
    document.body.insertBefore(wrap.firstChild, document.body.firstChild);
  }

  // -------- Theme --------
  function _divineApplyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('divine-theme', theme); } catch(e) {}
    const btn = document.getElementById('topbarThemeToggle');
    if (!btn) return;
    const isDark = theme !== 'light';
    btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    btn.innerHTML = isDark
      ? '<svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
      : '<svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }
  function _divineSetupTheme() {
    let saved = 'dark';
    try { saved = localStorage.getItem('divine-theme') || 'dark'; } catch(e) {}
    _divineApplyTheme(saved);
    const btn = document.getElementById('topbarThemeToggle');
    if (btn) btn.addEventListener('click', function() {
      const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      _divineApplyTheme(next);
    });
  }
  function _divineMarkActive() {
    const path = window.location.pathname;
    const map = { topbarGoals: 'index', topbarStack: 'health', topbarGym: 'gym', topbarFinance: 'finance' };
    Object.keys(map).forEach(function(id) {
      const el = document.getElementById(id);
      if (!el) return;
      const key = map[id];
      const isHome = key === 'index' && (path === '/' || path.endsWith('/') || path.endsWith('index.html'));
      el.classList.toggle('is-active', isHome || (!isHome && path.includes('/' + key)));
    });
  }

  // -------- Active-date helpers (match the goals page 6 AM rollover) --------
  function activeDateKey() {
    const now = new Date();
    const d = new Date(now);
    if (now.getHours() < 6) d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }
  function calendarDateKey() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  // -------- Read progress from localStorage --------
  function getGoalsProgress() {
    const key = 'goals:' + activeDateKey();
    let goals = [];
    try { goals = JSON.parse(localStorage.getItem(key)) || []; } catch (e) {}
    const total = Array.isArray(goals) ? goals.length : 0;
    const done = total ? goals.filter(g => g && g.done).length : 0;
    return { done, total };
  }

  function getStackProgress() {
    let items = [];
    try { items = JSON.parse(localStorage.getItem('stack:items')) || []; } catch (e) {}
    let taken = {};
    try { taken = JSON.parse(localStorage.getItem('stack:taken:' + activeDateKey())) || {}; } catch (e) {}
    const total = Array.isArray(items) ? items.length : 0;
    const done = total ? items.filter(i => i && taken[i.id]).length : 0;
    return { done, total };
  }

  function getWaterProgress() {
    let state = null;
    try { state = JSON.parse(localStorage.getItem('po_water_v1')); } catch (e) {}
    if (!state) return { done: 0, total: 0 };
    const todayKey = calendarDateKey();
    const done = (state.logs || {})[todayKey] || 0;
    const p = state.profile || { weightKg: 75 };
    const wKg = state.weightUnit === 'lb' ? (p.weightKg || 0) / 2.20462 : (p.weightKg || 0);
    const base = wKg * 35;
    const exercise = (p.activityHrsPerWeek || 0) / 7 * 500;
    const caffeine = Math.max(0, (state.caffeineMgPerDay || 0) - 200) * 1.5;
    const subs = (state.substances || []).reduce((s, x) => {
      const dose = (x && x.dose != null ? x.dose : (x && x.defaultDose)) || 0;
      return s + Math.max(0, dose * ((x && x.mlPerUnit) || 0));
    }, 0);
    let adjust = 0;
    if (p.sex === 'm') adjust += 200;
    if ((p.age || 0) >= 50) adjust += 100;
    const totalMl = base + exercise + caffeine + subs + adjust;
    let unitVol;
    if (state.unit === 'glass') unitVol = state.glassMl || 250;
    else if (state.unit === 'oz') unitVol = 30;
    else if (state.unit === 'ml') unitVol = 1;
    else unitVol = state.bottleMl || 500;
    const total = Math.max(1, Math.ceil(totalMl / unitVol));
    return { done, total };
  }

  function classifyStatus(done, total) {
    if (total === 0) return 'idle';
    if (done >= total) return 'good';
    if (done >= total * 0.5) return 'warn';
    const h = new Date().getHours();
    if (h >= 18 && done < total * 0.5) return 'miss';
    return 'warn';
  }

  function setPillStatus(pillEl, status) {
    pillEl.classList.remove('good', 'warn', 'miss');
    if (status === 'warn' || status === 'miss') pillEl.classList.add(status);
  }

  function render() {
    const goalsEl = document.getElementById('topbarGoals');
    const stackEl = document.getElementById('topbarStack');
    const waterEl = document.getElementById('topbarWater');
    if (!goalsEl) return;

    const g = getGoalsProgress();
    const s = getStackProgress();
    const w = getWaterProgress();

    document.getElementById('topbarGoalsCount').textContent =
      g.total ? g.done + '/' + g.total : '0/0';
    document.getElementById('topbarStackCount').textContent =
      s.total ? s.done + '/' + s.total : '0/0';
    document.getElementById('topbarWaterCount').textContent =
      w.total ? w.done + '/' + w.total : '0/0';

    setPillStatus(goalsEl, classifyStatus(g.done, g.total));
    setPillStatus(stackEl, classifyStatus(s.done, s.total));
    setPillStatus(waterEl, classifyStatus(w.done, w.total));
  }

  // -------- Water +1 (works from any page) --------
  function defaultWaterState() {
    return {
      unit: 'bottle', bottleMl: 500, glassMl: 250, weightUnit: 'kg',
      profile: { weightKg: 75, age: 25, sex: 'm', activityHrsPerWeek: 5 },
      caffeineMgPerDay: 200, substances: [], logs: {}
    };
  }

  async function pushWaterMergedToSupabase(localWater) {
    if (window.location.pathname.endsWith('/health.html') ||
        window.location.pathname.endsWith('health.html')) return;

    if (!window.supabase || !TOPBAR_SUPABASE_URL || !TOPBAR_SUPABASE_KEY) return;
    if (TOPBAR_SUPABASE_URL.indexOf('PASTE-') === 0) return;

    try {
      const supa = window.supabase.createClient(TOPBAR_SUPABASE_URL, TOPBAR_SUPABASE_KEY);
      const { data } = await supa
        .from('app_state').select('data').eq('key', 'health').maybeSingle();
      const current = (data && data.data) || {};
      const merged = Object.assign({}, current, { po_water_v1: localWater });
      await supa.from('app_state').upsert(
        { key: 'health', data: merged, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
    } catch (e) {}
  }

  function addWater() {
    let state = null;
    try { state = JSON.parse(localStorage.getItem('po_water_v1')); } catch (e) {}
    if (!state || typeof state !== 'object') state = defaultWaterState();
    state.logs = state.logs || {};
    const k = calendarDateKey();
    state.logs[k] = (state.logs[k] || 0) + 1;
    try { localStorage.setItem('po_water_v1', JSON.stringify(state)); } catch (e) {}
    render();

    const btn = document.getElementById('topbarWaterAdd');
    if (btn) {
      btn.classList.add('flash');
      setTimeout(() => btn.classList.remove('flash'), 220);
    }

    pushWaterMergedToSupabase(state);
  }

  // -------- Mobile lockdown helpers --------
  function blockGesture(e) { e.preventDefault(); }
  function lockGestures() {
    document.addEventListener('gesturestart', blockGesture, { passive: false });
    document.addEventListener('gesturechange', blockGesture, { passive: false });
    document.addEventListener('gestureend', blockGesture, { passive: false });
    let lastTouch = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouch <= 300) e.preventDefault();
      lastTouch = now;
    }, { passive: false });
  }

  function startModalLock() {
    const MODAL_SELECTORS = [
      '.modal-bg', '.po-modal-bg', '.wt-overlay', '.wt-viewer', '.wt-cam'
    ];
    function anyOpen() {
      for (const sel of MODAL_SELECTORS) {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          if (el.classList.contains('show') || el.classList.contains('is-open')) {
            return true;
          }
        }
      }
      return false;
    }
    function sync() {
      document.body.classList.toggle('topbar-modal-open', anyOpen());
    }
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      attributes: true, attributeFilter: ['class'], subtree: true
    });
    sync();
  }

  // -------- Boot --------
  function boot() {
    injectStyleAndHTML();
    _divineSetupTheme();
    _divineMarkActive();
    const btn = document.getElementById('topbarWaterAdd');
    if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); addWater(); });
    render();
    startModalLock();

    window.addEventListener('storage', render);
    window.addEventListener('focus', render);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

    setInterval(render, 30 * 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
