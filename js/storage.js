/**
 * SpoonForce - LocalStorage 存储模块
 */
const Storage = (() => {
  const KEYS = {
    calibration: 'spoonforce_calibration',
    history: 'spoonforce_history',
    prefs: 'spoonforce_prefs',
  };

  const MAX_HISTORY = 100;

  function _get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function _set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage full or unavailable
    }
  }

  // --- Calibration ---
  function getCalibration() {
    return _get(KEYS.calibration) || { k: 420, b: 0, date: null, points: [] };
  }

  function saveCalibration(data) {
    _set(KEYS.calibration, data);
  }

  function resetCalibration() {
    localStorage.removeItem(KEYS.calibration);
  }

  // --- History ---
  function getHistory() {
    return _get(KEYS.history) || [];
  }

  function addHistory(entry) {
    const list = getHistory();
    list.unshift({
      weight: entry.weight,
      unit: entry.unit,
      timestamp: Date.now(),
    });
    if (list.length > MAX_HISTORY) {
      list.length = MAX_HISTORY;
    }
    _set(KEYS.history, list);
  }

  function removeHistory(index) {
    const list = getHistory();
    if (index >= 0 && index < list.length) {
      list.splice(index, 1);
      _set(KEYS.history, list);
    }
  }

  function clearHistory() {
    localStorage.removeItem(KEYS.history);
  }

  // --- Preferences ---
  function getPrefs() {
    return _get(KEYS.prefs) || {
      lang: navigator.language.startsWith('zh') ? 'zh' : 'en',
      unit: 'g',
    };
  }

  function savePrefs(prefs) {
    _set(KEYS.prefs, prefs);
  }

  return {
    getCalibration, saveCalibration, resetCalibration,
    getHistory, addHistory, removeHistory, clearHistory,
    getPrefs, savePrefs,
  };
})();
