/**
 * SSF Membership Studio - Local Storage Management
 * Extended with Footer Position & Scale Persistence
 */

const STORAGE_KEYS = {
  UNIT_NAME: 'ssf_membership_unit_name',
  STUDENT_CENTRE: 'ssf_membership_student_centre',
  FOOTER_X: 'ssf_membership_footer_x',
  FOOTER_Y: 'ssf_membership_footer_y',
  FOOTER_SCALE: 'ssf_membership_footer_scale',
  FOOTER_ALIGN: 'ssf_membership_footer_align',
  ONBOARDED: 'ssf_membership_onboarded'
};

export const Storage = {
  /**
   * Get user configuration from localStorage
   */
  getConfig() {
    return {
      unitName: localStorage.getItem(STORAGE_KEYS.UNIT_NAME) || '',
      studentCentre: localStorage.getItem(STORAGE_KEYS.STUDENT_CENTRE) || 'Unit Committee, Students Centre,',
      footerX: parseInt(localStorage.getItem(STORAGE_KEYS.FOOTER_X) || '0', 10),
      footerY: parseInt(localStorage.getItem(STORAGE_KEYS.FOOTER_Y) || '0', 10),
      footerScale: parseFloat(localStorage.getItem(STORAGE_KEYS.FOOTER_SCALE) || '1.0'),
      footerAlign: localStorage.getItem(STORAGE_KEYS.FOOTER_ALIGN) || 'left',
      isOnboarded: localStorage.getItem(STORAGE_KEYS.ONBOARDED) === 'true'
    };
  },

  /**
   * Save unit details and footer positions
   */
  saveConfig(unitName, studentCentre, footerState = {}) {
    localStorage.setItem(STORAGE_KEYS.UNIT_NAME, unitName.trim());
    localStorage.setItem(STORAGE_KEYS.STUDENT_CENTRE, studentCentre.trim());
    
    if (footerState.x !== undefined) localStorage.setItem(STORAGE_KEYS.FOOTER_X, footerState.x);
    if (footerState.y !== undefined) localStorage.setItem(STORAGE_KEYS.FOOTER_Y, footerState.y);
    if (footerState.scale !== undefined) localStorage.setItem(STORAGE_KEYS.FOOTER_SCALE, footerState.scale);
    if (footerState.align !== undefined) localStorage.setItem(STORAGE_KEYS.FOOTER_ALIGN, footerState.align);

    localStorage.setItem(STORAGE_KEYS.ONBOARDED, 'true');
  },

  /**
   * Save footer position specifically
   */
  saveFooterPosition(x, y, scale, align = 'left') {
    localStorage.setItem(STORAGE_KEYS.FOOTER_X, x);
    localStorage.setItem(STORAGE_KEYS.FOOTER_Y, y);
    localStorage.setItem(STORAGE_KEYS.FOOTER_SCALE, scale);
    localStorage.setItem(STORAGE_KEYS.FOOTER_ALIGN, align);
  },

  /**
   * Check if user completed first-time setup
   */
  isOnboarded() {
    return localStorage.getItem(STORAGE_KEYS.ONBOARDED) === 'true';
  },

  /**
   * Clear saved setup configuration
   */
  clearAll() {
    localStorage.removeItem(STORAGE_KEYS.UNIT_NAME);
    localStorage.removeItem(STORAGE_KEYS.STUDENT_CENTRE);
    localStorage.removeItem(STORAGE_KEYS.FOOTER_X);
    localStorage.removeItem(STORAGE_KEYS.FOOTER_Y);
    localStorage.removeItem(STORAGE_KEYS.FOOTER_SCALE);
    localStorage.removeItem(STORAGE_KEYS.FOOTER_ALIGN);
    localStorage.removeItem(STORAGE_KEYS.ONBOARDED);
  }
};
