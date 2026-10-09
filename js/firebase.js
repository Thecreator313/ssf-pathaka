/**
 * SSF Membership Studio - Firebase Integration Engine
 * Tracks:
 * 1. Global Total Posters Created (stats/totalPosters)
 * 2. Total Registered Units (stats/totalUnits)
 * 3. Individual Unit Posters Created & Last Active (units/{unitKey})
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { 
  getDatabase, 
  ref, 
  set, 
  update, 
  get, 
  increment, 
  onValue 
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

const firebaseConfig = {
  apiKey: "AIzaSyDtYrFQK1T27IvVlyFBuUBluzndG2eWX9U",
  authDomain: "sffa-5c415.firebaseapp.com",
  projectId: "sffa-5c415",
  storageBucket: "sffa-5c415.firebasestorage.app",
  messagingSenderId: "1075373163790",
  appId: "1:1075373163790:web:e8c11b81db9c310d12c35f",
  measurementId: "G-K6YV3GXX8J"
};

let app = null;
let db = null;

try {
  app = initializeApp(firebaseConfig);
  db = getDatabase(app);
} catch (err) {
  console.warn('Firebase initialization error:', err);
}

const LOCAL_STORAGE_KEY = 'ssf_firebase_local_units';

function getLocalRegistry() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { stats: { totalPosters: 0, totalUnits: 0, downloads: 0, whatsappShares: 0 }, units: {} };
  } catch {
    return { stats: { totalPosters: 0, totalUnits: 0, downloads: 0, whatsappShares: 0 }, units: {} };
  }
}

function saveToLocalRegistry(key, unitName, studentCentre) {
  try {
    const data = getLocalRegistry();
    const now = new Date().toISOString();
    if (!data.units[key]) {
      data.units[key] = {
        unitName,
        studentCentre,
        postersCount: 0,
        registeredAt: now,
        lastActive: now
      };
    } else {
      data.units[key].unitName = unitName;
      data.units[key].studentCentre = studentCentre;
      data.units[key].lastActive = now;
    }
    data.stats.totalUnits = Object.keys(data.units).length;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Local registry error:', e);
  }
}

function trackLocalPoster(key, unitName, studentCentre, actionType) {
  try {
    const data = getLocalRegistry();
    const now = new Date().toISOString();
    data.stats.totalPosters = (data.stats.totalPosters || 0) + 1;
    if (actionType === 'whatsapp') {
      data.stats.whatsappShares = (data.stats.whatsappShares || 0) + 1;
    } else {
      data.stats.downloads = (data.stats.downloads || 0) + 1;
    }

    if (!data.units[key]) {
      data.units[key] = {
        unitName: unitName || 'General',
        studentCentre: studentCentre || '',
        postersCount: 1,
        registeredAt: now,
        lastActive: now
      };
    } else {
      data.units[key].postersCount = (data.units[key].postersCount || 0) + 1;
      data.units[key].lastActive = now;
    }
    data.stats.totalUnits = Object.keys(data.units).length;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Local track error:', e);
  }
}

/**
 * Sanitizes unit name to be used safely as a Firebase Realtime Database key.
 * Supports Malayalam, Arabic, English, and special characters.
 */
export function sanitizeUnitKey(unitName) {
  if (!unitName || !unitName.trim()) return 'unknown_unit';
  const trimmed = unitName.trim();
  // Firebase keys cannot contain: . $ # [ ] / or ASCII 0-31 and 127
  return encodeURIComponent(trimmed).replace(/[\.\$#\[\]\/%]/g, '_');
}

/**
 * Register or update unit details in Firebase Realtime Database + Local Fallback
 */
export async function registerUnit(unitName, studentCentre) {
  if (!unitName || !unitName.trim()) return;

  const cleanUnit = unitName.trim();
  const cleanCentre = (studentCentre || '').trim();
  const key = sanitizeUnitKey(cleanUnit);
  const now = new Date().toISOString();

  // Always save to local registry fallback
  saveToLocalRegistry(key, cleanUnit, cleanCentre);

  if (!db) {
    console.warn('Firebase database instance not initialized');
    return;
  }

  try {
    const unitRef = ref(db, `units/${key}`);
    const snapshot = await get(unitRef);

    if (!snapshot.exists()) {
      // New unit registration
      await set(unitRef, {
        unitName: cleanUnit,
        studentCentre: cleanCentre,
        postersCount: 0,
        registeredAt: now,
        lastActive: now
      });

      // Increment total units count
      await update(ref(db, 'stats'), {
        totalUnits: increment(1)
      });
    } else {
      // Existing unit update details
      await update(unitRef, {
        unitName: cleanUnit,
        studentCentre: cleanCentre,
        lastActive: now
      });
    }
  } catch (error) {
    console.warn('Notice: Firebase unit sync failed (check if database is active):', error);
  }
}

/**
 * Track poster generation (Download HD or WhatsApp share)
 * Atomically increments global total posters and individual unit count
 */
export async function trackPosterCreated(unitName, studentCentre, actionType = 'download') {
  const cleanUnitName = (unitName && unitName.trim()) ? unitName.trim() : 'General / Direct';
  const cleanCentre = (studentCentre && studentCentre.trim()) ? studentCentre.trim() : 'Unit Committee, Students Centre,';
  const key = sanitizeUnitKey(unitName || 'general');
  const now = new Date().toISOString();

  // Always track locally
  trackLocalPoster(key, cleanUnitName, cleanCentre, actionType);

  if (!db) return;

  try {
    const updates = {};
    // 1. Increment global total posters
    updates['stats/totalPosters'] = increment(1);
    
    // 2. Increment action specific counter
    if (actionType === 'whatsapp') {
      updates['stats/whatsappShares'] = increment(1);
    } else {
      updates['stats/downloads'] = increment(1);
    }

    // 3. Increment individual unit's poster count
    updates[`units/${key}/postersCount`] = increment(1);
    updates[`units/${key}/unitName`] = cleanUnitName;
    updates[`units/${key}/studentCentre`] = cleanCentre;
    updates[`units/${key}/lastActive`] = now;

    await update(ref(db), updates);
  } catch (error) {
    console.warn('Notice: Firebase poster track sync failed:', error);
  }
}

/**
 * Subscribe to real-time Admin Statistics and all Registered Units
 */
export function subscribeToAdminData(onDataReceived, onError) {
  const emitLocalFallback = (isError = false, errMsg = '') => {
    const data = getLocalRegistry();
    const stats = data.stats || { totalPosters: 0, totalUnits: 0, downloads: 0, whatsappShares: 0 };
    const rawUnits = data.units || {};
    const unitsList = Object.keys(rawUnits).map(k => ({
      id: k,
      ...rawUnits[k]
    })).sort((a, b) => (b.postersCount || 0) - (a.postersCount || 0));

    onDataReceived({
      stats,
      units: unitsList,
      totalUnitsCount: unitsList.length,
      isLocalFallback: true,
      errorMsg: errMsg
    });
  };

  if (!db) {
    emitLocalFallback(true, 'Firebase Realtime Database is not initialized');
    if (onError) onError(new Error('Firebase Database not initialized'));
    return () => {};
  }

  const rootRef = ref(db);
  const unsubscribe = onValue(rootRef, (snapshot) => {
    const data = snapshot.val() || {};
    const stats = data.stats || {
      totalPosters: 0,
      totalUnits: 0,
      downloads: 0,
      whatsappShares: 0
    };

    const rawUnits = data.units || {};
    const unitsList = Object.keys(rawUnits).map(key => {
      const u = rawUnits[key];
      return {
        id: key,
        unitName: u.unitName || 'Unknown Unit',
        studentCentre: u.studentCentre || '',
        postersCount: u.postersCount || 0,
        registeredAt: u.registeredAt || null,
        lastActive: u.lastActive || null
      };
    });

    // Sort by most posters created descending
    unitsList.sort((a, b) => (b.postersCount || 0) - (a.postersCount || 0));

    onDataReceived({
      stats,
      units: unitsList,
      totalUnitsCount: unitsList.length,
      isLocalFallback: false
    });
  }, (err) => {
    console.warn('Firebase Realtime Database offline or deactivated. Displaying local data.', err);
    emitLocalFallback(true, err ? err.message : 'Database offline');
    if (onError) onError(err);
  });

  return unsubscribe;
}
