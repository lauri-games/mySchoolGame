// ─────────────────────────────────────────────
//  main.js – Game loop, state management, init
// ─────────────────────────────────────────────
/* jshint esversion: 6 */

const Game = (() => {
  let renderer, scene, camera;
  let gameActive = false;
  let timeLeft   = GAME_DURATION;
  let timerAccum = 0; // accumulator for 1-second timer ticks

  // Touch device detection
  const IS_TOUCH = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

  // ── Initialisation ─────────────────────────────────────────────────

  function init() {
    // Three.js renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x0d0d0d);
    document.body.prepend(renderer.domElement);

    // Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0d0d0d, TILE3D * 4, TILE3D * 14);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);

    // Resize handler
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Input setup – touch vs pointer lock
    const clickOverlay = document.getElementById('click-overlay');

    if (IS_TOUCH) {
      // Touch device: update overlay text
      const overlaySpan = clickOverlay.querySelector('span');
      if (overlaySpan) {
        overlaySpan.innerHTML = 'Tippe um zu starten<br>' +
          '<small style="font-size:14px;color:#64748b">' +
          'Links = Joystick &nbsp; Rechts = Umsehen<br>' +
          'Buttons rechts = Verstecken / Treppen</small>';
      }

      // Tap to start (no pointer lock)
      clickOverlay.addEventListener('touchstart', (e) => {
        e.preventDefault();
        clickOverlay.classList.add('hidden');
        if (!gameActive) startGame();
      }, { passive: false });

      // Tell player module to use touch input
      Player.setTouchMode(true);

      // Init touch controls with action callbacks
      TouchControls.init({
        onHide: () => { if (gameActive) Player.toggleHide(); },
        onStairUp: () => { if (gameActive) _useStairsUp(); },
        onStairDown: () => { if (gameActive) _useStairsDown(); },
      });
    } else {
      // Desktop: pointer lock
      clickOverlay.addEventListener('click', () => {
        document.body.requestPointerLock();
      });

      document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === document.body) {
          clickOverlay.classList.add('hidden');
          if (!gameActive) startGame();
        } else {
          clickOverlay.classList.remove('hidden');
        }
      });
    }

    // Key handlers for hide and stairs (these trigger once, not held)
    document.addEventListener('keydown', (e) => {
      if (!gameActive) return;
      const k = e.key.toLowerCase();
      if (k === 'e') Player.toggleHide();
      if (k === 'f') _useStairsUp();
      if (k === 'g') _useStairsDown();
    });

    // Init subsystems
    UI.init(_onFloorClick);
    Minimap.init();

    // Start the render loop (even before game starts, to show the world)
    _buildCurrentFloor();
    Player.init(camera);
    TeacherManager.create(scene);

    _loop();
  }

  // ── Game start / restart ──────────────────────────────────────────

  function startGame() {
    gameActive = true;
    timeLeft   = GAME_DURATION;
    timerAccum = 0;

    selectFloor(0);
    _buildCurrentFloor();
    Player.init(camera);
    TeacherManager.create(scene);

    UI.updateTimer(timeLeft);
    UI.setActiveFloor(0);
    UI.hideEndScreen();
  }

  function _buildCurrentFloor() {
    selectFloor(CURRENT_FLOOR); // ensure LEVEL_MAP points at the correct (possibly updated) map
    World.build(scene);
  }

  // ── Floor changes ──────────────────────────────────────────────────

  function _onFloorClick(floor) {
    if (!gameActive) return;
    selectFloor(floor);
    _buildCurrentFloor();
    Player.teleportToSpawn();
    TeacherManager.create(scene);
    UI.setActiveFloor(CURRENT_FLOOR);
  }

  function _useStairsUp() {
    if (!gameActive) return;
    const pos = Player.getPosition();
    if (World.tileAtWorld(pos.x, pos.z) !== T_STAIRS) return;
    if (CURRENT_FLOOR < LEVEL_MAPS.length - 1) {
      selectFloor(CURRENT_FLOOR + 1);
      _buildCurrentFloor();
      Player.teleportToSpawn();
      TeacherManager.create(scene);
      UI.setActiveFloor(CURRENT_FLOOR);
    }
  }

  function _useStairsDown() {
    if (!gameActive) return;
    const pos = Player.getPosition();
    if (World.tileAtWorld(pos.x, pos.z) !== T_STAIRS) return;
    if (CURRENT_FLOOR > 0) {
      selectFloor(CURRENT_FLOOR - 1);
      _buildCurrentFloor();
      Player.teleportToSpawn();
      TeacherManager.create(scene);
      UI.setActiveFloor(CURRENT_FLOOR);
    }
  }

  // ── End states ─────────────────────────────────────────────────────

  function _gameOver() {
    gameActive = false;
    UI.showGameOver(() => {
      startGame();
      if (!IS_TOUCH) document.body.requestPointerLock();
    });
  }

  function _gameWon() {
    gameActive = false;
    UI.showWin(() => {
      startGame();
      if (!IS_TOUCH) document.body.requestPointerLock();
    });
  }

  // ── Main loop ──────────────────────────────────────────────────────

  let lastTime = 0;

  function _loop(now) {
    requestAnimationFrame(_loop);

    if (!now) now = 0;
    const delta = Math.min((now - lastTime) / 1000, 0.1); // seconds, capped
    lastTime = now;

    if (gameActive) {
      // Touch input → player
      if (IS_TOUCH) {
        const joy = TouchControls.getJoystick();
        Player.applyTouchInput(joy.moveX, joy.moveZ);

        const look = TouchControls.consumeLookDelta();
        Player.applyTouchLook(look.yaw, look.pitch);

        TouchControls.update();
      }

      // Player movement
      Player.update(delta);

      // Teacher AI
      TeacherManager.update(delta);

      // Check catch
      if (TeacherManager.checkCatch() && !Player.getIsHiding()) {
        _gameOver();
        return;
      }

      // Timer
      timerAccum += delta;
      if (timerAccum >= 1) {
        timerAccum -= 1;
        timeLeft--;
        UI.updateTimer(timeLeft);
        if (timeLeft <= 0) {
          _gameWon();
          return;
        }
      }

      // Stair hint
      const pos = Player.getPosition();
      const curTile = World.tileAtWorld(pos.x, pos.z);
      const onStairs = curTile === T_STAIRS;
      const canUp   = onStairs && CURRENT_FLOOR < LEVEL_MAPS.length - 1;
      const canDown = onStairs && CURRENT_FLOOR > 0;

      if (IS_TOUCH) {
        TouchControls.showStairButtons(canUp, canDown);
        UI.updateStairHint('');
      } else {
        let hint = '';
        if (canUp) hint += '[F] ↑';
        if (canDown) {
          if (hint) hint += '  ';
          hint += '[G] ↓';
        }
        UI.updateStairHint(hint);
      }

      // Teacher state display + chase warning
      UI.updateTeacherState(TeacherManager.getStatesString());
      UI.setChaseWarning(TeacherManager.isAnyChasing());

      // Minimap
      Minimap.draw();
    }

    // Render
    renderer.render(scene, camera);
  }

  return { init, rebuildFloor: _buildCurrentFloor };
})();

// Boot
window.addEventListener('DOMContentLoaded', () => {
  Game.init();
});

// If the editor map arrives asynchronously after the game already built the
// world, rebuild immediately so the custom map is visible right away.
window.addEventListener('editorMapLoaded', () => {
  console.log('[Game] editorMapLoaded → rebuild world');
  Game.rebuildFloor();
});
