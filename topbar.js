// =============================================================
// Persistent dashboard top bar — Divine edition.
// =============================================================
(function () {
  'use strict';

  // Apply saved theme before any render to minimise flash
  try { document.documentElement.setAttribute('data-theme', localStorage.getItem('divine-theme') || 'dark'); } catch(e) {}

  // -------- Supabase config --------
  const TOPBAR_SUPABASE_URL = 'https://reatwgqnfuiomdidrhdd.supabase.co';
  const TOPBAR_SUPABASE_KEY = 'sb_publishable_hjm63T8ml2uo-2wNndQYmg_sA2oc4iZ';

  // -------- CSS --------
  const css = `
/* ── Divine theme variables ───────────────────────────────── */
:root {
  --divine-bg:          #050508;
  --divine-surface:     #0C0B18;
  --divine-border:      rgba(160,140,255,0.10);
  --divine-text-1:      #EDE8FF;
  --divine-text-2:      rgba(210,195,255,0.62);
  --divine-accent:      #F5C518;
  --divine-accent-dim:  rgba(245,197,24,0.14);
  --divine-pill-bg:     rgba(150,130,255,0.06);
  --divine-pill-border: rgba(150,130,255,0.11);
}
html[data-theme="light"] {
  --divine-bg:          #F7F5F2;
  --divine-surface:     #FFFFFF;
  --divine-border:      rgba(30,25,50,0.10);
  --divine-text-1:      #1E1A2E;
  --divine-text-2:      rgba(30,25,50,0.72);
  --divine-accent:      #A67800;
  --divine-accent-dim:  rgba(166,120,0,0.12);
  --divine-pill-bg:     rgba(30,25,50,0.04);
  --divine-pill-border: rgba(30,25,50,0.10);
}
/* Global light-mode base — overrides per-page hardcoded dark backgrounds */
html[data-theme="light"] body {
  background: var(--divine-bg) !important;
  color: var(--divine-text-2) !important;
}
html[data-theme="light"], html[data-theme="light"] * {
  transition: background-color 0.25s ease, color 0.25s ease, border-color 0.25s ease;
}
/* ─────────────────────────────────────────────────────────── */

.topbar {
  position: sticky; top: 0; z-index: 40;
  display: flex; align-items: center; gap: 6px;
  padding-top: max(12px, env(safe-area-inset-top));
  padding-right: max(14px, env(safe-area-inset-right));
  padding-bottom: 10px;
  padding-left: max(14px, env(safe-area-inset-left));
  background: var(--divine-surface);
  border-bottom: 1px solid var(--divine-border);
  box-shadow: 0 1px 24px rgba(0,0,0,0.35);
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
  transition: background 0.25s ease, border-color 0.25s ease;
}
.topbar-pill {
  flex: 1 1 0; min-width: 0;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 12px;
  background: var(--divine-pill-bg);
  border: 1px solid var(--divine-pill-border);
  border-radius: 11px;
  text-decoration: none;
  color: var(--divine-text-1);
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s, border-color 0.15s;
}
.topbar-pill:hover {
  background: var(--divine-accent-dim);
  border-color: rgba(245,197,24,0.28);
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
  0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
  50%       { box-shadow: 0 0 0 5px rgba(239,68,68,0); }
}
.topbar-pill-label {
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--divine-text-2);
  flex-shrink: 0;
}
.topbar-pill-count {
  margin-left: auto;
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 12px; font-weight: 700;
  color: var(--divine-text-1);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.topbar-label-short { display: none; }
.topbar-label-emoji { display: none; font-size: 15px; line-height: 1; }

/* ── Active pill ─────────────────────────────────────────── */
.topbar-pill.is-active {
  background: var(--divine-accent-dim);
  border-color: rgba(245,197,24,0.32);
}
.topbar-pill.is-active .topbar-pill-dot { background: var(--divine-accent); }
.topbar-pill.is-active .topbar-pill-label,
.topbar-pill.is-active .topbar-pill-count { color: var(--divine-accent); }

/* ── Divine brand ────────────────────────────────────────── */
.topbar-brand {
  display: flex; align-items: center; gap: 6px;
  text-decoration: none; flex-shrink: 0;
  padding: 5px 8px 5px 4px;
  margin-right: 2px;
  border-radius: 10px;
  transition: background 0.15s;
}
.topbar-brand:hover { background: var(--divine-accent-dim); }
.topbar-star {
  width: 17px; height: 17px;
  fill: var(--divine-accent);
  flex-shrink: 0;
  filter: drop-shadow(0 0 5px rgba(245,197,24,0.4));
  transition: fill 0.25s;
}
.topbar-name {
  font-size: 11px; font-weight: 800;
  letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--divine-accent);
  white-space: nowrap;
  transition: color 0.25s;
}

/* ── Theme toggle ────────────────────────────────────────── */
.topbar-theme-btn {
  flex-shrink: 0;
  width: 32px; height: 32px;
  border: 1px solid var(--divine-border);
  border-radius: 9px;
  background: transparent;
  color: var(--divine-text-2);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  margin-left: 2px;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.topbar-theme-btn:hover {
  background: var(--divine-accent-dim);
  border-color: var(--divine-accent);
  color: var(--divine-accent);
}

/* ── Mobile ──────────────────────────────────────────────── */
@media (max-width: 480px) {
  .topbar { padding-top: max(52px, env(safe-area-inset-top)); padding-left: max(6px, env(safe-area-inset-left)); padding-right: max(6px, env(safe-area-inset-right)); gap: 3px; }
  .topbar-pill { padding: 5px 7px; gap: 4px; overflow: hidden; }
  .topbar-pill-count { display: none; }
  .topbar-pill-label { display: none; }
  .topbar-label-emoji { display: inline; font-size: 16px; }
  .topbar-name { display: none; }
  .topbar-brand { padding: 5px 4px; margin-right: 0; }
  .topbar-theme-btn { width: 28px; height: 28px; margin-left: 1px; }
}

/* === Global mobile / scroll lockdown === */
html, body { -webkit-text-size-adjust: 100%; }
@media (max-width: 768px) {
  html { touch-action: manipulation; }
  ::-webkit-scrollbar { width: 0; height: 0; display: none; }
  html, body { scrollbar-width: none; -ms-overflow-style: none; }
}
.modal-bg, .modal, .po-modal-bg, .po-modal, .wt-overlay, .wt-viewer {
  overscroll-behavior: contain;
}
body.topbar-modal-open { overflow: hidden; touch-action: none; }
@media (max-width: 480px) {
  .modal-bg, .po-modal-bg {
    padding: 0 !important;
    align-items: stretch !important;
    justify-content: stretch !important;
  }
  .modal, .po-modal {
    width: 100% !important; max-width: 100% !important;
    max-height: 100vh !important; height: 100vh !important;
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
    if (document.getElementById('topbar')) return;
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

  // -------- Active-date helpers --------
  function activeDateKey() {
    const now = new Date();
    const d = new Date(now);
    if (now.getHours() < 6) d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  // -------- Progress readers --------
  function getGoalsProgress() {
    let goals = [];
    try { goals = JSON.parse(localStorage.getItem('goals:' + activeDateKey())) || []; } catch (e) {}
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

  function classifyStatus(done, total) {
    if (total === 0) return 'idle';
    if (done >= total) return 'good';
    const h = new Date().getHours();
    if (h >= 18 && done < total * 0.5) return 'miss';
    return 'warn';
  }
  function setPillStatus(el, status) {
    if (!el) return;
    el.classList.remove('good', 'warn', 'miss');
    if (status === 'warn' || status === 'miss') el.classList.add(status);
  }

  function render() {
    const goalsEl = document.getElementById('topbarGoals');
    if (!goalsEl) return;
    const g = getGoalsProgress();
    const s = getStackProgress();
    const gc = document.getElementById('topbarGoalsCount');
    const sc = document.getElementById('topbarStackCount');
    if (gc) gc.textContent = g.total ? g.done + '/' + g.total : '—';
    if (sc) sc.textContent = s.total ? s.done + '/' + s.total : '—';
    setPillStatus(goalsEl, classifyStatus(g.done, g.total));
    setPillStatus(document.getElementById('topbarStack'), classifyStatus(s.done, s.total));
  }

  // -------- Modal scroll lock --------
  function startModalLock() {
    const SEL = ['.modal-bg', '.po-modal-bg', '.wt-overlay', '.wt-viewer', '.wt-cam'];
    function anyOpen() {
      for (const s of SEL) {
        const els = document.querySelectorAll(s);
        for (const el of els) {
          if (el.classList.contains('show') || el.classList.contains('is-open')) return true;
        }
      }
      return false;
    }
    const obs = new MutationObserver(() => document.body.classList.toggle('topbar-modal-open', anyOpen()));
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true });
    document.body.classList.toggle('topbar-modal-open', anyOpen());
  }

  // -------- Boot --------
  function boot() {
    injectStyleAndHTML();
    _divineSetupTheme();
    _divineMarkActive();
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
