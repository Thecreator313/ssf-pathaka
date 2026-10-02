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

  // Subscribe to real-time updates
  let unsubscribe = null;

  function initSubscription() {
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

      renderUnits();
    }, (error) => {
      console.error('Firebase Subscription Error:', error);
      if (loadingState) {
        loadingState.innerHTML = `
          <div class="text-red-500 font-bold text-xs space-y-2">
            <div>⚠️ Could not connect to Firebase Database.</div>
            <div class="font-normal text-slate-500">Check connection or Realtime Database rules.</div>
            <button id="retryBtn" class="px-3 py-1.5 rounded-xl bg-red-600 text-white font-bold text-xs">Retry</button>
          </div>
        `;
        const retryBtn = document.getElementById('retryBtn');
        if (retryBtn) retryBtn.addEventListener('click', initSubscription);
      }
    });
  }

  initSubscription();

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
      if (unsubscribe) unsubscribe();
      initSubscription();
    });
  }
});
