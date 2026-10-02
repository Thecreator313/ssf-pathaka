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
  apiKey: "AIzaSyDqS0OmR0Tq-HyXm1XNQTK3lnDjh_vOJSg",
  authDomain: "asdf-1f4f7.firebaseapp.com",
  databaseURL: "https://asdf-1f4f7-default-rtdb.firebaseio.com",
  projectId: "asdf-1f4f7",
  storageBucket: "asdf-1f4f7.firebasestorage.app",
  messagingSenderId: "79838848864",
  appId: "1:79838848864:web:450a89b6b59063aa032005",
  measurementId: "G-RL9XZGNKCV"
};

let app = null;
let db = null;

try {
  app = initializeApp(firebaseConfig);
  db = getDatabase(app);
} catch (err) {
  console.warn('Firebase initialization error:', err);
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
 * Register or update unit details in Firebase Realtime Database
 */
export async function registerUnit(unitName, studentCentre) {
  if (!db || !unitName || !unitName.trim()) return;

  const key = sanitizeUnitKey(unitName);
  const now = new Date().toISOString();

  try {
    const unitRef = ref(db, `units/${key}`);
    const snapshot = await get(unitRef);

    if (!snapshot.exists()) {
      // New unit registration
      await set(unitRef, {
        unitName: unitName.trim(),
        studentCentre: (studentCentre || '').trim(),
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
        unitName: unitName.trim(),
        studentCentre: (studentCentre || '').trim(),
        lastActive: now
      });
    }
  } catch (error) {
    console.warn('Error registering unit to Firebase:', error);
  }
}

/**
 * Track poster generation (Download HD or WhatsApp share)
 * Atomically increments global total posters and individual unit count
 */
export async function trackPosterCreated(unitName, studentCentre, actionType = 'download') {
  if (!db) return;

  const key = sanitizeUnitKey(unitName || 'general');
  const now = new Date().toISOString();
  const cleanUnitName = (unitName && unitName.trim()) ? unitName.trim() : 'General / Direct';
  const cleanCentre = (studentCentre && studentCentre.trim()) ? studentCentre.trim() : 'Unit Committee, Students Centre,';

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
    console.warn('Error tracking poster creation in Firebase:', error);
  }
}

/**
 * Subscribe to real-time Admin Statistics and all Registered Units
 */
export function subscribeToAdminData(onDataReceived, onError) {
  if (!db) {
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
      totalUnitsCount: unitsList.length
    });
  }, (err) => {
    if (onError) onError(err);
  });

  return unsubscribe;
}
