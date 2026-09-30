/**
 * SSF Membership Studio - Advanced Photo Adjustments Engine
 * Supports: Exposure, Contrast, Highlights, Shadows, Whites, Blacks, Temperature, Tint, Vibrance, Saturation
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
    adjustments: { exposure: 5, contrast: 5, highlights: 15, shadows: 10, whites: 5, blacks: 0, temperature: 25, tint: 5, vibrance: 20, saturation: 15 }
  },
  {
    id: 'cool',
    name: 'Cool Tone',
    icon: '❄️',
    adjustments: { exposure: 0, contrast: 5, highlights: -5, shadows: 15, whites: 0, blacks: 5, temperature: -25, tint: -10, vibrance: 15, saturation: 10 }
  },
  {
    id: 'fade',
    name: 'Soft Fade',
    icon: '🌫️',
    adjustments: { exposure: 10, contrast: -20, highlights: -15, shadows: 25, whites: -10, blacks: 20, temperature: 5, tint: 0, vibrance: -10, saturation: -20 }
  },
  {
    id: 'vintage',
    name: 'Vintage',
    icon: '🎞️',
    adjustments: { exposure: 5, contrast: 10, highlights: -10, shadows: 15, whites: -5, blacks: 10, temperature: 30, tint: 15, vibrance: -15, saturation: -25 }
  },
  {
    id: 'vivid',
    name: 'Vivid',
    icon: '🌈',
    adjustments: { exposure: 5, contrast: 25, highlights: 15, shadows: -15, whites: 10, blacks: -10, temperature: 0, tint: 0, vibrance: 40, saturation: 30 }
  },
  {
    id: 'emerald',
    name: 'Emerald',
    icon: '💚',
    adjustments: { exposure: 0, contrast: 15, highlights: 10, shadows: 5, whites: 5, blacks: -5, temperature: -15, tint: -20, vibrance: 25, saturation: 20 }
  }
];

export class ImageProcessor {
  /**
   * Build CSS filter string based on adjustments object
   */
  static getCssFilterString(adj) {
    const exposureVal = 100 + (adj.exposure || 0);
    const contrastVal = 100 + (adj.contrast || 0);
    
    // Calculate smart saturation combining vibrance + saturation
    const totalSat = (adj.saturation || 0) + (adj.vibrance || 0) * 0.75;
    const saturateVal = Math.max(0, 100 + totalSat);

    let tintHue = '';
    const tint = adj.tint || 0;
    if (tint !== 0) {
      tintHue = `hue-rotate(${tint * 0.5}deg) `;
    }

    let tempFilter = '';
    const temp = adj.temperature || 0;
    if (temp > 0) {
      tempFilter = `sepia(${Math.min(temp * 0.4, 35)}%) `;
    } else if (temp < 0) {
      tempFilter = `hue-rotate(${temp * 0.4}deg) `;
    }

    return `brightness(${exposureVal}%) contrast(${contrastVal}%) saturate(${saturateVal}%) ${tintHue} ${tempFilter}`.trim();
  }

  /**
   * Apply fine highlights, shadows, whites, blacks & tone curves on canvas context
   */
  static applyCanvasAdjustments(ctx, width, height, adj) {
    const highlights = adj.highlights || 0;
    const shadows = adj.shadows || 0;
    const whites = adj.whites || 0;
    const blacks = adj.blacks || 0;
    const temp = adj.temperature || 0;

    if (!highlights && !shadows && !whites && !blacks && !temp) return;

    ctx.save();

    // 1. Highlights adjustment (Overlay light tint on upper tones)
    if (highlights > 0) {
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(highlights / 200, 0.4)})`;
      ctx.fillRect(0, 0, width, height);
    } else if (highlights < 0) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = `rgba(200, 200, 200, ${Math.min(Math.abs(highlights) / 250, 0.3)})`;
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Shadows adjustment (Lift/drop dark tones)
    if (shadows > 0) {
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `rgba(50, 50, 50, ${Math.min(shadows / 250, 0.35)})`;
      ctx.fillRect(0, 0, width, height);
    } else if (shadows < 0) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(Math.abs(shadows) / 250, 0.35)})`;
      ctx.fillRect(0, 0, width, height);
    }

    // 3. Whites adjustment (White point shift)
    if (whites !== 0) {
      ctx.globalCompositeOperation = whites > 0 ? 'overlay' : 'darken';
      ctx.fillStyle = whites > 0 
        ? `rgba(255, 255, 255, ${Math.min(whites / 300, 0.25)})`
        : `rgba(220, 220, 220, ${Math.min(Math.abs(whites) / 300, 0.25)})`;
      ctx.fillRect(0, 0, width, height);
    }

    // 4. Blacks adjustment (Black point shift)
    if (blacks !== 0) {
      ctx.globalCompositeOperation = blacks > 0 ? 'lighten' : 'multiply';
      ctx.fillStyle = blacks > 0
        ? `rgba(40, 40, 40, ${Math.min(blacks / 300, 0.25)})`
        : `rgba(0, 0, 0, ${Math.min(Math.abs(blacks) / 300, 0.25)})`;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();
  }
}
