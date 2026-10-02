/**
 * SSF Membership Studio - Main Application Controller (Mobile App UI)
 * Fully interactive with Adobe Camera Raw-inspired adjustment panel:
 * LIGHT: Exposure, Contrast, Highlights, Shadows, Whites, Blacks
 * COLOR: Temperature, Tint, Vibrance, Saturation
 * Real-time canvas processing, Compare Before/After, Reset All, and Individual Resets
 */

import { Storage } from './storage.js';
import { FILTER_PRESETS } from './filters.js';
import { CanvasEditor } from './editor.js';
import { Exporter } from './export.js';
import { registerUnit, trackPosterCreated } from './firebase.js';

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const canvasEl = document.getElementById('frameCanvas');
  const setupModal = document.getElementById('setupModal');
  const setupForm = document.getElementById('setupForm');
  const setupUnitInput = document.getElementById('setupUnitInput');
  const setupCentreInput = document.getElementById('setupCentreInput');

  const settingsSheet = document.getElementById('settingsSheet');
  const settingsForm = document.getElementById('settingsForm');
  const settingsUnitInput = document.getElementById('settingsUnitInput');
  const settingsCentreInput = document.getElementById('settingsCentreInput');
  const openSettingsBtn = document.getElementById('openSettingsBtn');
  const clearDataBtn = document.getElementById('clearDataBtn');

  const previewModal = document.getElementById('previewModal');
  const previewCanvasImg = document.getElementById('previewCanvasImg');
  const closePreviewBtn = document.getElementById('closePreviewBtn');

  const photoFileInput = document.getElementById('photoFileInput');
  const cameraFileInput = document.getElementById('cameraFileInput');

  const uploadBtn = document.getElementById('uploadBtn');
  const modalUploadBtn = document.getElementById('modalUploadBtn');
  const modalCameraBtn = document.getElementById('modalCameraBtn');

  // Main Screen & Modal Download/Share Buttons
  const mainDownloadBtn = document.getElementById('mainDownloadBtn');
  const mainShareBtn = document.getElementById('mainShareBtn');
  const modalDownloadBtn = document.getElementById('modalDownloadBtn');
  const modalShareBtn = document.getElementById('modalShareBtn');
  const modalCopyCaptionBtn = document.getElementById('modalCopyCaptionBtn');

  const resetTransformBtn = document.getElementById('resetTransformBtn');

  // 10 Camera Raw Adjustment Sliders
  const sliderIds = [
    'exposure', 'contrast', 'highlights', 'shadows', 
    'whites', 'blacks', 'temperature', 'tint', 'vibrance', 'saturation'
  ];
  const sliders = {};
  const valDisplays = {};

  sliderIds.forEach(id => {
    sliders[id] = document.getElementById(`${id}Slider`);
    valDisplays[id] = document.getElementById(`${id}Val`);
  });

  // Adjust Sheet Action Buttons
  const resetAdjustmentsBtn = document.getElementById('resetAdjustmentsBtn');
  const compareBtn = document.getElementById('compareBtn');
  const compareBtnText = document.getElementById('compareBtnText');
  const adjustDoneBtn = document.getElementById('adjustDoneBtn');
  const sliderResetBtns = document.querySelectorAll('.slider-reset-btn');

  // Footer Sliders in Settings Sheet
  const footerXSlider = document.getElementById('footerXSlider');
  const footerYSlider = document.getElementById('footerYSlider');
  const footerScaleSlider = document.getElementById('footerScaleSlider');
  const footerXVal = document.getElementById('footerXVal');
  const footerYVal = document.getElementById('footerYVal');
  const footerScaleVal = document.getElementById('footerScaleVal');

  const footerAlignLeftBtn = document.getElementById('footerAlignLeftBtn');
  const footerAlignCenterBtn = document.getElementById('footerAlignCenterBtn');
  const footerAlignRightBtn = document.getElementById('footerAlignRightBtn');

  const filterCardsContainer = document.getElementById('filterCardsContainer');

  // Bottom Navigation Buttons & Bottom Sheets
  const navBtns = document.querySelectorAll('.nav-btn');
  const bottomSheets = document.querySelectorAll('.bottom-sheet');
  const closeSheetBtns = document.querySelectorAll('.close-sheet-btn');

  // Toast Element
  const toast = document.getElementById('toast');

  // Initialize Local Config from Storage
  let config = Storage.getConfig();

  // Initialize Canvas Editor Instance with stored config
  const editor = new CanvasEditor(canvasEl, {
    footerX: config.footerX,
    footerY: config.footerY,
    footerScale: config.footerScale,
    footerAlign: config.footerAlign
  });

  // Apply configuration to editor
  editor.setConfig(config);

  // Ensure canvas re-renders once custom fonts (CooperBlack, Sora) are fully loaded by browser
  if (document.fonts) {
    document.fonts.ready.then(() => {
      editor.render();
    });
  }

  // Sync Footer sliders with current state
  function syncFooterSliderValues() {
    if (footerXSlider) footerXSlider.value = editor.footerState.x;
    if (footerYSlider) footerYSlider.value = editor.footerState.y;
    if (footerScaleSlider) footerScaleSlider.value = Math.round(editor.footerState.scale * 100);

    if (footerXVal) footerXVal.textContent = editor.footerState.x;
    if (footerYVal) footerYVal.textContent = editor.footerState.y;
    if (footerScaleVal) footerScaleVal.textContent = `${Math.round(editor.footerState.scale * 100)}%`;
  }

  syncFooterSliderValues();

  // 1. First-Time Setup Onboarding Flow
  if (!Storage.isOnboarded()) {
    showSetupModal();
  } else {
    hideSetupModal();
    if (config.unitName) {
      registerUnit(config.unitName, config.studentCentre);
    }
  }

  function showSetupModal() {
    setupUnitInput.value = config.unitName || '';
    setupCentreInput.value = config.studentCentre || 'Unit Committee, Students Centre,';
    setupModal.classList.remove('hidden');
    setupModal.classList.add('flex');
  }

  function hideSetupModal() {
    setupModal.classList.add('hidden');
    setupModal.classList.remove('flex');
  }

  setupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const unit = setupUnitInput.value.trim();
    const centre = setupCentreInput.value.trim();

    if (!unit) {
      showToast('Please enter your Unit Name');
      return;
    }

    Storage.saveConfig(unit, centre || 'Unit Committee, Students Centre,', editor.footerState);
    config = Storage.getConfig();
    editor.setConfig(config);
    registerUnit(unit, centre || 'Unit Committee, Students Centre,');
    hideSetupModal();
    showToast('✨ Unit setup saved!');
  });

  // 2. Bottom Sheet Management
  function closeAllSheets() {
    bottomSheets.forEach(sheet => {
      sheet.classList.add('translate-y-full');
    });

    navBtns.forEach(btn => {
      btn.classList.remove('bg-red-600', 'text-white', 'shadow-md', 'font-extrabold');
      btn.classList.add('text-slate-400', 'font-semibold');
    });
  }

  function openSheet(sheetId, targetBtn) {
    closeAllSheets();
    const targetSheet = document.getElementById(sheetId);
    if (targetSheet) {
      targetSheet.classList.remove('translate-y-full');
    }

    if (targetBtn) {
      targetBtn.classList.remove('text-slate-400', 'font-semibold');
      targetBtn.classList.add('bg-red-600', 'text-white', 'shadow-md', 'font-extrabold');
    }
  }

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const sheetId = btn.dataset.sheet;
      openSheet(sheetId, btn);
      if (sheetId === 'settingsSheet') {
        settingsUnitInput.value = config.unitName;
        settingsCentreInput.value = config.studentCentre;
        syncFooterSliderValues();
      }
    });
  });

  closeSheetBtns.forEach(btn => {
    btn.addEventListener('click', closeAllSheets);
  });

  if (adjustDoneBtn) {
    adjustDoneBtn.addEventListener('click', closeAllSheets);
  }

  if (openSettingsBtn) {
    openSettingsBtn.addEventListener('click', () => {
      settingsUnitInput.value = config.unitName;
      settingsCentreInput.value = config.studentCentre;
      syncFooterSliderValues();
      openSheet('settingsSheet', document.querySelector('[data-sheet="settingsSheet"]'));
    });
  }

  // Save Settings & Footer Position locally to localStorage
  settingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const unit = settingsUnitInput.value.trim();
    const centre = settingsCentreInput.value.trim();

    Storage.saveConfig(unit, centre, editor.footerState);
    config = Storage.getConfig();
    editor.setConfig(config);
    registerUnit(unit, centre);

    closeAllSheets();
    showToast('✅ Settings & Footer position saved!');
  });

  if (clearDataBtn) {
    clearDataBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all saved details?')) {
        Storage.clearAll();
        config = Storage.getConfig();
        editor.setConfig(config);
        closeAllSheets();
        showSetupModal();
        showToast('Storage reset');
      }
    });
  }

  // 3. Photo Upload & Camera Handling
  function handlePhotoUpload(file) {
    if (!file) return;
    showToast('Loading photo...');
    editor.loadPhoto(file).then(() => {
      showToast('Photo added! Tap Adjust to fine-tune.');
      closeAllSheets();
    }).catch(err => {
      console.error(err);
      showToast('Error loading image. Please try another.');
    });
  }

  if (uploadBtn) uploadBtn.addEventListener('click', () => photoFileInput.click());
  if (modalUploadBtn) modalUploadBtn.addEventListener('click', () => photoFileInput.click());
  if (modalCameraBtn) modalCameraBtn.addEventListener('click', () => cameraFileInput.click());

  photoFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) handlePhotoUpload(e.target.files[0]);
  });

  cameraFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) handlePhotoUpload(e.target.files[0]);
  });

  // 4. Photo Transform Reset
  if (resetTransformBtn) {
    resetTransformBtn.addEventListener('click', () => {
      editor.autoFitPhoto();
      editor.render();
      showToast('Position reset');
    });
  }

  // 5. Adobe Camera Raw-style Precision Photo Adjustments
  function formatValueDisplay(id, val) {
    const displayEl = valDisplays[id];
    if (!displayEl) return;

    if (val > 0) {
      displayEl.textContent = `+${val}`;
      displayEl.className = 'font-mono font-bold text-red-600 text-xs w-10 text-right';
    } else if (val < 0) {
      displayEl.textContent = `${val}`;
      displayEl.className = 'font-mono font-bold text-red-600 text-xs w-10 text-right';
    } else {
      displayEl.textContent = '0';
      displayEl.className = 'font-mono font-bold text-slate-600 text-xs w-10 text-right';
    }

    // Toggle individual reset button
    const resetBtn = document.querySelector(`[data-reset="${id}"]`);
    if (resetBtn) {
      if (val !== 0) {
        resetBtn.classList.remove('opacity-0', 'pointer-events-none');
        resetBtn.classList.add('opacity-100', 'pointer-events-auto');
      } else {
        resetBtn.classList.add('opacity-0', 'pointer-events-none');
        resetBtn.classList.remove('opacity-100', 'pointer-events-auto');
      }
    }
  }

  function updateAdjustmentsFromSliders(isInteractive = true) {
    const adj = {};
    sliderIds.forEach(id => {
      if (sliders[id]) {
        const val = parseInt(sliders[id].value, 10);
        adj[id] = val;
        formatValueDisplay(id, val);
      }
    });
    editor.setAdjustments(adj, isInteractive);
  }

  // Calculate thumb center position on slider track
  function getSliderThumbX(slider) {
    const rect = slider.getBoundingClientRect();
    const min = parseFloat(slider.min) || -100;
    const max = parseFloat(slider.max) || 100;
    const val = parseFloat(slider.value) || 0;
    const ratio = Math.max(0, Math.min(1, (val - min) / (max - min)));
    const thumbWidth = 18;
    return rect.left + (thumbWidth / 2) + ratio * (rect.width - thumbWidth);
  }

  // Bind live slider events with touch-guard (only adjust when pressing & dragging circle dot)
  sliderIds.forEach(id => {
    const slider = sliders[id];
    if (!slider) return;

    let isThumbActive = false;
    let startVal = parseFloat(slider.value) || 0;
    let startX = 0;
    let startY = 0;

    // Detect touch specifically on circle dot (thumb)
    slider.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches[0]) {
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        startVal = parseFloat(slider.value) || 0;

        const thumbX = getSliderThumbX(slider);
        const dist = Math.abs(touch.clientX - thumbX);

        // Generous 28px radius target for thumb (56px touch zone)
        if (dist <= 28) {
          isThumbActive = true;
        } else {
          // Touched track outside thumb: do not activate slider, treat as scroll gesture
          isThumbActive = false;
        }
      }
    }, { passive: true });

    slider.addEventListener('touchmove', (e) => {
      if (isThumbActive && e.touches && e.touches[0]) {
        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - startX);
        const deltaY = Math.abs(touch.clientY - startY);

        // If user starts scrolling vertically, cancel slider drag immediately and restore value
        if (deltaY > deltaX && deltaY > 8) {
          isThumbActive = false;
          slider.value = startVal;
          formatValueDisplay(id, startVal);
          updateAdjustmentsFromSliders(false);
        }
      }
    }, { passive: true });

    const handleTouchEnd = () => {
      if (isThumbActive) {
        isThumbActive = false;
        updateAdjustmentsFromSliders(false);
      }
    };
    slider.addEventListener('touchend', handleTouchEnd, { passive: true });
    slider.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    // Live input event
    slider.addEventListener('input', () => {
      // If on touch device and thumb wasn't specifically grabbed, revert accidental jump
      if (window.matchMedia('(pointer: coarse)').matches && !isThumbActive) {
        slider.value = startVal;
        return;
      }
      updateAdjustmentsFromSliders(true);
    });

    // High-quality pass on slider release
    slider.addEventListener('change', () => {
      updateAdjustmentsFromSliders(false);
    });

    // Double-click to reset single slider
    slider.addEventListener('dblclick', () => {
      slider.value = 0;
      updateAdjustmentsFromSliders(false);
    });
  });

  // Individual slider reset buttons
  sliderResetBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.reset;
      if (sliders[id]) {
        sliders[id].value = 0;
        updateAdjustmentsFromSliders(false);
      }
    });
  });

  // Reset All Button
  if (resetAdjustmentsBtn) {
    resetAdjustmentsBtn.addEventListener('click', () => {
      sliderIds.forEach(id => {
        if (sliders[id]) sliders[id].value = 0;
        formatValueDisplay(id, 0);
      });
      editor.setAdjustments({
        exposure: 0, contrast: 0, highlights: 0, shadows: 0,
        whites: 0, blacks: 0, temperature: 0, tint: 0, vibrance: 0, saturation: 0
      }, false);
      renderPresetFilterCards();
      showToast('All adjustments reset to default');
    });
  }

  // Before / After Compare Toggle & Hold
  let isComparing = false;

  function startCompare() {
    isComparing = true;
    editor.setShowingBefore(true);
    if (compareBtn) {
      compareBtn.classList.add('bg-red-600', 'text-white', 'border-red-600');
      compareBtn.classList.remove('bg-stone-200/70', 'text-slate-800');
    }
    if (compareBtnText) compareBtnText.textContent = 'Original';
  }

  function stopCompare() {
    if (!isComparing) return;
    isComparing = false;
    editor.setShowingBefore(false);
    if (compareBtn) {
      compareBtn.classList.remove('bg-red-600', 'text-white', 'border-red-600');
      compareBtn.classList.add('bg-stone-200/70', 'text-slate-800');
    }
    if (compareBtnText) compareBtnText.textContent = 'Compare';
  }

  if (compareBtn) {
    // Hold to compare on Desktop & Mobile
    compareBtn.addEventListener('mousedown', startCompare);
    window.addEventListener('mouseup', stopCompare);
    compareBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      startCompare();
    }, { passive: false });
    window.addEventListener('touchend', stopCompare);
    window.addEventListener('touchcancel', stopCompare);
  }

  // Footer Sliders in Settings Sheet
  if (footerXSlider) {
    footerXSlider.addEventListener('input', (e) => {
      const x = parseInt(e.target.value, 10);
      if (footerXVal) footerXVal.textContent = x;
      editor.setFooterState({ x });
      Storage.saveFooterPosition(x, editor.footerState.y, editor.footerState.scale, editor.footerState.align);
    });
  }

  if (footerYSlider) {
    footerYSlider.addEventListener('input', (e) => {
      const y = parseInt(e.target.value, 10);
      if (footerYVal) footerYVal.textContent = y;
      editor.setFooterState({ y });
      Storage.saveFooterPosition(editor.footerState.x, y, editor.footerState.scale, editor.footerState.align);
    });
  }

  if (footerScaleSlider) {
    footerScaleSlider.addEventListener('input', (e) => {
      const scale = parseFloat(e.target.value) / 100;
      if (footerScaleVal) footerScaleVal.textContent = `${e.target.value}%`;
      editor.setFooterState({ scale });
      Storage.saveFooterPosition(editor.footerState.x, editor.footerState.y, scale, editor.footerState.align);
    });
  }

  if (footerAlignLeftBtn) {
    footerAlignLeftBtn.addEventListener('click', () => {
      editor.setFooterState({ align: 'left' });
      Storage.saveFooterPosition(editor.footerState.x, editor.footerState.y, editor.footerState.scale, 'left');
      showToast('Footer alignment: Left');
    });
  }

  if (footerAlignCenterBtn) {
    footerAlignCenterBtn.addEventListener('click', () => {
      editor.setFooterState({ align: 'center' });
      Storage.saveFooterPosition(editor.footerState.x, editor.footerState.y, editor.footerState.scale, 'center');
      showToast('Footer alignment: Center');
    });
  }

  if (footerAlignRightBtn) {
    footerAlignRightBtn.addEventListener('click', () => {
      editor.setFooterState({ align: 'right' });
      Storage.saveFooterPosition(editor.footerState.x, editor.footerState.y, editor.footerState.scale, 'right');
      showToast('Footer alignment: Right');
    });
  }

  // 6. Filter Preset Cards Integration
  function renderPresetFilterCards() {
    if (!filterCardsContainer) return;
    filterCardsContainer.innerHTML = '';

    FILTER_PRESETS.forEach(preset => {
      const card = document.createElement('button');
      card.className = `flex flex-col items-center justify-center p-2 rounded-2xl transition-all border ${
        editor.activeFilterId === preset.id
          ? 'bg-red-50 border-red-500 text-red-600 font-extrabold shadow-sm'
          : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 font-semibold'
      }`;

      card.innerHTML = `
        <span class="text-2xl mb-1">${preset.icon}</span>
        <span class="text-[11px] whitespace-nowrap">${preset.name}</span>
      `;

      card.addEventListener('click', () => {
        editor.activeFilterId = preset.id;
        const adj = preset.adjustments;
        sliderIds.forEach(id => {
          if (sliders[id]) {
            sliders[id].value = adj[id] || 0;
            formatValueDisplay(id, adj[id] || 0);
          }
        });
        editor.setAdjustments(adj, false);
        renderPresetFilterCards();
      });

      filterCardsContainer.appendChild(card);
    });
  }

  renderPresetFilterCards();

  // 7. Download & WhatsApp Share Logic
  function executeDownload() {
    showToast('Exporting HD PNG Image...');
    const hdCanvas = editor.exportHDCanvas(1.0);
    Exporter.downloadHD(hdCanvas, config.unitName);
    trackPosterCreated(config.unitName, config.studentCentre, 'download');
    showToast('✅ Download Started!');
  }

  async function executeWhatsAppShare() {
    showToast('Preparing WhatsApp Share...');
    const hdCanvas = editor.exportHDCanvas(1.0);
    const result = await Exporter.shareToWhatsApp(hdCanvas, config);
    if (result && result.success) {
      trackPosterCreated(config.unitName, config.studentCentre, 'whatsapp');
      showToast('🚀 Ready to share on WhatsApp!');
    }
  }

  async function executeCopyCaption() {
    const ok = await Exporter.copyCaption(config.unitName, config.studentCentre);
    if (ok) {
      showToast('📋 "I\'M IN" caption copied to clipboard!');
    }
  }

  function openPreviewModal() {
    showToast('Generating HD Frame Preview...');
    const hdCanvas = editor.exportHDCanvas(1.0);
    previewCanvasImg.src = hdCanvas.toDataURL('image/png');
    previewModal.classList.remove('hidden');
    previewModal.classList.add('flex');
  }

  if (mainDownloadBtn) mainDownloadBtn.addEventListener('click', executeDownload);
  if (mainShareBtn) mainShareBtn.addEventListener('click', executeWhatsAppShare);

  if (modalDownloadBtn) modalDownloadBtn.addEventListener('click', executeDownload);
  if (modalShareBtn) modalShareBtn.addEventListener('click', executeWhatsAppShare);
  if (modalCopyCaptionBtn) modalCopyCaptionBtn.addEventListener('click', executeCopyCaption);
  if (closePreviewBtn) closePreviewBtn.addEventListener('click', () => {
    previewModal.classList.add('hidden');
    previewModal.classList.remove('flex');
  });

  canvasEl.addEventListener('dblclick', openPreviewModal);

  // 8. Toast Notification Utility
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('-translate-y-20', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');

    setTimeout(() => {
      toast.classList.remove('translate-y-0', 'opacity-100');
      toast.classList.add('-translate-y-20', 'opacity-0');
    }, 3000);
  }

  // 9. Register PWA Service Worker
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('SSF Photo Frame PWA registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('PWA service worker registration failed:', err);
        });
    });
  }
});
