/* ============================================================
   HAR ANIMASI — VOICE ACTOR PORTAL
   app.js — shared Supabase client + utilities
   Loaded on every page BEFORE any page-specific script.
   ============================================================ */

// ---- Supabase config -----------------------------------------------------
// Replace with your actual project values.
const SUPABASE_URL = 'https://nenwiksgqepktltfudpn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i8iVmsKSo2J4EXsCW4-WZw_Bp3K2FPq';

// `supabaseClient` and `SUPABASE_READY` are always defined, even if setup
// fails below — this is what stops one bad config from silently breaking
// every button on every page (a script that throws mid-file leaves anything
// declared with const/let after that line permanently unusable).
let supabaseClient = null;
let SUPABASE_READY = false;

function initSupabaseClient() {
  const url = (SUPABASE_URL || '').trim();
  const key = (SUPABASE_ANON_KEY || '').trim();

  const looksConfigured =
    url && key &&
    url !== 'YOUR_SUPABASE_URL' &&
    key !== 'YOUR_SUPABASE_ANON_KEY' &&
    /^https?:\/\/.+\.supabase\.co/i.test(url);

  if (!looksConfigured) {
    showSetupError(
      'SUPABASE BELUM DIKONFIGURASI',
      'Buka app.js, isi SUPABASE_URL dan SUPABASE_ANON_KEY dengan nilai asli dari Project Settings → API di dashboard Supabase kamu.'
    );
    return;
  }

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    showSetupError(
      'LIBRARY SUPABASE GAGAL DIMUAT',
      'Script supabase-js dari CDN tidak berhasil dimuat. Cek koneksi internet, ad-blocker, atau apakah tag <script> supabase-js ada sebelum app.js.'
    );
    return;
  }

  try {
    supabaseClient = window.supabase.createClient(url, key);
    SUPABASE_READY = true;
  } catch (err) {
    showSetupError('KONEKSI SUPABASE GAGAL DIBUAT', err?.message || String(err));
  }
}

// Call this at the top of any function that needs supabaseClient. Returns
// false (and shows a toast) if Supabase isn't ready, so the caller can
// bail out instead of throwing and silently killing the rest of the page.
function requireSupabaseReady() {
  if (!SUPABASE_READY) {
    showToast('Supabase belum terhubung. Lihat pesan di bagian atas halaman.', 'error', 6000);
    return false;
  }
  return true;
}

// A persistent, hard-to-miss banner (not just a console log) so the setup
// problem is obvious in the UI instead of looking like "the buttons are
// broken" with no explanation.
function showSetupError(title, message) {
  console.error(`[HAR ANIMASI] ${title}: ${message}`);
  let banner = document.getElementById('setupErrorBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'setupErrorBanner';
    banner.className = 'setup-banner';
    document.body.prepend(banner);
  }
  banner.innerHTML = `
    <div class="setup-banner-inner">
      <svg class="icon" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>
      <div>
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(message)}</span>
      </div>
    </div>`;
}

initSupabaseClient();

// Surface any error we didn't explicitly catch, instead of letting a
// button click fail silently with nothing but a console entry.
window.addEventListener('error', (e) => {
  console.error('Unhandled error:', e.error || e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
  const msg = e.reason?.message || 'Terjadi kesalahan tak terduga.';
  if (typeof showToast === 'function') showToast(msg, 'error');
});

// ---- Storage bucket names --------------------------------------------------
const BUCKET_VOICE_SAMPLES = 'voice-samples';
const BUCKET_VOICE_AUDITIONS = 'voice-auditions';
const BUCKET_CHARACTER_SAMPLES = 'character-samples';

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function ensureToastContainer() {
  let el = document.querySelector('.toast-container');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast-container';
    document.body.appendChild(el);
  }
  return el;
}

const TOAST_ICONS = {
  success: '<svg class="icon" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>',
  error: '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
  info: '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
  warning: '<svg class="icon" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>'
};

function showToast(message, type = 'info', duration = 4000) {
  const container = ensureToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `${TOAST_ICONS[type] || TOAST_ICONS.info}<span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 200ms ease';
    setTimeout(() => toast.remove(), 220);
  }, duration);
}

// ============================================================
// MODAL HELPER
// ============================================================
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('active');
}

// ============================================================
// GENERIC UTILITIES
// ============================================================
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function statusBadgeClass(status) {
  const map = {
    open: 'badge-open', selected: 'badge-selected', success: 'badge-success',
    pending: 'badge-pending', reviewing: 'badge-reviewing', submitted: 'badge-pending',
    rejected: 'badge-rejected', shortlisted: 'badge-shortlisted',
    draft: '', closed: '', archived: ''
  };
  return map[status] || '';
}

function debounce(fn, wait = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// Shared by casting.js, character-selection.js, audition.js and admin.js —
// defined here (loaded on every page) instead of only in casting.js, which
// isn't included on pages like audition that also need it.
function getQueryParam(name) {
  return new URLSearchParams(location.search).get(name);
}

function initials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function timeAgo(dateStr) {
  if (!dateStr) return '-';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(dateStr);
}

// A network call that never resolves (dropped connection, sleeping free-tier
// Supabase project, etc.) used to leave the UI stuck on a spinner forever —
// this is the fix for "loading lama" after submitting a form. Every auth /
// network call that gates a redirect should be wrapped in this.
function withTimeout(promise, ms = 15000, timeoutMessage = 'Request timed out. Please check your connection and try again.') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMessage)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// ============================================================
// AUTH SESSION HELPERS
// ============================================================

// Returns the current session (or null).
async function getSession() {
  if (!SUPABASE_READY) return null;
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    console.error('getSession error:', error);
    return null;
  }
  return data.session;
}

// Returns the current user's profile row (or null).
async function getCurrentProfile() {
  const session = await getSession();
  if (!session) return null;
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();
  if (error) {
    console.error('getCurrentProfile error:', error);
    return null;
  }
  return data;
}

// Redirects to login if not authenticated. Returns the session if authed.
async function requireAuth() {
  const session = await getSession();
  if (!session) {
    const next = encodeURIComponent(location.pathname + location.search);
    location.href = `login?next=${next}`;
    return null;
  }
  return session;
}

// Redirects to index if not an admin. Returns profile if admin.
async function requireAdmin() {
  const session = await requireAuth();
  if (!session) return null;
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin') {
    showToast('You do not have access to this page.', 'error');
    setTimeout(() => (location.href = 'index'), 1200);
    return null;
  }
  return profile;
}

async function logout() {
  await supabaseClient.auth.signOut();
  location.href = 'login';
}

// ============================================================
// NAVBAR — render auth-aware nav actions
// ============================================================
async function renderNavAuthState() {
  const slot = document.getElementById('navAuthSlot');
  if (!slot || !SUPABASE_READY) return;
  const session = await getSession();
  if (!session) {
    slot.innerHTML = `
      <a href="login" class="btn btn-outline btn-sm">Login</a>
      <a href="register" class="btn btn-primary btn-sm">Join as Voice Actor</a>
    `;
    return;
  }
  const profile = await getCurrentProfile();
  const dashboardLink = profile && profile.role === 'admin' ? 'admin' : 'dashboard';
  slot.innerHTML = `
    <a href="${dashboardLink}" class="btn btn-outline btn-sm">Dashboard</a>
    <button class="btn btn-secondary btn-sm" id="navLogoutBtn">Logout</button>
  `;
  document.getElementById('navLogoutBtn')?.addEventListener('click', logout);
}

// Mobile nav toggle (shared) — wrapped so a Supabase/network hiccup in
// renderNavAuthState can never stop the hamburger menu from working.
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('mobile-open');
      toggle.classList.toggle('is-open');
    });
  }
  Promise.resolve(renderNavAuthState()).catch((err) => console.error('renderNavAuthState failed:', err));
  setupAutoReveal();
});

// ============================================================
// APP SHELL — shared sidebar + topbar for Dashboard & Admin pages
// Every logged-in page calls renderAppShell() once auth is confirmed,
// instead of duplicating the sidebar markup in every HTML file.
// ============================================================
const VOICE_ACTOR_NAV = [
  { key: 'dashboard', href: 'dashboard', label: 'Dashboard', icon: '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M9 22V12h6v10"/>' },
  { key: 'casting', href: 'casting', label: 'Open Casting', icon: '<path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/>' },
  { key: 'auditions', href: 'auditions', label: 'My Auditions', icon: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>' },
  { key: 'notifications', href: 'notifications', label: 'Notifications', icon: '<path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>', badgeId: 'sideNavNotifBadge' },
  { key: 'profile', href: 'profile', label: 'Profile', icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0114 0v1"/>' },
  { key: 'settings', href: 'settings', label: 'Settings', icon: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9c.13.36.4.66.76.82H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>' }
];
const ADMIN_NAV = [
  { key: 'overview', href: 'admin', label: 'Overview', icon: '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M9 22V12h6v10"/>' },
  { key: 'castings', href: 'admin-castings', label: 'Castings', icon: '<path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/>' },
  { key: 'applications', href: 'admin-applications', label: 'Applications', icon: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>' },
  { key: 'actors', href: 'admin-actors', label: 'Voice Actors', icon: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>' }
];

async function renderAppShell(activeKey, pageTitle) {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const isAdmin = profile.role === 'admin';
  const navItems = isAdmin ? ADMIN_NAV : VOICE_ACTOR_NAV;

  const sidebarRoot = document.getElementById('sidebarRoot');
  const topbarRoot = document.getElementById('topbarRoot');
  if (!sidebarRoot || !topbarRoot) return profile;

  sidebarRoot.innerHTML = `
    <aside class="app-sidebar" id="appSidebar">
      <div class="app-sidebar-brand">
        <a href="index" class="brand"><img src="assets/logo.png" class="brand-logo" alt="HAR Animasi"></a>
        <button class="app-sidebar-close" id="sidebarCloseBtn" aria-label="Close menu">
          <svg class="icon" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="app-nav-label">${isAdmin ? 'ADMIN PANEL' : 'VOICE ACTOR'}</div>
      <nav class="app-nav">
        ${navItems.map(item => `
          <a href="${item.href}" class="${item.key === activeKey ? 'active' : ''}">
            <svg class="icon" viewBox="0 0 24 24">${item.icon}</svg>
            ${item.label}
            ${item.badgeId ? `<span class="nav-badge hidden" id="${item.badgeId}">0</span>` : ''}
          </a>
        `).join('')}
        ${isAdmin ? `<a href="index"><svg class="icon" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>Back to Site</a>` : ''}
      </nav>
      <div class="app-sidebar-foot">
        <button class="btn btn-outline btn-block btn-sm" id="sidebarLogoutBtn">
          <svg class="icon" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          LOGOUT
        </button>
      </div>
    </aside>
  `;

  const bellHtml = !isAdmin ? `
    <a href="notifications" class="btn btn-outline btn-icon btn-sm bell-btn" aria-label="Notifications">
      <svg class="icon" viewBox="0 0 24 24"><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
      <span class="bell-dot hidden" id="topbarBellDot"></span>
    </a>` : '';

  topbarRoot.innerHTML = `
    <div class="app-topbar-left">
      <button class="app-sidebar-toggle" id="sidebarOpenBtn" aria-label="Open menu">
        <svg class="icon" viewBox="0 0 24 24"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
      </button>
      <div class="app-topbar-title">${escapeHtml(pageTitle || '')}</div>
    </div>
    <div class="nav-actions">
      ${bellHtml}
      <div class="user-menu">
        <div class="avatar">${initials(profile.stage_name || profile.full_name)}</div>
        <div class="user-menu-text">
          <div class="user-menu-name">${escapeHtml(profile.stage_name || profile.full_name)}</div>
          <div class="user-menu-role">${isAdmin ? 'Admin' : 'Voice Actor'}</div>
        </div>
      </div>
    </div>
  `;

  // Mobile sidebar open/close
  const sidebarEl = document.getElementById('appSidebar');
  const overlayEl = document.getElementById('sidebarOverlay');
  const openSidebar = () => { sidebarEl.classList.add('open'); overlayEl?.classList.add('active'); };
  const closeSidebar = () => { sidebarEl.classList.remove('open'); overlayEl?.classList.remove('active'); };
  document.getElementById('sidebarOpenBtn')?.addEventListener('click', openSidebar);
  document.getElementById('sidebarCloseBtn')?.addEventListener('click', closeSidebar);
  overlayEl?.addEventListener('click', closeSidebar);

  document.getElementById('sidebarLogoutBtn')?.addEventListener('click', logout);

  if (!isAdmin) refreshNotificationBadges(profile.id);

  return profile;
}

// Files in voice-samples / voice-auditions are private buckets — this
// resolves a temporary signed URL for playback on demand.
async function getSignedUrl(bucket, path, expiresSeconds = 3600) {
  if (!path) return null;
  const { data, error } = await supabaseClient.storage.from(bucket).createSignedUrl(path, expiresSeconds);
  if (error) {
    showToast('Could not load audio: ' + error.message, 'error');
    return null;
  }
  return data.signedUrl;
}

async function refreshNotificationBadges(userId) {
  if (!SUPABASE_READY) return;
  const { count, error } = await supabaseClient
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) return;
  const navBadge = document.getElementById('sideNavNotifBadge');
  const bellDot = document.getElementById('topbarBellDot');
  if (navBadge) {
    if (count > 0) { navBadge.textContent = count > 99 ? '99+' : count; navBadge.classList.remove('hidden'); }
    else navBadge.classList.add('hidden');
  }
  if (bellDot) bellDot.classList.toggle('hidden', !count);
}

// ============================================================
// "ALIVE" MICRO-INTERACTIONS
// Fades/lifts cards in as they appear — both the ones already on the
// page and ones injected later (casting list, character grid, etc.)
// so no other file needs to know this exists.
// ============================================================
function setupAutoReveal() {
  const SELECTOR = '.card, .step-card, .char-card, .state-box';
  let counter = 0;

  function reveal(el) {
    if (!el.dataset || el.dataset.revealed) return;
    el.dataset.revealed = '1';
    el.classList.add('reveal');
    el.style.transitionDelay = `${(counter++ % 6) * 55}ms`;
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('reveal-in')));
  }

  document.querySelectorAll(SELECTOR).forEach(reveal);

  if (!('MutationObserver' in window)) return;
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        if (node.matches?.(SELECTOR)) reveal(node);
        node.querySelectorAll?.(SELECTOR).forEach(reveal);
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
