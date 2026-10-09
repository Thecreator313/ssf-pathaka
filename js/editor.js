/**
 * SSF Membership Studio - Core Interactive Canvas Editor Engine
 * Non-destructive pixel processing with Adobe Camera Raw-inspired controls:
 * LIGHT: Exposure, Contrast, Highlights, Shadows, Whites, Blacks
 * COLOR: Temperature, Tint, Vibrance, Saturation
 *
 * Layer Order:
 * 1. Base Canvas Background (#FAF7E6)
 * 2. User Photo (Canvas pixel processed, transforms applied, clipped to stamp slot)
 * 3. Official Frame PNG Overlay
 * 4. Dynamic SSF Footer (Cooper Black + Sora)
 */

import { ImageProcessor } from './filters.js';

export class CanvasEditor {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');

    // Official HD Frame Dimensions (3:4 Aspect Ratio, 2400 x 3200 HD resolution)
    this.exportWidth = options.exportWidth || 2400;
    this.exportHeight = options.exportHeight || 3200;

    // Viewport scale factor
    this.viewportScale = 1;

    // Original untouched uploaded photo & adjusted offscreen canvas
    this.originalPhoto = null;
    this.photo = null; // Alias for backward compatibility
    this.adjustedPhotoCanvas = null;
    this.isShowingBefore = false;
    this.pendingAdjustRaf = null;

    // Photo transform state
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

    // 10 Camera Raw-inspired adjustments
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
      unitName: '',
      studentCentre: 'Unit Committee, Students Centre,',
      frameStyle: 'official'
    };

    // Exact Transparent Cutout Box for New Frame PNG (Relative 0 to 1)
    this.photoSlot = {
      x: 0.094583,
      y: 0.307812,
      width: 0.792917,
      height: 0.336875
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
   * Load Default Official SSF Frame PNG (with cascading fallbacks)
   */
  loadDefaultFrame() {
    const candidateSources = [
      '/assets/frame.png',
      '/frame.png',
      './assets/frame.png',
      './frame.png',
      'assets/frame.png',
      'frame.png'
    ];

    let index = 0;

    const tryNext = () => {
      if (index >= candidateSources.length) {
        console.warn('Could not load frame PNG from candidate paths');
        this.isFrameLoaded = false;
        this.render();
        return;
      }

      const src = candidateSources[index];
      const img = new Image();

      // Only set crossOrigin for external http(s) domains to prevent CORS blocking on same-origin
      if (src.startsWith('http://') || src.startsWith('https://')) {
        img.crossOrigin = 'anonymous';
      }

      img.onload = () => {
        this.frameImage = img;
        this.isFrameLoaded = true;
        this.render();
      };

      img.onerror = () => {
        index++;
        tryNext();
      };

      img.src = src;
    };

    tryNext();
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
   * Load User Photo into canvas editor (saves pristine original)
   */
  loadPhoto(imageSource) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.originalPhoto = img;
        this.photo = img;
        this.processAdjustmentsSync(false);
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
   * Process adjustments non-destructively onto offscreen canvas
   */
  processAdjustmentsSync(isInteractive = false) {
    if (!this.originalPhoto) return;

    if (!ImageProcessor.hasActiveAdjustments(this.adjustments)) {
      this.adjustedPhotoCanvas = null;
      return;
    }

    // Interactive slider dragging uses 1200px limit for 60fps mobile responsiveness
    const maxDim = isInteractive ? 1200 : 1600;
    this.adjustedPhotoCanvas = ImageProcessor.process(
      this.originalPhoto,
      this.adjustments,
      this.adjustedPhotoCanvas,
      maxDim
    );
  }

  /**
   * Schedule adjustment processing using requestAnimationFrame (smooth 60fps)
   */
  scheduleAdjustmentsProcessing(isInteractive = true) {
    if (this.pendingAdjustRaf) {
      cancelAnimationFrame(this.pendingAdjustRaf);
    }

    this.pendingAdjustRaf = requestAnimationFrame(() => {
      this.processAdjustmentsSync(isInteractive);
      this.render();
      this.pendingAdjustRaf = null;
    });
  }

  /**
   * Toggle Before/After view (temporarily show original untouched photo)
   */
  setShowingBefore(show) {
    this.isShowingBefore = Boolean(show);
    this.render();
  }

  /**
   * Automatically calculate scale & center position to cover the stamp slot seamlessly
   */
  autoFitPhoto() {
    const refPhoto = this.originalPhoto || this.photo;
    if (!refPhoto) return;

    const slotPixelWidth = this.exportWidth * this.photoSlot.width;
    const slotPixelHeight = this.exportHeight * this.photoSlot.height;

    const scaleX = slotPixelWidth / refPhoto.width;
    const scaleY = slotPixelHeight / refPhoto.height;

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
    this.adjustments = {
      exposure: 0, contrast: 0, highlights: 0, shadows: 0,
      whites: 0, blacks: 0, temperature: 0, tint: 0, vibrance: 0, saturation: 0
    };
    this.activeFilterId = 'original';
    this.adjustedPhotoCanvas = null;
    this.isShowingBefore = false;
    this.autoFitPhoto();
    this.render();
  }

  /**
   * Update photo adjustments
   */
  setAdjustments(adj, isInteractive = false) {
    this.adjustments = { ...this.adjustments, ...adj };
    this.scheduleAdjustmentsProcessing(isInteractive);
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

    // 1. Clear background (Warm cream matching official SSF poster)
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = '#FAF7E6';
    this.ctx.fillRect(0, 0, width, height);

    // Slot Center Coordinates
    const slotCenterX = (this.photoSlot.x + this.photoSlot.width / 2) * width;
    const slotCenterY = (this.photoSlot.y + this.photoSlot.height / 2) * height;
    const slotW = this.photoSlot.width * width;
    const slotH = this.photoSlot.height * height;

    // 2. Render User Photo (UNDERNEATH frame, non-destructive canvas pixel processing)
    if (this.originalPhoto) {
      this.ctx.save();

      // Clip strictly to stamp slot area
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

      // Choose whether to render untouched original or adjusted canvas
      const photoToDraw = (!this.isShowingBefore && this.adjustedPhotoCanvas)
        ? this.adjustedPhotoCanvas
        : this.originalPhoto;

      // Compensate scale if working preview canvas has different resolution than original
      const scaleComp = this.originalPhoto.width / photoToDraw.width;
      const finalScale = this.photoState.scale * scaleComp;

      this.ctx.scale(
        finalScale * (this.photoState.flipH ? -1 : 1),
        finalScale * (this.photoState.flipV ? -1 : 1)
      );

      const drawX = -photoToDraw.width / 2;
      const drawY = -photoToDraw.height / 2;
      this.ctx.drawImage(photoToDraw, drawX, drawY);

      this.ctx.restore();

    } else {
      this.renderEmptyPhotoSlot(slotCenterX, slotCenterY, slotW, slotH);
    }

    // 3. Render SSF Frame Overlay Layer (Official Frame PNG OVER the photo)
    if (this.isFrameLoaded && this.frameImage) {
      this.ctx.drawImage(this.frameImage, 0, 0, width, height);
    }

    // 4. Render Dynamic SSF Footer Text (Cooper Black + Sora fonts, NO background box)
    this.renderDynamicFooter(this.ctx, width, height, 1.0);
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
   * Render Dynamic Footer Text
   * LINE 1: "SSF " (Cooper Black) + Unit Name (Sora Regular / SemiBold)
   * LINE 2: Student Centre Name (Sora Light)
   */
  renderDynamicFooter(targetCtx = this.ctx, width = this.exportWidth, height = this.exportHeight, scaleMultiplier = 1.0) {
    targetCtx.save();

    // Default Position (Bottom-Left: ~13% left, ~86.5% top)
    const baseLeft = width * 0.13;
    const baseTop = height * 0.865;

    // Apply user sliders: X offset, Y offset, Scale
    const posX = baseLeft + (this.footerState.x || 0) * scaleMultiplier;
    const posY = baseTop + (this.footerState.y || 0) * scaleMultiplier;
    const userScale = (this.footerState.scale || 1.0) * scaleMultiplier;

    targetCtx.translate(posX, posY);
    targetCtx.scale(userScale, userScale);

    const align = this.footerState.align || 'left';
    targetCtx.textAlign = align;
    targetCtx.textBaseline = 'alphabetic';

    // Text Values
    const unitText = (this.config.unitName || '').trim();
    const centreText = (this.config.studentCentre || 'Unit Committee, Students Centre,').trim();

    // Font Sizes (Scalable HD resolution base)
    const ssfFontSize = 56;
    const unitFontSize = 52;
    const centreFontSize = 36;
    const fontColor = '#FFFFFF'; // Crisp White for dark bottom banner
    const subFontColor = '#E5E7EB'; // Light Silver

    // LINE 1: "SSF " (Cooper Black) + Unit Name (Sora)
    const ssfFontStr = `900 ${ssfFontSize}px 'CooperBlack', 'Cooper Black', 'COOPBL', fantasy, sans-serif`;
    targetCtx.font = ssfFontStr;
    targetCtx.fillStyle = fontColor;

    let currentX = 0;
    if (align === 'left') {
      const ssfPrefix = unitText ? 'SSF ' : 'SSF';
      targetCtx.fillText(ssfPrefix, currentX, 0);
      const ssfMetrics = targetCtx.measureText(ssfPrefix);
      currentX += ssfMetrics.width;

      if (unitText) {
        targetCtx.font = `600 ${unitFontSize}px 'Sora', 'Noto Sans Malayalam', sans-serif`;
        targetCtx.fillStyle = fontColor;
        targetCtx.fillText(unitText, currentX, 0);
      }

    } else {
      // Centered or Right
      targetCtx.font = `600 ${unitFontSize}px 'Sora', 'Noto Sans Malayalam', sans-serif`;
      targetCtx.fillStyle = fontColor;
      targetCtx.fillText(unitText ? `SSF ${unitText}` : 'SSF', 0, 0);
    }

    // LINE 2: Student Centre Name (Sora Light)
    const line2Y = 54;
    targetCtx.font = `300 ${centreFontSize}px 'Sora', 'Noto Sans Malayalam', sans-serif`;
    targetCtx.fillStyle = subFontColor;
    targetCtx.fillText(centreText, 0, line2Y);

    targetCtx.restore();
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
      if (!this.originalPhoto) return;
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
      if (!this.originalPhoto) return;
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
      if (!this.originalPhoto) return;
      this.isDragging = true;
      const pos = getPointerPos(e);
      this.dragStart = pos;
      this.initialPhotoPos = { x: this.photoState.x, y: this.photoState.y };
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging || !this.originalPhoto) return;
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
      if (!this.originalPhoto) return;
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      this.photoState.scale = Math.max(0.1, Math.min(5, this.photoState.scale * zoomFactor));
      this.render();
      if (this.onTransformChange) this.onTransformChange(this.photoState);
    }, { passive: false });
  }

  /**
   * Export Full High-Resolution HD Composited Image:
   * 1. adjusted user photo (non-destructive, native pixel processed)
   * 2. frame.png overlay
   * 3. dynamic SSF footer
   * Exact layer order with 100% fidelity to preview!
   */
  exportHDCanvas(scaleFactor = 1.0) {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = this.exportWidth * scaleFactor;
    exportCanvas.height = this.exportHeight * scaleFactor;

    const ctx = exportCanvas.getContext('2d');
    const width = exportCanvas.width;
    const height = exportCanvas.height;

    // 1. Cream background (#FAF7E6)
    ctx.fillStyle = '#FAF7E6';
    ctx.fillRect(0, 0, width, height);

    // 2. Render Full Native HD Adjusted Photo
    if (this.originalPhoto) {
      ctx.save();
      const slotCenterX = (this.photoSlot.x + this.photoSlot.width / 2) * width;
      const slotCenterY = (this.photoSlot.y + this.photoSlot.height / 2) * height;
      const slotW = this.photoSlot.width * width;
      const slotH = this.photoSlot.height * height;

      ctx.beginPath();
      ctx.rect(this.photoSlot.x * width, this.photoSlot.y * height, slotW, slotH);
      ctx.clip();

      const finalX = slotCenterX + (this.photoState.x * scaleFactor);
      const finalY = slotCenterY + (this.photoState.y * scaleFactor);
      ctx.translate(finalX, finalY);
      ctx.rotate((this.photoState.rotation * Math.PI) / 180);

      // Process at full native resolution (0 = unlimited dimension)
      let hdAdjusted = this.originalPhoto;
      if (ImageProcessor.hasActiveAdjustments(this.adjustments)) {
        hdAdjusted = ImageProcessor.process(this.originalPhoto, this.adjustments, null, 0);
      }

      const scaleComp = this.originalPhoto.width / hdAdjusted.width;
      const finalScale = this.photoState.scale * scaleFactor * scaleComp;

      ctx.scale(
        finalScale * (this.photoState.flipH ? -1 : 1),
        finalScale * (this.photoState.flipV ? -1 : 1)
      );

      ctx.drawImage(hdAdjusted, -hdAdjusted.width / 2, -hdAdjusted.height / 2);
      ctx.restore();
    }

    // 3. Render SSF Frame Overlay Layer
    if (this.isFrameLoaded && this.frameImage) {
      ctx.drawImage(this.frameImage, 0, 0, width, height);
    }

    // 4. Render Dynamic SSF Footer
    this.renderDynamicFooter(ctx, width, height, scaleFactor);

    return exportCanvas;
  }
}
