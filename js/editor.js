/**
 * SSF Membership Studio - Core Interactive Canvas Editor Engine
 * Updated with official SSF 2026 Frame PNG & Dynamic Footer Styling
 * (Line 1: SSF [Cooper Black] + Unit Name [Sora Regular], Line 2: Student Centre [Sora Light])
 */

import { ImageProcessor } from './filters.js';

export class CanvasEditor {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');

    // Official HD Frame Dimensions (3:4 Aspect Ratio, 1536 x 2048 HD resolution)
    this.exportWidth = options.exportWidth || 1536;
    this.exportHeight = options.exportHeight || 2048;

    // Viewport scale factor
    this.viewportScale = 1;

    // Photo object & transform state
    this.photo = null;
    this.photoState = {
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      flipH: false,
      flipV: false
    };

    // Footer position & scale state (user adjustable & persisted)
    this.footerState = {
      x: options.footerX || 0,
      y: options.footerY || 0,
      scale: options.footerScale || 1.0,
      align: options.footerAlign || 'left'
    };

    // Image adjustment values (10 parameters)
    this.adjustments = {
      exposure: 0,
      contrast: 0,
      highlights: 0,
      shadows: 0,
      whites: 0,
      blacks: 0,
      temperature: 0,
      tint: 0,
      vibrance: 0,
      saturation: 0
    };

    this.activeFilterId = 'original';

    // Unit configuration details
    this.config = {
      unitName: 'Malappuram East',
      studentCentre: 'District Committee, Students Centre, Manjeri',
      frameStyle: 'official'
    };

    // Exact Transparent Stamp Cutout Box (Relative 0 to 1)
    this.photoSlot = {
      x: 0.1484,
      y: 0.3545,
      width: 0.7109,
      height: 0.3936
    };

    // Frame PNG image assets
    this.frameImage = null;
    this.isFrameLoaded = false;
    this.loadDefaultFrame();

    // Touch gesture tracking variables
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.initialPhotoPos = { x: 0, y: 0 };
    this.initialTouchDist = 0;
    this.initialScale = 1;
    this.initialTouchAngle = 0;
    this.initialRotation = 0;

    // Callbacks
    this.onTransformChange = options.onTransformChange || null;
    this.onFooterChange = options.onFooterChange || null;

    this.initGestures();
  }

  /**
   * Load Default Official SSF Frame PNG
   */
  loadDefaultFrame() {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.frameImage = img;
      this.isFrameLoaded = true;
      this.render();
    };
    img.onerror = () => {
      console.warn('Could not load assets/frame.png, falling back to backup renderer');
      this.isFrameLoaded = false;
      this.render();
    };
    img.src = './assets/frame.png';
  }

  /**
   * Set user configuration & footer state
   */
  setConfig(config) {
    this.config = { ...this.config, ...config };
    if (config.footerX !== undefined) this.footerState.x = config.footerX;
    if (config.footerY !== undefined) this.footerState.y = config.footerY;
    if (config.footerScale !== undefined) this.footerState.scale = config.footerScale;
    if (config.footerAlign !== undefined) this.footerState.align = config.footerAlign;
    this.render();
  }

  /**
   * Set Footer Position & Scale State
   */
  setFooterState(state) {
    this.footerState = { ...this.footerState, ...state };
    this.render();
    if (this.onFooterChange) this.onFooterChange(this.footerState);
  }

  /**
   * Load custom frame PNG image
   */
  loadCustomFrame(imageSource) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.frameImage = img;
        this.isFrameLoaded = true;
        this.config.frameStyle = 'custom';
        this.render();
        resolve();
      };
      img.onerror = reject;
      img.src = imageSource;
    });
  }

  /**
   * Load User Photo into canvas editor
   */
  loadPhoto(imageSource) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.photo = img;
        this.autoFitPhoto();
        this.render();
        resolve();
      };
      img.onerror = reject;
      if (typeof imageSource === 'string') {
        img.src = imageSource;
      } else if (imageSource instanceof File || imageSource instanceof Blob) {
        img.src = URL.createObjectURL(imageSource);
      }
    });
  }

  /**
   * Automatically calculate scale & center position to cover the stamp slot seamlessly
   */
  autoFitPhoto() {
    if (!this.photo) return;

    const slotPixelWidth = this.exportWidth * this.photoSlot.width;
    const slotPixelHeight = this.exportHeight * this.photoSlot.height;

    const scaleX = slotPixelWidth / this.photo.width;
    const scaleY = slotPixelHeight / this.photo.height;

    const autoScale = Math.max(scaleX, scaleY);

    this.photoState = {
      x: 0,
      y: 0,
      scale: autoScale,
      rotation: 0,
      flipH: false,
      flipV: false
    };

    if (this.onTransformChange) this.onTransformChange(this.photoState);
  }

  /**
   * Reset Photo position & adjustments
   */
  resetAll() {
    this.adjustments = { exposure: 0, contrast: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0, temperature: 0, tint: 0, vibrance: 0, saturation: 0 };
    this.activeFilterId = 'original';
    this.autoFitPhoto();
    this.render();
  }

  /**
   * Update photo adjustments
   */
  setAdjustments(adj) {
    this.adjustments = { ...this.adjustments, ...adj };
    this.render();
  }

  /**
   * Set photo position / rotation / scale directly
   */
  setPhotoState(state) {
    this.photoState = { ...this.photoState, ...state };
    this.render();
    if (this.onTransformChange) this.onTransformChange(this.photoState);
  }

  /**
   * Main Render Pipeline
   */
  render() {
    if (!this.ctx) return;

    const width = this.exportWidth;
    const height = this.exportHeight;

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    // 1. Clear background (Cream background matching official poster frame)
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = '#FAF7E6';
    this.ctx.fillRect(0, 0, width, height);

    // Slot Center Coordinates
    const slotCenterX = (this.photoSlot.x + this.photoSlot.width / 2) * width;
    const slotCenterY = (this.photoSlot.y + this.photoSlot.height / 2) * height;
    const slotW = this.photoSlot.width * width;
    const slotH = this.photoSlot.height * height;

    // 2. Render User Photo
    if (this.photo) {
      this.ctx.save();

      // Clip photo to stamp slot area
      this.ctx.beginPath();
      this.ctx.rect(
        this.photoSlot.x * width,
        this.photoSlot.y * height,
        slotW,
        slotH
      );
      this.ctx.clip();

      const finalX = slotCenterX + this.photoState.x;
      const finalY = slotCenterY + this.photoState.y;

      this.ctx.translate(finalX, finalY);
      this.ctx.rotate((this.photoState.rotation * Math.PI) / 180);
      this.ctx.scale(
        this.photoState.scale * (this.photoState.flipH ? -1 : 1),
        this.photoState.scale * (this.photoState.flipV ? -1 : 1)
      );

      // Apply Filter adjustments
      const filterStr = ImageProcessor.getCssFilterString(this.adjustments);
      this.ctx.filter = filterStr;

      const drawX = -this.photo.width / 2;
      const drawY = -this.photo.height / 2;
      this.ctx.drawImage(this.photo, drawX, drawY);

      this.ctx.filter = 'none';
      this.ctx.restore();

      // Soft adjustments pass
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(this.photoSlot.x * width, this.photoSlot.y * height, slotW, slotH);
      this.ctx.clip();
      ImageProcessor.applyCanvasAdjustments(this.ctx, width, height, this.adjustments);
      this.ctx.restore();

    } else {
      this.renderEmptyPhotoSlot(slotCenterX, slotCenterY, slotW, slotH);
    }

    // 3. Render SSF Frame Overlay Layer (Official Frame PNG on top)
    if (this.isFrameLoaded && this.frameImage) {
      this.ctx.drawImage(this.frameImage, 0, 0, width, height);
    }

    // 4. Render Dynamic Footer Text Layer (No background box! Clean text overlay)
    this.renderDynamicFooter(width, height);
  }

  /**
   * Render Empty Photo Placeholder Graphic inside stamp cutout
   */
  renderEmptyPhotoSlot(centerX, centerY, w, h) {
    this.ctx.save();
    
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(centerX - w/2, centerY - h/2, w, h);

    this.ctx.strokeStyle = 'rgba(128, 0, 0, 0.3)';
    this.ctx.lineWidth = 4;
    this.ctx.setLineDash([12, 12]);
    this.ctx.strokeRect(centerX - w/2 + 20, centerY - h/2 + 20, w - 40, h - 40);

    this.ctx.fillStyle = '#8B0000';
    this.ctx.font = 'bold 54px Outfit, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('📷', centerX, centerY - 45);

    this.ctx.fillStyle = '#8B0000';
    this.ctx.font = 'bold 36px Outfit, "Noto Sans Malayalam", sans-serif';
    this.ctx.fillText('ADD YOUR PHOTO', centerX, centerY + 20);

    this.ctx.fillStyle = '#555555';
    this.ctx.font = '24px Inter, sans-serif';
    this.ctx.fillText('Tap below to select photo from gallery', centerX, centerY + 65);

    this.ctx.restore();
  }

  /**
   * Render Dynamic Footer Text (Clean text with exact Cooper Black + Sora fonts, NO background box)
   */
  renderDynamicFooter(width, height) {
    this.ctx.save();

    // Default Position (Bottom-Left matching reference image: ~13% left, ~86.5% top)
    const baseLeft = width * 0.13;
    const baseTop = height * 0.865;

    // Apply user sliders: X offset, Y offset, Scale
    const posX = baseLeft + (this.footerState.x || 0);
    const posY = baseTop + (this.footerState.y || 0);
    const scale = this.footerState.scale || 1.0;

    this.ctx.translate(posX, posY);
    this.ctx.scale(scale, scale);

    const align = this.footerState.align || 'left';
    this.ctx.textAlign = align;

    // Text Values
    const unitText = (this.config.unitName || 'Malappuram East').trim();
    const centreText = (this.config.studentCentre || 'District Committee, Students Centre, Manjeri').trim();

    // Font Sizes (Scalable HD resolution base)
    const ssfFontSize = 48;
    const unitFontSize = 44;
    const centreFontSize = 32;

    const fontColor = '#111827'; // Dark Charcoal / Black matching reference

    // ----------------------------------------------------
    // LINE 1: "SSF " (Cooper Black) + Unit Name (Sora Regular / SemiBold)
    // ----------------------------------------------------
    this.ctx.textBaseline = 'alphabetic';

    // 1A. Draw "SSF" in Cooper Black / heavy bold
    const ssfFontStr = `900 ${ssfFontSize}px "Cooper Black", "COOPBL", "Outfit", sans-serif`;
    this.ctx.font = ssfFontStr;
    this.ctx.fillStyle = fontColor;

    let currentX = 0;
    if (align === 'center') {
      currentX = 0; // For center alignment, calculate total width
    } else if (align === 'right') {
      currentX = 0;
    }

    if (align === 'left') {
      this.ctx.fillText('SSF ', currentX, 0);
      const ssfMetrics = this.ctx.measureText('SSF ');
      currentX += ssfMetrics.width;

      // 1B. Draw Unit Name right after "SSF " in Sora Regular / SemiBold
      this.ctx.font = `600 ${unitFontSize}px "Sora", "Noto Sans Malayalam", sans-serif`;
      this.ctx.fillStyle = fontColor;
      this.ctx.fillText(unitText, currentX, 0);

    } else {
      // For centered or right alignment
      this.ctx.font = `600 ${unitFontSize}px "Sora", "Noto Sans Malayalam", sans-serif`;
      this.ctx.fillStyle = fontColor;
      this.ctx.fillText(`SSF ${unitText}`, 0, 0);
    }

    // ----------------------------------------------------
    // LINE 2: Student Centre Name (Sora Light)
    // ----------------------------------------------------
    const line2Y = 46; // Spacing below Line 1
    this.ctx.font = `300 ${centreFontSize}px "Sora", "Noto Sans Malayalam", sans-serif`;
    this.ctx.fillStyle = '#374151'; // Dark Slate / Charcoal for Light text

    this.ctx.fillText(centreText, 0, line2Y);

    this.ctx.restore();
  }

  /**
   * Initialize Touch & Mouse Gestures for photo interaction
   */
  initGestures() {
    const getPointerPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * (this.exportWidth / rect.width),
        y: (clientY - rect.top) * (this.exportHeight / rect.height)
      };
    };

    // Touch Start
    this.canvas.addEventListener('touchstart', (e) => {
      if (!this.photo) return;
      e.preventDefault();

      if (e.touches.length === 1) {
        this.isDragging = true;
        const pos = getPointerPos(e);
        this.dragStart = pos;
        this.initialPhotoPos = { x: this.photoState.x, y: this.photoState.y };
      } else if (e.touches.length === 2) {
        this.isDragging = false;
        const t1 = e.touches[0];
        const t2 = e.touches[1];

        const dx = t2.clientX - t1.clientX;
        const dy = t2.clientY - t1.clientY;
        this.initialTouchDist = Math.hypot(dx, dy);
        this.initialScale = this.photoState.scale;

        this.initialTouchAngle = Math.atan2(dy, dx) * (180 / Math.PI);
        this.initialRotation = this.photoState.rotation;
      }
    }, { passive: false });

    // Touch Move
    this.canvas.addEventListener('touchmove', (e) => {
      if (!this.photo) return;
      e.preventDefault();

      if (e.touches.length === 1 && this.isDragging) {
        const pos = getPointerPos(e);
        const deltaX = pos.x - this.dragStart.x;
        const deltaY = pos.y - this.dragStart.y;

        this.photoState.x = this.initialPhotoPos.x + deltaX;
        this.photoState.y = this.initialPhotoPos.y + deltaY;

        this.render();
        if (this.onTransformChange) this.onTransformChange(this.photoState);

      } else if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];

        const dx = t2.clientX - t1.clientX;
        const dy = t2.clientY - t1.clientY;
        const dist = Math.hypot(dx, dy);

        if (this.initialTouchDist > 0) {
          const scaleFactor = dist / this.initialTouchDist;
          this.photoState.scale = Math.max(0.1, Math.min(5, this.initialScale * scaleFactor));
        }

        const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI);
        const angleDiff = currentAngle - this.initialTouchAngle;
        this.photoState.rotation = (this.initialRotation + angleDiff) % 360;

        this.render();
        if (this.onTransformChange) this.onTransformChange(this.photoState);
      }
    }, { passive: false });

    const handleTouchEnd = (e) => {
      this.isDragging = false;
      if (e.touches && e.touches.length === 1) {
        this.isDragging = true;
        const pos = getPointerPos(e);
        this.dragStart = pos;
        this.initialPhotoPos = { x: this.photoState.x, y: this.photoState.y };
      }
    };
    this.canvas.addEventListener('touchend', handleTouchEnd);
    this.canvas.addEventListener('touchcancel', handleTouchEnd);

    // Mouse Dragging for Desktop
    this.canvas.addEventListener('mousedown', (e) => {
      if (!this.photo) return;
      this.isDragging = true;
      const pos = getPointerPos(e);
      this.dragStart = pos;
      this.initialPhotoPos = { x: this.photoState.x, y: this.photoState.y };
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging || !this.photo) return;
      const pos = getPointerPos(e);
      const deltaX = pos.x - this.dragStart.x;
      const deltaY = pos.y - this.dragStart.y;

      this.photoState.x = this.initialPhotoPos.x + deltaX;
      this.photoState.y = this.initialPhotoPos.y + deltaY;

      this.render();
      if (this.onTransformChange) this.onTransformChange(this.photoState);
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Mouse Wheel Zoom
    this.canvas.addEventListener('wheel', (e) => {
      if (!this.photo) return;
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      this.photoState.scale = Math.max(0.1, Math.min(5, this.photoState.scale * zoomFactor));
      this.render();
      if (this.onTransformChange) this.onTransformChange(this.photoState);
    }, { passive: false });
  }

  /**
   * Export Full High Resolution HD Data URL or Canvas Blob
   */
  exportHDCanvas(scaleFactor = 1.5) {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = this.exportWidth * scaleFactor;
    exportCanvas.height = this.exportHeight * scaleFactor;

    const hdEditor = new CanvasEditor(exportCanvas, {
      exportWidth: exportCanvas.width,
      exportHeight: exportCanvas.height
    });

    hdEditor.config = { ...this.config };
    hdEditor.photo = this.photo;
    hdEditor.frameImage = this.frameImage;
    hdEditor.isFrameLoaded = this.isFrameLoaded;
    hdEditor.adjustments = { ...this.adjustments };
    hdEditor.activeFilterId = this.activeFilterId;
    hdEditor.footerState = { ...this.footerState };

    hdEditor.photoState = {
      x: this.photoState.x * scaleFactor,
      y: this.photoState.y * scaleFactor,
      scale: this.photoState.scale * scaleFactor,
      rotation: this.photoState.rotation,
      flipH: this.photoState.flipH,
      flipV: this.photoState.flipV
    };

    hdEditor.render();

    return exportCanvas;
  }
}
