/**
 * SpoonForce - Touch.force 传感模块
 */
const ForceSensor = (() => {
  const BUFFER_SIZE = 10;
  let forceBuffer = [];
  let currentRawForce = 0;
  let smoothedForce = 0;
  let isActive = false;
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

  function _isTouchInCircle(touch) {
    if (!_scaleCircle) return false;
    const rect = _scaleCircle.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const r = rect.width / 2;
    const dx = touch.clientX - cx;
    const dy = touch.clientY - cy;
    return (dx * dx + dy * dy) <= (r * r);
  }

  function _handleTouch(e) {
    // Don't prevent default on interactive elements (buttons, inputs, etc.)
    const tag = e.target.tagName;
    const isInteractive = tag === 'BUTTON' || tag === 'INPUT' || tag === 'LABEL' || tag === 'A'
      || e.target.closest('button') || e.target.closest('input') || e.target.closest('.panel');
    if (!isInteractive) {
      e.preventDefault();
    }

    const touch = e.touches[0];
    if (!touch) return;

    // Only respond to touches inside the scale circle
    if (!_isTouchInCircle(touch)) return;

    const hasForce = 'force' in touch && touch.force > 0;

    if (hasForce) {
      if (forceSupported === null || forceSupported === false) {
        forceSupported = true;
        if (_onConnectionChange) _onConnectionChange(true);
      }

      currentRawForce = touch.force;
      smoothedForce = _addToBuffer(currentRawForce);
      isActive = true;

      if (_onForceChange) {
        _onForceChange({
          raw: currentRawForce,
          smoothed: smoothedForce,
          hasForce: true,
        });
      }
    } else {
      // Fallback: use touch radius as pressure proxy
      // Finger contact area grows when pressing harder (~20-80 radius range)
      const rx = touch.radiusX || 0;
      const ry = touch.radiusY || 0;
      const radius = Math.max(rx, ry);

      if (radius > 0) {
        // Map radius to a pseudo-force (0.0 ~ 1.0)
        // Light tap ~20-30, hard press ~60-90
        const minR = 20;
        const maxR = 80;
        const pseudoForce = Math.min(1, Math.max(0, (radius - minR) / (maxR - minR)));

        if (forceSupported === null || forceSupported === false) {
          forceSupported = 'radius'; // special flag for radius-based mode
          if (_onConnectionChange) _onConnectionChange('radius');
        }

        currentRawForce = pseudoForce;
        smoothedForce = _addToBuffer(pseudoForce);
        isActive = true;

        if (_onForceChange) {
          _onForceChange({
            raw: pseudoForce,
            smoothed: smoothedForce,
            hasForce: true,
            radiusMode: true,
          });
        }
      } else {
        // No force AND no radius data
        isActive = true;
        if (_onForceChange) {
          _onForceChange({ raw: 0, smoothed: 0, hasForce: false });
        }
      }
    }
  }

  function _handleTouchEnd(e) {
    // Don't reset force immediately — keep last reading for lock feature
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

    // Detection: after first touch, wait 2s to see if force data arrives
    let detected = false;
    const onFirstTouch = () => {
      if (detected) return;
      detected = true;
      setTimeout(() => {
        if (forceSupported === null) {
          forceSupported = false;
          if (_onConnectionChange) _onConnectionChange(false);
        }
      }, 2000);
      window.removeEventListener('touchstart', onFirstTouch);
    };
    window.addEventListener('touchstart', onFirstTouch);
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
