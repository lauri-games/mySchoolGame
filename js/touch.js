// ─────────────────────────────────────────────
//  touch.js – Virtual joystick + touch camera + action buttons
// ─────────────────────────────────────────────
/* jshint esversion: 6 */

const TouchControls = (() => {

  // Touch-detection flag (set externally via init)
  let enabled = false;

  // ── Joystick state ──────────────────────────────────────────────────
  let joyTouchId = null;
  let joyOriginX = 0;
  let joyOriginY = 0;
  let joyDX = 0;        // normalised -1..1
  let joyDY = 0;

  const JOY_DEADZONE = 15;   // px
  const JOY_MAX_R   = 60;    // px

  // ── Look state ──────────────────────────────────────────────────────
  let lookTouchId = null;
  let lookLastX = 0;
  let lookLastY = 0;
  let lookDeltaX = 0;   // accumulated since last frame
  let lookDeltaY = 0;
  const LOOK_SENSITIVITY = 0.005; // rad per px

  // ── Joystick canvas ─────────────────────────────────────────────────
  let joyCanvas = null;
  let joyCtx    = null;

  // ── Action button refs ──────────────────────────────────────────────
  let btnHide = null;
  let btnStairUp = null;
  let btnStairDown = null;

  // Callbacks
  let onHide = null;
  let onStairUp = null;
  let onStairDown = null;

  // ── Init ────────────────────────────────────────────────────────────

  function init(callbacks) {
    enabled = true;
    onHide     = callbacks.onHide     || null;
    onStairUp  = callbacks.onStairUp  || null;
    onStairDown = callbacks.onStairDown || null;

    // Show touch UI
    const el = document.getElementById('touch-controls');
    if (el) el.style.display = 'block';

    // Joystick canvas
    joyCanvas = document.getElementById('touch-joystick-canvas');
    if (joyCanvas) {
      joyCtx = joyCanvas.getContext('2d');
      joyCanvas.width  = 200;
      joyCanvas.height = 200;
    }

    // Action buttons
    btnHide      = document.getElementById('touch-btn-hide');
    btnStairUp   = document.getElementById('touch-btn-stair-up');
    btnStairDown = document.getElementById('touch-btn-stair-down');

    if (btnHide) btnHide.addEventListener('touchstart', _onHide, { passive: false });
    if (btnStairUp) btnStairUp.addEventListener('touchstart', _onStairUp, { passive: false });
    if (btnStairDown) btnStairDown.addEventListener('touchstart', _onStairDown, { passive: false });

    // Touch event listeners on whole document
    document.addEventListener('touchstart',  _onTouchStart,  { passive: false });
    document.addEventListener('touchmove',   _onTouchMove,   { passive: false });
    document.addEventListener('touchend',    _onTouchEnd,    { passive: false });
    document.addEventListener('touchcancel', _onTouchEnd,    { passive: false });
  }

  function isEnabled() { return enabled; }

  // ── Action button handlers ──────────────────────────────────────────

  function _onHide(e) {
    e.preventDefault();
    if (onHide) onHide();
  }

  function _onStairUp(e) {
    e.preventDefault();
    if (onStairUp) onStairUp();
  }

  function _onStairDown(e) {
    e.preventDefault();
    if (onStairDown) onStairDown();
  }

  // ── Touch event routing ─────────────────────────────────────────────

  function _isButton(target) {
    return target && (target.classList.contains('touch-btn') ||
           target.closest('.touch-btn'));
  }

  function _onTouchStart(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];

      // Skip if touching a button
      if (_isButton(t.target)) continue;

      const x = t.clientX;
      const halfW = window.innerWidth / 2;

      if (x < halfW && joyTouchId === null) {
        // Left half → joystick
        joyTouchId = t.identifier;
        joyOriginX = t.clientX;
        joyOriginY = t.clientY;
        joyDX = 0;
        joyDY = 0;
        e.preventDefault();
      } else if (x >= halfW && lookTouchId === null) {
        // Right half → camera look
        lookTouchId = t.identifier;
        lookLastX = t.clientX;
        lookLastY = t.clientY;
        lookDeltaX = 0;
        lookDeltaY = 0;
        e.preventDefault();
      }
    }
  }

  function _onTouchMove(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];

      if (t.identifier === joyTouchId) {
        let dx = t.clientX - joyOriginX;
        let dy = t.clientY - joyOriginY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < JOY_DEADZONE) {
          joyDX = 0;
          joyDY = 0;
        } else {
          // Clamp to max radius
          const clamped = Math.min(dist, JOY_MAX_R);
          joyDX = (dx / dist) * (clamped / JOY_MAX_R);
          joyDY = (dy / dist) * (clamped / JOY_MAX_R);
        }
        e.preventDefault();

      } else if (t.identifier === lookTouchId) {
        lookDeltaX += (t.clientX - lookLastX);
        lookDeltaY += (t.clientY - lookLastY);
        lookLastX = t.clientX;
        lookLastY = t.clientY;
        e.preventDefault();
      }
    }
  }

  function _onTouchEnd(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];

      if (t.identifier === joyTouchId) {
        joyTouchId = null;
        joyDX = 0;
        joyDY = 0;
      }
      if (t.identifier === lookTouchId) {
        lookTouchId = null;
      }
    }
  }

  // ── Per-frame update (draw joystick, consume look deltas) ───────────

  function update() {
    _drawJoystick();
  }

  function _drawJoystick() {
    if (!joyCtx) return;
    const w = joyCanvas.width;
    const h = joyCanvas.height;
    joyCtx.clearRect(0, 0, w, h);

    if (joyTouchId === null) return;

    const cx = w / 2;
    const cy = h / 2;

    // Outer ring
    joyCtx.beginPath();
    joyCtx.arc(cx, cy, JOY_MAX_R, 0, Math.PI * 2);
    joyCtx.fillStyle = 'rgba(255,255,255,0.12)';
    joyCtx.fill();
    joyCtx.strokeStyle = 'rgba(255,255,255,0.25)';
    joyCtx.lineWidth = 2;
    joyCtx.stroke();

    // Inner thumb
    const thumbX = cx + joyDX * JOY_MAX_R;
    const thumbY = cy + joyDY * JOY_MAX_R;
    joyCtx.beginPath();
    joyCtx.arc(thumbX, thumbY, 20, 0, Math.PI * 2);
    joyCtx.fillStyle = 'rgba(255,255,255,0.45)';
    joyCtx.fill();
  }

  // ── Public getters ──────────────────────────────────────────────────

  /** Returns { moveX, moveZ } normalised -1..1 (moveZ is forward, in screen-Y) */
  function getJoystick() {
    return { moveX: joyDX, moveZ: joyDY };
  }

  /** Returns and resets accumulated look delta (radians) */
  function consumeLookDelta() {
    const dx = lookDeltaX * LOOK_SENSITIVITY;
    const dy = lookDeltaY * LOOK_SENSITIVITY;
    lookDeltaX = 0;
    lookDeltaY = 0;
    return { yaw: dx, pitch: dy };
  }

  // ── Show/hide stair buttons based on tile ───────────────────────────

  function showStairButtons(canUp, canDown) {
    if (btnStairUp)   btnStairUp.style.display   = canUp   ? 'flex' : 'none';
    if (btnStairDown) btnStairDown.style.display  = canDown ? 'flex' : 'none';
  }

  return {
    init,
    isEnabled,
    update,
    getJoystick,
    consumeLookDelta,
    showStairButtons,
  };
})();
