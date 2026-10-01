/**
 * SSF Membership Studio - Advanced Photo Adjustments & Pixel Processing Engine
 * Implements Adobe Camera Raw-inspired Basic Adjustment Controls:
 * LIGHT: Exposure, Contrast, Highlights, Shadows, Whites, Blacks
 * COLOR: Temperature, Tint, Vibrance, Saturation
 *
 * All operations are Canvas-based pixel-level transformations (non-destructive),
 * ensuring the preview and final HD export are 100% identical.
 */

export const FILTER_PRESETS = [
  {
    id: 'original',
    name: 'Original',
    icon: '✨',
    adjustments: { exposure: 0, contrast: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0, temperature: 0, tint: 0, vibrance: 0, saturation: 0 }
  },
  {
    id: 'bw',
    name: 'B & W',
    icon: '☯️',
    adjustments: { exposure: 5, contrast: 20, highlights: 10, shadows: -10, whites: 15, blacks: -15, temperature: 0, tint: 0, vibrance: -100, saturation: -100 }
  },
  {
    id: 'warm',
    name: 'Warm Sun',
    icon: '☀️',
    adjustments: { exposure: 5, contrast: 5, highlights: 15, shadows: 10, whites: 5, blacks: 0, temperature: 30, tint: 5, vibrance: 20, saturation: 15 }
  },
  {
    id: 'cool',
    name: 'Cool Tone',
    icon: '❄️',
    adjustments: { exposure: 0, contrast: 5, highlights: -5, shadows: 15, whites: 0, blacks: 5, temperature: -30, tint: -10, vibrance: 15, saturation: 10 }
  },
  {
    id: 'fade',
    name: 'Soft Fade',
    icon: '🌫️',
    adjustments: { exposure: 10, contrast: -25, highlights: -15, shadows: 30, whites: -10, blacks: 25, temperature: 5, tint: 0, vibrance: -10, saturation: -20 }
  },
  {
    id: 'vintage',
    name: 'Vintage',
    icon: '🎞️',
    adjustments: { exposure: 5, contrast: 10, highlights: -10, shadows: 15, whites: -5, blacks: 10, temperature: 35, tint: 15, vibrance: -15, saturation: -25 }
  },
  {
    id: 'vivid',
    name: 'Vivid',
    icon: '🌈',
    adjustments: { exposure: 5, contrast: 25, highlights: 15, shadows: -15, whites: 10, blacks: -10, temperature: 0, tint: 0, vibrance: 45, saturation: 35 }
  },
  {
    id: 'emerald',
    name: 'Emerald',
    icon: '💚',
    adjustments: { exposure: 0, contrast: 15, highlights: 10, shadows: 5, whites: 5, blacks: -5, temperature: -15, tint: -25, vibrance: 30, saturation: 20 }
  }
];

export class ImageProcessor {
  /**
   * Check if any adjustment parameter is active (non-zero)
   */
  static hasActiveAdjustments(adj) {
    if (!adj) return false;
    return (
      (adj.exposure || 0) !== 0 ||
      (adj.contrast || 0) !== 0 ||
      (adj.highlights || 0) !== 0 ||
      (adj.shadows || 0) !== 0 ||
      (adj.whites || 0) !== 0 ||
      (adj.blacks || 0) !== 0 ||
      (adj.temperature || 0) !== 0 ||
      (adj.tint || 0) !== 0 ||
      (adj.vibrance || 0) !== 0 ||
      (adj.saturation || 0) !== 0
    );
  }

  /**
   * Process a source image/canvas non-destructively and return an adjusted canvas.
   * targetCanvas (optional): pass existing canvas to reuse memory for maximum performance.
   */
  static process(source, adj = {}, targetCanvas = null, maxDimension = 0) {
    if (!source) return null;

    let srcW = source.naturalWidth || source.videoWidth || source.width;
    let srcH = source.naturalHeight || source.videoHeight || source.height;

    if (!srcW || !srcH) return null;

    // Optional scale down for fast real-time preview if maxDimension specified
    let targetW = srcW;
    let targetH = srcH;
    if (maxDimension > 0 && Math.max(srcW, srcH) > maxDimension) {
      const ratio = maxDimension / Math.max(srcW, srcH);
      targetW = Math.round(srcW * ratio);
      targetH = Math.round(srcH * ratio);
    }

    const canvas = targetCanvas || document.createElement('canvas');
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(source, 0, 0, targetW, targetH);

    // If no adjustments, return pure drawn source
    if (!this.hasActiveAdjustments(adj)) {
      return canvas;
    }

    // Retrieve pixel buffer
    const imgData = ctx.getImageData(0, 0, targetW, targetH);
    const data = imgData.data;
    const len = data.length;

    // --- 1. LIGHT PARAMETERS ---
    const exp = adj.exposure || 0;
    // Exposure: -100 to +100. Photographic EV curve: 2^(EV)
    // -100 -> ~0.25x (darker), 0 -> 1x, +100 -> ~2.8x (brighter)
    const expMult = exp >= 0
      ? 1 + (exp / 100) * 1.8
      : 1 / (1 + (Math.abs(exp) / 100) * 2.0);

    // Contrast: -100 to +100
    const con = adj.contrast || 0;
    const conFactor = (259 * (con + 255)) / (255 * (259 - con));

    // Highlights (-100 to +100): affects luminance > 128
    const highlights = adj.highlights || 0;
    const hiFactor = highlights / 100;

    // Shadows (-100 to +100): affects luminance < 160
    const shadows = adj.shadows || 0;
    const shFactor = shadows / 100;

    // Whites (-100 to +100): white-point expansion/compression (upper highlights)
    const whites = adj.whites || 0;
    const whitesFactor = whites / 100;

    // Blacks (-100 to +100): black-point floor (deep shadows)
    const blacks = adj.blacks || 0;
    const blacksFactor = blacks / 100;

    // --- 2. COLOR PARAMETERS ---
    // Temperature: -100 (Cool/Blue) to +100 (Warm/Yellow)
    const temp = adj.temperature || 0;
    const tempR = temp * 0.65;
    const tempG = temp * 0.15;
    const tempB = -temp * 0.65;

    // Tint: -100 (Green) to +100 (Magenta)
    const tint = adj.tint || 0;
    const tintR = tint * 0.45;
    const tintG = -tint * 0.65;
    const tintB = tint * 0.45;

    // Saturation: -100 (desaturate) to +100 (boost)
    const sat = adj.saturation || 0;
    const satMult = Math.max(0, 1 + sat / 100);

    // Vibrance: -100 to +100
    const vib = adj.vibrance || 0;
    const vibFactor = vib / 100;

    // --- PIXEL LOOP (Single-pass highly optimized) ---
    for (let i = 0; i < len; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // A. EXPOSURE
      r *= expMult;
      g *= expMult;
      b *= expMult;

      // B. CONTRAST (pivot around midtone 128)
      r = (r - 128) * conFactor + 128;
      g = (g - 128) * conFactor + 128;
      b = (b - 128) * conFactor + 128;

      // Calculate Perceptual Luminance (Rec. 601)
      let lum = 0.299 * r + 0.587 * g + 0.114 * b;
      let normL = lum / 255;
      if (normL < 0) normL = 0;
      else if (normL > 1) normL = 1;

      // C. HIGHLIGHTS (weighted towards brighter pixels)
      if (highlights !== 0) {
        // Quadratic falloff from 128 upwards
        const wHi = normL * normL;
        const shift = hiFactor * 75 * wHi;
        r += shift;
        g += shift;
        b += shift;
      }

      // D. SHADOWS (weighted towards darker pixels)
      if (shadows !== 0) {
        // Quadratic falloff from deep shadows upwards
        const wSh = (1 - normL) * (1 - normL);
        const shift = shFactor * 80 * wSh;
        r += shift;
        g += shift;
        b += shift;
      }

      // E. WHITES (extreme upper end)
      if (whites !== 0) {
        const wWh = normL * normL * normL;
        const shift = whitesFactor * 55 * wWh;
        r += shift;
        g += shift;
        b += shift;
      }

      // F. BLACKS (extreme bottom end)
      if (blacks !== 0) {
        const invL = 1 - normL;
        const wBlk = invL * invL * invL;
        const shift = blacksFactor * 50 * wBlk;
        r += shift;
        g += shift;
        b += shift;
      }

      // G. TEMPERATURE & TINT
      r += tempR + tintR;
      g += tempG + tintG;
      b += tempB + tintB;

      // Re-calculate updated luminance for Chroma scaling
      lum = 0.299 * r + 0.587 * g + 0.114 * b;

      // H. VIBRANCE & SATURATION
      if (sat !== 0 || vib !== 0) {
        let maxVal = Math.max(r, Math.max(g, b));
        let minVal = Math.min(r, Math.min(g, b));
        let currentSat = maxVal > 0 ? (maxVal - minVal) / maxVal : 0;

        // Vibrance protects already saturated colors and boosts muted colors
        let currentVibMult = 1.0;
        if (vib !== 0) {
          currentVibMult = 1 + vibFactor * (1 - currentSat) * 1.4;
        }

        const totalChroma = satMult * currentVibMult;

        r = lum + (r - lum) * totalChroma;
        g = lum + (g - lum) * totalChroma;
        b = lum + (b - lum) * totalChroma;
      }

      // CLAMPING TO [0, 255]
      data[i] = r < 0 ? 0 : r > 255 ? 255 : r;
      data[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
      data[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }
}
