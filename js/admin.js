/**
 * SSF Membership Studio - Admin Dashboard Controller
 * Subscribes to real-time Firebase Realtime Database updates.
 * Displays:
 * 1. Global Total Posters Created
 * 2. Total Registered Units
 * 3. Leaderboard of all units with individual poster counts
 * 4. Real-time Search and Filter
 */

import { subscribeToAdminData } from './firebase.js';

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const totalPostersEl = document.getElementById('totalPostersCount');
  const totalUnitsEl = document.getElementById('totalUnitsCount');
  const totalDownloadsEl = document.getElementById('totalDownloadsCount');
  const totalWhatsAppEl = document.getElementById('totalWhatsAppCount');
  const unitsBadge = document.getElementById('unitsBadge');

  const loadingState = document.getElementById('loadingState');
  const emptyState = document.getElementById('emptyState');
  const unitsTable = document.getElementById('unitsTable');
  const unitsTableBody = document.getElementById('unitsTableBody');
  const mobileUnitsList = document.getElementById('mobileUnitsList');

  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const refreshBtn = document.getElementById('refreshBtn');

  let allUnits = [];
  let currentFilter = '';
  let currentSort = 'posters_desc';

  function formatTimeAgo(isoString) {
    if (!isoString) return '—';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffSec = Math.floor((now - date) / 1000);

      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;

      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '—';
    }
  }

  function getRankBadge(rank) {
    if (rank === 1) {
      return '<span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-extrabold text-xs shadow-xs">🥇</span>';
    }
    if (rank === 2) {
      return '<span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-extrabold text-xs shadow-xs">🥈</span>';
    }
    if (rank === 3) {
      return '<span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/10 text-amber-900 font-extrabold text-xs shadow-xs">🥉</span>';
    }
    return `<span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-mono font-bold text-xs">${rank}</span>`;
  }

  function renderUnits() {
    let filtered = allUnits.filter(u => {
      const q = currentFilter.toLowerCase().trim();
      if (!q) return true;
      return (
        (u.unitName || '').toLowerCase().includes(q) ||
        (u.studentCentre || '').toLowerCase().includes(q)
      );
    });

    // Sorting
    filtered.sort((a, b) => {
      if (currentSort === 'posters_desc') return (b.postersCount || 0) - (a.postersCount || 0);
      if (currentSort === 'posters_asc') return (a.postersCount || 0) - (b.postersCount || 0);
      if (currentSort === 'name_asc') return (a.unitName || '').localeCompare(b.unitName || '');
      if (currentSort === 'recent') {
        const da = a.lastActive ? new Date(a.lastActive) : 0;
        const db = b.lastActive ? new Date(b.lastActive) : 0;
        return db - da;
      }
      return 0;
    });

    if (unitsBadge) unitsBadge.textContent = filtered.length;

    if (filtered.length === 0) {
      if (unitsTable) unitsTable.classList.add('hidden');
      if (mobileUnitsList) mobileUnitsList.classList.add('hidden');
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    if (unitsTable) unitsTable.classList.remove('hidden');
    if (mobileUnitsList) mobileUnitsList.classList.remove('hidden');

    // Desktop Table Rows
    if (unitsTableBody) {
      unitsTableBody.innerHTML = filtered.map((unit, index) => {
        const rank = index + 1;
        const count = unit.postersCount || 0;
        const timeAgo = formatTimeAgo(unit.lastActive || unit.registeredAt);

        return `
          <tr class="hover:bg-slate-50/80 transition-colors">
            <td class="py-3.5 px-4 text-center">${getRankBadge(rank)}</td>
            <td class="py-3.5 px-4">
              <div class="font-extrabold text-slate-900 text-sm">${escapeHtml(unit.unitName)}</div>
            </td>
            <td class="py-3.5 px-4 text-slate-600">
              <div class="text-xs truncate max-w-xs">${escapeHtml(unit.studentCentre || '—')}</div>
            </td>
            <td class="py-3.5 px-4 text-center">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-black text-xs font-mono ${
                count > 0 ? 'bg-red-50 text-red-600 border border-red-200/60' : 'bg-slate-100 text-slate-600'
              }">
                <span>${count}</span>
                <span class="text-[10px] font-sans font-bold text-slate-500">posters</span>
              </span>
            </td>
            <td class="py-3.5 px-4 text-right text-slate-500 text-[11px] font-mono whitespace-nowrap">
              ${timeAgo}
            </td>
          </tr>
        `;
      }).join('');
    }

    // Mobile Cards View
    if (mobileUnitsList) {
      mobileUnitsList.innerHTML = filtered.map((unit, index) => {
        const rank = index + 1;
        const count = unit.postersCount || 0;
        const timeAgo = formatTimeAgo(unit.lastActive || unit.registeredAt);

        return `
          <div class="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
            <div class="flex items-center gap-2.5 flex-1 min-w-0">
              <div class="shrink-0">${getRankBadge(rank)}</div>
              <div class="truncate">
                <div class="font-extrabold text-slate-900 text-xs truncate">${escapeHtml(unit.unitName)}</div>
                <div class="text-[11px] text-slate-500 truncate">${escapeHtml(unit.studentCentre || '—')}</div>
                <div class="text-[10px] text-slate-400 font-mono mt-0.5">${timeAgo}</div>
              </div>
            </div>
            <div class="shrink-0 text-right">
              <span class="inline-flex flex-col items-center justify-center px-2.5 py-1 rounded-xl font-black text-xs font-mono ${
                count > 0 ? 'bg-red-50 text-red-600 border border-red-200/60' : 'bg-slate-100 text-slate-600'
              }">
                <span class="text-sm leading-tight">${count}</span>
                <span class="text-[9px] font-sans font-bold text-slate-500 uppercase">posters</span>
              </span>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }

  // ADMIN AUTHENTICATION GUARD
  const loginOverlay = document.getElementById('loginOverlay');
  const loginForm = document.getElementById('loginForm');
  const loginUserId = document.getElementById('loginUserId');
  const loginPassword = document.getElementById('loginPassword');
  const loginError = document.getElementById('loginError');
  const logoutBtn = document.getElementById('logoutBtn');

  const ADMIN_USER_ID = 'ssfmlpeast';
  const ADMIN_PASSWORD = 'ssf123east';
  const AUTH_KEY = 'ssf_admin_auth_token';

  function isAuthenticated() {
    return sessionStorage.getItem(AUTH_KEY) === 'true' || localStorage.getItem(AUTH_KEY) === 'true';
  }

  function setAuthenticated(status) {
    if (status) {
      sessionStorage.setItem(AUTH_KEY, 'true');
      localStorage.setItem(AUTH_KEY, 'true');
    } else {
      sessionStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(AUTH_KEY);
    }
  }

  function initSubscription() {
    if (unsubscribe) return; // Prevent duplicate subscriptions
    if (loadingState) loadingState.classList.remove('hidden');

    unsubscribe = subscribeToAdminData((data) => {
      if (loadingState) loadingState.classList.add('hidden');

      const stats = data.stats || {};
      const totalPosters = stats.totalPosters || 0;
      const downloads = stats.downloads || 0;
      const whatsapp = stats.whatsappShares || 0;
      allUnits = data.units || [];

      if (totalPostersEl) totalPostersEl.textContent = Number(totalPosters).toLocaleString();
      if (totalUnitsEl) totalUnitsEl.textContent = Number(data.totalUnitsCount || allUnits.length).toLocaleString();
      if (totalDownloadsEl) totalDownloadsEl.textContent = Number(downloads).toLocaleString();
      if (totalWhatsAppEl) totalWhatsAppEl.textContent = Number(whatsapp).toLocaleString();

      if (dbStatusBanner) {
        if (data.isLocalFallback) {
          dbStatusBanner.className = 'block p-4 rounded-2xl bg-amber-50 border border-amber-200/90 text-amber-900 text-xs shadow-xs';
          dbStatusBanner.innerHTML = `
            <div class="flex items-start gap-3">
              <span class="text-xl">⚠️</span>
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <h4 class="font-extrabold text-amber-950 text-xs uppercase tracking-wider">Firebase Realtime Database Inactive / Offline</h4>
                  <span class="px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 text-[10px] font-bold">Showing Local Device Data</span>
                </div>
                <p class="text-amber-800 text-[11px] leading-relaxed">
                  Firebase error: <em>${data.errorMsg || 'Database deactivated'}</em>.
                  Showing registered units and posters saved on this browser.
                </p>
                <div class="pt-1 text-[11px] text-amber-900 bg-amber-100/70 p-2.5 rounded-xl border border-amber-200/60 font-medium">
                  <strong>To enable global live cloud sync across all users:</strong><br/>
                  1. Go to <a href="https://console.firebase.google.com/project/asdf-1f4f7/database" target="_blank" class="underline font-bold text-amber-950">Firebase Console (asdf-1f4f7)</a><br/>
                  2. Select <strong>Realtime Database</strong> & click <strong>Enable / Activate Database</strong><br/>
                  3. In <strong>Rules</strong> tab, set: <code class="font-mono text-[10px] bg-white/80 px-1 py-0.5 rounded text-slate-800">{ ".read": true, ".write": true }</code>
                </div>
              </div>
            </div>
          `;
        } else {
          dbStatusBanner.className = 'block p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs shadow-xs';
          dbStatusBanner.innerHTML = `
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span class="font-bold">Live Cloud Sync Connected:</span>
              <span class="text-emerald-700">Real-time updates active from Firebase Database.</span>
            </div>
          `;
        }
      }

      renderUnits();
    }, (error) => {
      console.warn('Firebase Subscription Notice:', error);
      if (loadingState) loadingState.classList.add('hidden');
    });
  }

  function checkAuthAndInit() {
    if (isAuthenticated()) {
      if (loginOverlay) loginOverlay.classList.add('hidden');
      initSubscription();
    } else {
      if (loginOverlay) loginOverlay.classList.remove('hidden');
    }
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const enteredId = (loginUserId.value || '').trim();
      const enteredPass = (loginPassword.value || '').trim();

      if (enteredId === ADMIN_USER_ID && enteredPass === ADMIN_PASSWORD) {
        if (loginError) loginError.classList.add('hidden');
        setAuthenticated(true);
        if (loginOverlay) loginOverlay.classList.add('hidden');
        initSubscription();
      } else {
        if (loginError) {
          loginError.textContent = '❌ Invalid User ID or Password';
          loginError.classList.remove('hidden');
        }
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      setAuthenticated(false);
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      if (loginUserId) loginUserId.value = '';
      if (loginPassword) loginPassword.value = '';
      if (loginError) loginError.classList.add('hidden');
      if (loginOverlay) loginOverlay.classList.remove('hidden');
    });
  }

  checkAuthAndInit();

  // Search input event
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentFilter = e.target.value;
      renderUnits();
    });
  }

  // Sort select event
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      renderUnits();
    });
  }

  // Refresh button
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      if (!isAuthenticated()) return;
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      initSubscription();
    });
  }
});
