/**
 * SpoonForce - Touch.force 传感模块
 */
const ForceSensor = (() => {
  const BUFFER_SIZE = 10;
  const CIRCLE_HIT_PADDING_PX = 28;
  let forceBuffer = [];
  let currentRawForce = 0;
  let smoothedForce = 0;
  let isActive = false;
  let lastForceTime = 0;
  const NO_FORCE_GRACE_MS = 220;
  let _onForceChange = null;
  let _onForceEnd = null;
  let _onConnectionChange = null;
  let forceSupported = null; // null = unknown, true/false after detection

  function _addToBuffer(value) {
    forceBuffer.push(value);
    if (forceBuffer.length > BUFFER_SIZE) {
      forceBuffer.shift();
    }
    return forceBuffer.reduce((a, b) => a + b, 0) / forceBuffer.length;
  }

  let _scaleCircle = null;

  function _isTouchInCircle(touch, padding = 0) {
    if (!_scaleCircle) return false;
    const rect = _scaleCircle.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const r = rect.width / 2 + padding;
    const dx = touch.clientX - cx;
    const dy = touch.clientY - cy;
    return (dx * dx + dy * dy) <= (r * r);
  }

  function _getTouchList(e) {
    const map = new Map();
    const touches = e.touches && e.touches.length ? Array.from(e.touches) : [];
    const changed = e.changedTouches && e.changedTouches.length ? Array.from(e.changedTouches) : [];
    touches.concat(changed).forEach((t, idx) => {
      const key = typeof t.identifier === 'number' ? t.identifier : `idx-${idx}`;
      map.set(key, t);
    });
    return Array.from(map.values());
  }

  function _pickTouchInCircle(e) {
    const list = _getTouchList(e);
    const inCircle = list.filter((t) => _isTouchInCircle(t, CIRCLE_HIT_PADDING_PX));
    if (inCircle.length === 0) return null;
    // Prefer the touch with strongest force when multiple touches exist.
    return inCircle.reduce((best, t) => ((t.force || 0) > (best.force || 0) ? t : best), inCircle[0]);
  }

  function _readTouchForce(touch) {
    const force = typeof touch.force === 'number' ? touch.force : 0;
    const webkitForce = typeof touch.webkitForce === 'number' ? touch.webkitForce : 0;
    // Some iOS Safari builds expose webkitForce instead of force, often in 0..3 range.
    const normalizedWebkit = webkitForce > 1 ? webkitForce / 3 : webkitForce;
    return Math.max(force, normalizedWebkit, 0);
  }

  function _handleTouch(e) {
    const touch = _pickTouchInCircle(e);
    if (!touch) {
      // If active touch moved out of target area, treat as touch end for measuring.
      if (isActive && _onForceEnd) {
        isActive = false;
        _onForceEnd({ lastSmoothed: smoothedForce });
      }
      return;
    }

    // Only suppress default behavior when we are actively reading a touch in the scale area.
    e.preventDefault();

    const forceValue = _readTouchForce(touch);
    const hasForce = forceValue > 0;

    if (hasForce) {
      if (forceSupported === null || forceSupported === false) {
        forceSupported = true;
        if (_onConnectionChange) _onConnectionChange(true);
      }

      currentRawForce = forceValue;
      smoothedForce = _addToBuffer(currentRawForce);
      isActive = true;
      lastForceTime = Date.now();

      if (_onForceChange) {
        _onForceChange({
          raw: currentRawForce,
          smoothed: smoothedForce,
          hasForce: true,
        });
      }
    } else {
      // Touch exists but no real force data on this sample.
      // Keep short grace window to tolerate Safari force sampling dropouts.
      const inGrace = Date.now() - lastForceTime <= NO_FORCE_GRACE_MS;
      isActive = true;
      if (_onForceChange) {
        _onForceChange({
          raw: inGrace ? currentRawForce : 0,
          smoothed: inGrace ? smoothedForce : 0,
          hasForce: inGrace,
        });
      }
    }
  }

  function _handleTouchEnd(e) {
    // A touch ended somewhere on the page; only end measurement when scale-area touch is gone.
    const touch = _pickTouchInCircle(e);
    if (touch) {
      _handleTouch(e);
      return;
    }

    isActive = false;
    if (_onForceEnd) {
      _onForceEnd({ lastSmoothed: smoothedForce });
    }
  }

  function _handleForceChange(e) {
    // WebKit-specific: fires when force value changes
    _handleTouch(e);
  }

  function init() {
    const opts = { passive: false };
    window.addEventListener('touchstart', _handleTouch, opts);
    window.addEventListener('touchmove', _handleTouch, opts);
    window.addEventListener('touchend', _handleTouchEnd, opts);
    window.addEventListener('touchcancel', _handleTouchEnd, opts);
    // WebKit-specific event for force changes without finger movement
    window.addEventListener('touchforcechange', _handleForceChange, opts);

    // Do not hard-fail force support by timeout; some devices only report force after deeper press.
  }

  function onForceChange(cb) { _onForceChange = cb; }
  function onForceEnd(cb) { _onForceEnd = cb; }
  function onConnectionChange(cb) { _onConnectionChange = cb; }

  function getRawForce() { return currentRawForce; }
  function getSmoothedForce() { return smoothedForce; }
  function getIsActive() { return isActive; }
  function isSupported() { return forceSupported; }

  function setScaleCircle(el) { _scaleCircle = el; }

  function resetBuffer() {
    forceBuffer = [];
    smoothedForce = 0;
  }

  return {
    init, onForceChange, onForceEnd, onConnectionChange,
    getRawForce, getSmoothedForce, getIsActive, isSupported, setScaleCircle, resetBuffer,
  };
})();
