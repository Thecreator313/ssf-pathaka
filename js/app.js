/**
 * SSF Membership Studio - Main Application Controller (Mobile App UI)
 */

import { Storage } from './storage.js';
import { FILTER_PRESETS } from './filters.js';
import { CanvasEditor } from './editor.js';
import { Exporter } from './export.js';

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

  // 10 Photo Adjustment Sliders
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
  }

  function showSetupModal() {
    setupUnitInput.value = config.unitName || '';
    setupCentreInput.value = config.studentCentre || '';
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

    Storage.saveConfig(unit, centre || 'District Committee, Students Centre, Manjeri', editor.footerState);
    config = Storage.getConfig();
    editor.setConfig(config);
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
      showToast('Photo added! Tap Adjust or Filters to style.');
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

  // 4. Photo Reset
  if (resetTransformBtn) {
    resetTransformBtn.addEventListener('click', () => {
      editor.autoFitPhoto();
      editor.render();
      showToast('Position reset');
    });
  }

  // 5. 10 Photo Adjustment Sliders Event Listener
  function updateAdjustmentsFromSliders() {
    const adj = {};
    sliderIds.forEach(id => {
      if (sliders[id]) {
        const val = parseInt(sliders[id].value, 10);
        adj[id] = val;
        if (valDisplays[id]) valDisplays[id].textContent = val;
      }
    });
    editor.setAdjustments(adj);
  }

  sliderIds.forEach(id => {
    if (sliders[id]) {
      sliders[id].addEventListener('input', updateAdjustmentsFromSliders);
    }
  });

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

  // 6. Filter Preset Cards
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
        sliderIds.forEach(id => {
          if (sliders[id]) {
            const val = preset.adjustments[id] || 0;
            sliders[id].value = val;
            if (valDisplays[id]) valDisplays[id].textContent = val;
          }
        });

        updateAdjustmentsFromSliders();
        renderPresetFilterCards();
      });

      filterCardsContainer.appendChild(card);
    });
  }

  renderPresetFilterCards();

  // 7. Download & Share Logic
  function executeDownload() {
    showToast('Exporting HD PNG Image...');
    const hdCanvas = editor.exportHDCanvas(2);
    Exporter.downloadHD(hdCanvas, config.unitName);
    showToast('✅ Download Started!');
  }

  async function executeWhatsAppShare() {
    showToast('Preparing WhatsApp Share...');
    const hdCanvas = editor.exportHDCanvas(2);
    const result = await Exporter.shareToWhatsApp(hdCanvas, config);
    if (result.success) {
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
    const hdCanvas = editor.exportHDCanvas(2);
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
});
