/**
 * SpoonForce - 主应用逻辑
 */
const App = (() => {
  // State
  let tareForce = 0;
  let currentUnit = 'g';
  let isLocked = false;
  let lockedWeight = 0;
  let lockCheckBuffer = [];
  let lockTimer = null;
  const LOCK_STABLE_MS = 1500;
  const LOCK_TOLERANCE_G = 1;

  // DOM refs (set in init)
  let $weightVal, $unitLabel, $scaleCircle, $warning, $statusDot, $statusText;
  let $placeholderText, $lockIcon;
  let $calibPanel, $calibStepTitle, $calibStepDesc, $calibInput, $calibInputGroup;
  let $calibNextBtn, $calibProgress;
  let $histPanel, $histList;
  let $compatOverlay, $hapticBanner;

  function init() {
    _cacheDom();
    _loadPrefs();

    ForceSensor.setScaleCircle($scaleCircle);
    ForceSensor.init();
    ForceSensor.onForceChange(_onForceUpdate);
    ForceSensor.onForceEnd(_onForceEnd);
    ForceSensor.onConnectionChange(_onConnectionChange);

    I18n.init();
    _bindEvents();
    _updateUnitDisplay();
  }

  function _cacheDom() {
    $weightVal = document.getElementById('weight-val');
    $unitLabel = document.getElementById('unit-label');
    $scaleCircle = document.getElementById('scale-circle');
    $warning = document.getElementById('warning');
    $statusDot = document.getElementById('status-dot');
    $statusText = document.getElementById('status-text');
    $placeholderText = document.getElementById('placeholder-text');
    $lockIcon = document.getElementById('lock-icon');

    $calibPanel = document.getElementById('calib-panel');
    $calibStepTitle = document.getElementById('calib-step-title');
    $calibStepDesc = document.getElementById('calib-step-desc');
    $calibInput = document.getElementById('calib-input');
    $calibInputGroup = document.getElementById('calib-input-group');
    $calibNextBtn = document.getElementById('calib-next-btn');
    $calibProgress = document.getElementById('calib-progress');

    $histPanel = document.getElementById('hist-panel');
    $histList = document.getElementById('hist-list');

    $compatOverlay = document.getElementById('compat-overlay');
    $hapticBanner = document.getElementById('haptic-banner');
  }

  function _loadPrefs() {
    const prefs = Storage.getPrefs();
    currentUnit = prefs.unit || 'g';
  }

  function _bindTap(el, handler) {
    if (!el) return;
    el.addEventListener('click', handler);
    el.addEventListener('touchend', (e) => {
      e.preventDefault();
      handler(e);
    }, { passive: false });
  }

  function _bindEvents() {
    // Tare
    _bindTap(document.getElementById('btn-tare'), _tare);
    // Unit switch
    _bindTap(document.getElementById('btn-unit'), _toggleUnit);
    // Calibrate
    _bindTap(document.getElementById('btn-calibrate'), _openCalibration);
    // History
    _bindTap(document.getElementById('btn-history'), _openHistory);
    // Language
    _bindTap(document.getElementById('btn-lang'), _toggleLang);
    // Lock icon tap to unlock
    _bindTap($lockIcon, _unlock);

    // Calibration panel
    _bindTap($calibNextBtn, _calibNext);
    _bindTap(document.getElementById('calib-cancel-btn'), _cancelCalibration);

    // History panel
    _bindTap(document.getElementById('hist-close-btn'), _closeHistory);
    _bindTap(document.getElementById('hist-clear-btn'), _clearHistory);

    // Compat
    const dismissBtn = document.getElementById('compat-dismiss-btn');
    if (dismissBtn) {
      _bindTap(dismissBtn, () => {
        $compatOverlay.classList.add('hidden');
      });
    }
    const hapticDismiss = document.getElementById('haptic-dismiss-btn');
    if (hapticDismiss) {
      _bindTap(hapticDismiss, () => {
        $hapticBanner.classList.add('hidden');
      });
    }
  }

  // --- Force handling ---
  function _onForceUpdate(data) {
    if (Calibration.isActive()) return;
    if (isLocked) return;

    $placeholderText.classList.add('hidden');

    if (data.hasForce) {
      $statusDot.classList.add('connected');
      $statusText.setAttribute('data-i18n', 'sensorConnected');
      $statusText.textContent = I18n.t('sensorConnected');

      const netForce = Math.max(0, data.smoothed - tareForce);
      const weightG = Calibration.calculate(netForce);
      const displayWeight = _convertWeight(weightG);

      $weightVal.textContent = displayWeight.toFixed(1);
      _updateCircleColor(data.smoothed);
      _checkOverload(data.smoothed);
      _checkAutoLock(weightG);
    } else {
      // Ignore plain touches without real force data.
      $statusDot.classList.remove('connected');
      $statusText.setAttribute('data-i18n', 'sensorNoForce');
      $statusText.textContent = I18n.t('sensorNoForce');
      $scaleCircle.style.borderColor = '';
      $scaleCircle.style.boxShadow = '';
    }
  }

  function _onForceEnd() {
    // Clear lock buffer when touch ends to avoid stale data on next touch
    lockCheckBuffer = [];
    if (!isLocked) {
      $statusDot.classList.remove('connected');
      $statusText.setAttribute('data-i18n', 'sensorDisconnected');
      $statusText.textContent = I18n.t('sensorDisconnected');
      $weightVal.textContent = '0.0';
      // Reset circle to gray (idle)
      $scaleCircle.style.borderColor = '';
      $scaleCircle.style.boxShadow = '';
    }
  }

  function _onConnectionChange(supported) {
    if (supported === true) {
      // Real force detected
      $compatOverlay.classList.add('hidden');
      $hapticBanner.classList.add('hidden');
    } else {
      // Keep UI usable; show non-blocking hint instead of blocking overlay.
      $compatOverlay.classList.add('hidden');
      $hapticBanner.classList.remove('hidden');
    }
  }

  // --- Weight calculation ---
  function _convertWeight(grams) {
    if (currentUnit === 'oz') {
      return grams / 28.3495;
    }
    return grams;
  }

  function _tare() {
    tareForce = ForceSensor.getIsActive() ? ForceSensor.getSmoothedForce() : 0;
    $weightVal.textContent = '0.0';
    _unlock();
  }

  function _toggleUnit() {
    currentUnit = currentUnit === 'g' ? 'oz' : 'g';
    _updateUnitDisplay();
    const prefs = Storage.getPrefs();
    prefs.unit = currentUnit;
    Storage.savePrefs(prefs);

    // Re-convert current displayed weight
    if (isLocked) {
      $weightVal.textContent = _convertWeight(lockedWeight).toFixed(1);
    }
  }

  function _updateUnitDisplay() {
    const unitKey = currentUnit === 'g' ? 'gramShort' : 'ounceShort';
    $unitLabel.textContent = I18n.t(unitKey);
  }

  // --- Visual feedback ---
  function _updateCircleColor(force) {
    const t = Math.min(1, Math.max(0, force));
    let r, g, b;
    if (t < 0.5) {
      // Green to Yellow
      const p = t / 0.5;
      r = Math.round(76 + p * (255 - 76));
      g = Math.round(217 - p * (217 - 200));
      b = Math.round(100 - p * 60);
    } else if (t < 0.8) {
      // Yellow to Orange
      const p = (t - 0.5) / 0.3;
      r = 255;
      g = Math.round(200 - p * 100);
      b = Math.round(40 - p * 10);
    } else {
      // Orange to Red
      const p = (t - 0.8) / 0.2;
      r = 255;
      g = Math.round(100 - p * 70);
      b = Math.round(30 + p * 10);
    }
    $scaleCircle.style.borderColor = `rgb(${r}, ${g}, ${b})`;
    $scaleCircle.style.boxShadow = `0 0 ${20 + t * 40}px rgba(${r}, ${g}, ${b}, ${0.2 + t * 0.4})`;
  }

  function _checkOverload(force) {
    if (force >= 0.95) {
      $warning.textContent = I18n.t('overloadWarning');
      $warning.classList.add('visible');
      if (navigator.vibrate) navigator.vibrate(50);
    } else {
      $warning.textContent = '';
      $warning.classList.remove('visible');
    }
  }

  // --- Auto-lock ---
  function _checkAutoLock(weightG) {
    const now = Date.now();
    lockCheckBuffer.push({ time: now, weight: weightG });

    // Keep only last LOCK_STABLE_MS
    const cutoff = now - LOCK_STABLE_MS;
    lockCheckBuffer = lockCheckBuffer.filter((e) => e.time >= cutoff);

    if (lockCheckBuffer.length < 5) return; // Need enough samples

    const weights = lockCheckBuffer.map((e) => e.weight);
    const min = Math.min(...weights);
    const max = Math.max(...weights);

    if (max - min < LOCK_TOLERANCE_G && max > 0.5) {
      _lock(weightG);
    }
  }

  function _lock(weightG) {
    if (isLocked) return;
    isLocked = true;
    lockedWeight = weightG;
    $lockIcon.classList.add('visible');
    $scaleCircle.classList.add('locked');
    $weightVal.textContent = _convertWeight(weightG).toFixed(1);

    // Save to history
    Storage.addHistory({
      weight: Math.round(weightG * 10) / 10,
      unit: 'g', // always store in grams
    });
  }

  function _unlock() {
    isLocked = false;
    lockedWeight = 0;
    lockCheckBuffer = [];
    $lockIcon.classList.remove('visible');
    $scaleCircle.classList.remove('locked');
  }

  // --- Calibration UI ---
  function _openCalibration() {
    Calibration.start(
      (step) => _renderCalibStep(step),
      (data) => _onCalibComplete(data)
    );
    $calibPanel.classList.remove('hidden');
  }

  function _renderCalibStep(step) {
    $calibInput.value = '';
    if (step === 1) {
      $calibStepTitle.textContent = I18n.t('calibStep1Title');
      $calibStepDesc.textContent = I18n.t('calibStep1Desc');
      $calibInputGroup.classList.add('hidden');
      $calibNextBtn.textContent = I18n.t('calibNext');
    } else if (step === 2) {
      $calibStepTitle.textContent = I18n.t('calibStep2Title');
      $calibStepDesc.textContent = I18n.t('calibStep2Desc');
      $calibInputGroup.classList.remove('hidden');
      $calibNextBtn.textContent = I18n.t('calibNext');
    } else if (step === 3) {
      $calibStepTitle.textContent = I18n.t('calibStep3Title');
      $calibStepDesc.textContent = I18n.t('calibStep3Desc');
      $calibInputGroup.classList.remove('hidden');
      $calibNextBtn.textContent = I18n.t('calibFinish');
    }
    $calibProgress.textContent = `${step} / 3`;
  }

  function _calibNext() {
    const result = Calibration.nextStep($calibInput.value);
    if (!result.success) {
      const msg = result.error === 'calibNoForce'
        ? I18n.t('calibNoForce')
        : result.error === 'pointsTooClose'
          ? I18n.t('calibInvalid')
          : result.error === 'invalidCalibration'
            ? I18n.t('calibInvalid')
          : 'Please enter a valid weight.';
      alert(msg);
    }
  }

  function _onCalibComplete() {
    alert(I18n.t('calibSuccess'));
    $calibPanel.classList.add('hidden');
    // Reset tare since calibration includes its own tare
    tareForce = 0;
  }

  function _cancelCalibration() {
    Calibration.cancel();
    $calibPanel.classList.add('hidden');
  }

  // --- History UI ---
  function _openHistory() {
    _renderHistory();
    $histPanel.classList.remove('hidden');
  }

  function _closeHistory() {
    $histPanel.classList.add('hidden');
  }

  function _renderHistory() {
    const records = Storage.getHistory();
    $histList.innerHTML = '';

    if (records.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'hist-empty';
      empty.textContent = I18n.t('histEmpty');
      $histList.appendChild(empty);
      return;
    }

    records.forEach((rec, i) => {
      const item = document.createElement('div');
      item.className = 'hist-item';

      const displayWeight = currentUnit === 'oz'
        ? (rec.weight / 28.3495).toFixed(1) + ' oz'
        : rec.weight.toFixed(1) + ' g';
      const date = new Date(rec.timestamp);
      const timeStr = `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

      item.innerHTML = `
        <div class="hist-item-info">
          <span class="hist-weight">${displayWeight}</span>
          <span class="hist-time">${timeStr}</span>
        </div>
        <button class="hist-delete-btn" data-index="${i}">${I18n.t('histDelete')}</button>
      `;
      $histList.appendChild(item);
    });

    // Bind delete buttons
    $histList.querySelectorAll('.hist-delete-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        Storage.removeHistory(idx);
        _renderHistory();
      });
    });
  }

  function _clearHistory() {
    if (confirm(I18n.t('histClearConfirm'))) {
      Storage.clearHistory();
      _renderHistory();
    }
  }

  // --- Language ---
  function _toggleLang() {
    const lang = I18n.toggle();
    document.getElementById('btn-lang').textContent = lang === 'zh' ? 'EN' : '中';
    _updateUnitDisplay();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
