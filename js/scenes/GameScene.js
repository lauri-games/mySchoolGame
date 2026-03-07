// ─────────────────────────────────────────────
//  GameScene – main gameplay scene
//  Handles: tile map, player, teacher AI, vision cones, physics, win/lose
// ─────────────────────────────────────────────
/* jshint esversion: 6 */

class GameScene extends Phaser.Scene {

  constructor() {
    super('GameScene');
  }

  // ── Texture generation ────────────────────────────────────────────────────
  //  All sprites face RIGHT (angle 0). Head = right, body = centre-left.
  //  Phaser rotates the sprite for every other direction.
  _makeTextures() {
    const S = 36;  // sprite canvas size
    const cy = S / 2; // vertical centre = 18

    // ── Student (Schüler) ─────────────────────────────────────────────────
    const pg = this.make.graphics({ x: 0, y: 0, add: false });

    // Drop shadow
    pg.fillStyle(0x000000, 0.18);
    pg.fillEllipse(18, 20, 30, 18);

    // Backpack (dark blue rectangle on the back)
    pg.fillStyle(0x1e3a8a, 1);
    pg.fillRoundedRect(1, cy - 7, 10, 14, 3);
    pg.lineStyle(1, 0x172554, 1);
    pg.strokeRoundedRect(1, cy - 7, 10, 14, 3);

    // Hoodie body (bright blue)
    pg.fillStyle(0x3b82f6, 1);
    pg.fillRoundedRect(7, cy - 9, 16, 18, 5);

    // Hoodie centre seam
    pg.lineStyle(1, 0x2563eb, 0.6);
    pg.lineBetween(15, cy - 6, 15, cy + 6);

    // Sleeves (slightly darker)
    pg.fillStyle(0x2563eb, 1);
    pg.fillRoundedRect(10, cy - 11, 7, 3, 1);
    pg.fillRoundedRect(10, cy + 8, 7, 3, 1);

    // Head – hair base (brown, full circle behind face)
    pg.fillStyle(0x7c4a1e, 1);
    pg.fillCircle(27, cy, 8);

    // Face (skin tone, shifted forward)
    pg.fillStyle(0xf5cba7, 1);
    pg.fillCircle(28, cy, 6);

    // Ears (small skin circles on sides)
    pg.fillStyle(0xf0b890, 1);
    pg.fillCircle(25, cy - 6, 2);
    pg.fillCircle(25, cy + 6, 2);

    // Eyes
    pg.fillStyle(0x1a1a1a, 1);
    pg.fillCircle(31, cy - 2.5, 1.3);
    pg.fillCircle(31, cy + 2.5, 1.3);

    // Smile
    pg.lineStyle(1, 0xc0392b, 0.8);
    pg.beginPath();
    pg.arc(30, cy, 2, Phaser.Math.DegToRad(-50), Phaser.Math.DegToRad(50), false);
    pg.strokePath();

    pg.generateTexture('player', S, S);
    pg.destroy();

    // ── Teacher (Lehrer) ──────────────────────────────────────────────────
    const tg = this.make.graphics({ x: 0, y: 0, add: false });

    // Drop shadow
    tg.fillStyle(0x000000, 0.18);
    tg.fillEllipse(18, 20, 32, 20);

    // Blazer / suit jacket (dark brown, slightly wider than student)
    tg.fillStyle(0x3e2723, 1);
    tg.fillRoundedRect(4, cy - 10, 20, 20, 5);

    // Elbow patches (teacher cliché)
    tg.fillStyle(0x5d4037, 1);
    tg.fillEllipse(10, cy - 10, 6, 4);
    tg.fillEllipse(10, cy + 10, 6, 4);

    // Shirt collar (white V)
    tg.fillStyle(0xffffff, 1);
    tg.fillTriangle(18, cy - 6, 18, cy + 6, 23, cy);

    // Tie (red)
    tg.fillStyle(0xdc2626, 1);
    tg.fillRect(17, cy - 4, 3, 8);
    tg.fillTriangle(16, cy + 4, 21, cy + 4, 18, cy + 8);

    // Head – gray/white hair base (full circle)
    tg.fillStyle(0xd1d5db, 1);
    tg.fillCircle(28, cy, 8);

    // Bald spot on top (skin showing through)
    tg.fillStyle(0xf5cba7, 0.6);
    tg.fillCircle(26, cy, 3);

    // Face (skin tone, shifted forward)
    tg.fillStyle(0xf5cba7, 1);
    tg.fillCircle(29, cy, 6);

    // Ears
    tg.fillStyle(0xf0b890, 1);
    tg.fillCircle(25, cy - 6, 2);
    tg.fillCircle(25, cy + 6, 2);

    // Glasses – bold rims (key identifier)
    tg.lineStyle(2, 0x1f2937, 1);
    tg.strokeCircle(31, cy - 3, 3);
    tg.strokeCircle(31, cy + 3, 3);
    // Bridge
    tg.lineStyle(1.5, 0x1f2937, 1);
    tg.lineBetween(31, cy - 0.5, 31, cy + 0.5);
    // Temple arms going back
    tg.lineStyle(1.2, 0x1f2937, 0.8);
    tg.lineBetween(28, cy - 3, 24, cy - 5);
    tg.lineBetween(28, cy + 3, 24, cy + 5);

    // Lens tint
    tg.fillStyle(0x93c5fd, 0.25);
    tg.fillCircle(31, cy - 3, 2.5);
    tg.fillCircle(31, cy + 3, 2.5);

    // Eyes behind lenses
    tg.fillStyle(0x1a1a1a, 1);
    tg.fillCircle(32, cy - 3, 1);
    tg.fillCircle(32, cy + 3, 1);

    // Stern eyebrows
    tg.lineStyle(1.5, 0x374151, 1);
    tg.lineBetween(31, cy - 6, 34, cy - 5);
    tg.lineBetween(31, cy + 6, 34, cy + 5);

    // Frown
    tg.lineStyle(1, 0xc0392b, 0.7);
    tg.beginPath();
    tg.arc(31, cy + 1, 2, Phaser.Math.DegToRad(130), Phaser.Math.DegToRad(230), false);
    tg.strokePath();

    tg.generateTexture('teacher', S, S);
    tg.destroy();

    // ── Invisible wall texture ────────────────────────────────────────────
    const pw = this.make.graphics({ x: 0, y: 0, add: false });
    pw.fillStyle(0xffffff, 0);
    pw.fillRect(0, 0, TILE, TILE);
    pw.generateTexture('wall_px', TILE, TILE);
    pw.destroy();
  }

  // ── Draw tile-map visuals ─────────────────────────────────────────────────
  // helper graphics object stored so we can clear & redraw when floors change
  _buildMap() {
    if (!this.mapGfx) {
      this.mapGfx = this.add.graphics();
      this.mapGfx.setDepth(0);
    }

    this.mapGfx.clear();

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const tile = LEVEL_MAP[row][col];
        const x = col * TILE;
        const y = row * TILE;

        if (tile === T_WALL) {
          this.mapGfx.fillStyle(COL.WALL, 1);
          this.mapGfx.fillRect(x, y, TILE, TILE);
          // lighter top-edge to give a 3-D hint
          this.mapGfx.fillStyle(COL.WALL_TOP, 1);
          this.mapGfx.fillRect(x, y, TILE, 5);
        } else {
          // checkerboard floor
          const floorCol = (row + col) % 2 === 0 ? COL.FLOOR_A : COL.FLOOR_B;
          this.mapGfx.fillStyle(floorCol, 1);
          this.mapGfx.fillRect(x, y, TILE, TILE);

          if (tile === T_HIDE) {
            // draw a locker / desk outline
            this.mapGfx.fillStyle(COL.HIDE_TILE, 1);
            this.mapGfx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
            this.mapGfx.fillStyle(COL.HIDE_FRONT, 1);
            this.mapGfx.fillRect(x + 6, y + 7, TILE - 12, TILE - 14);
          } else if (tile === T_STAIRS) {
            // Draw prominent staircase indicator
            // Background circle
            this.mapGfx.fillStyle(COL.STAIRS, 1);
            this.mapGfx.fillCircle(x + TILE / 2, y + TILE / 2, TILE / 2.2);
            
            // Border circle
            this.mapGfx.lineStyle(2, 0x000000, 0.8);
            this.mapGfx.strokeCircle(x + TILE / 2, y + TILE / 2, TILE / 2.2);
            
            // Upward triangle (larger)
            this.mapGfx.fillStyle(0x000000, 1);
            this.mapGfx.fillTriangle(
              x + TILE / 2, y + 6,
              x + 10, y + 18,
              x + TILE - 10, y + 18,
            );
            
            // Downward triangle (larger)
            this.mapGfx.fillTriangle(
              x + TILE / 2, y + TILE - 6,
              x + 10, y + TILE - 18,
              x + TILE - 10, y + TILE - 18,
            );
          }
        }
      }
    }
  }

  // ── Build physics wall bodies ─────────────────────────────────────────────
  _buildWalls() {
    this.walls = this.physics.add.staticGroup();

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (LEVEL_MAP[row][col] === T_WALL) {
          const wx = col * TILE + TILE / 2;
          const wy = row * TILE + TILE / 2;
          const body = this.walls.create(wx, wy, 'wall_px');
          body.setAlpha(0);
          body.refreshBody();
        }
      }
    }
  }

  // ── Create player ─────────────────────────────────────────────────────────
  _createPlayer() {
    const x = PLAYER_SPAWN.col * TILE + TILE / 2;
    const y = PLAYER_SPAWN.row * TILE + TILE / 2;

    this.player             = this.physics.add.sprite(x, y, 'player');
    this.player.setDepth(10);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(26, 26);   // slightly smaller than TILE for corridor clearance
    this.player.isHiding    = false;
    this.player.facing      = 0;        // angle in radians (0 = right)

    // Hide overlay (semi-transparent circle drawn in place when hiding)
    this.hideOverlay = this.add.graphics();
    this.hideOverlay.setDepth(11);
  }

  // ── Create teachers ───────────────────────────────────────────────────────
  _createTeachers() {
    this.teachers = [];

    TEACHER_DEFS.forEach((def) => {
      const x = def.col * TILE + TILE / 2;
      const y = def.row * TILE + TILE / 2;

      const sprite = this.physics.add.sprite(x, y, 'teacher');
      sprite.setDepth(10);
      sprite.setCollideWorldBounds(true);
      sprite.body.setSize(26, 26);

      // Alert "!" text above teacher
      const alert = this.add.text(x, y - 28, '!', {
        fontSize: '20px',
        fontFamily: 'monospace',
        color: '#ef4444',
        stroke: '#000000',
        strokeThickness: 3,
      });
      alert.setDepth(20);
      alert.setOrigin(0.5, 1);
      alert.setVisible(false);

      // Physics collider with walls
      this.physics.add.collider(sprite, this.walls);

      this.teachers.push({
        sprite,
        alert,
        state: STATE.PATROL,
        facing: 0,
        waypointIndex:   0,
        waypoints:       def.waypoints.map(([c, r]) => ({
          x: c * TILE + TILE / 2,
          y: r * TILE + TILE / 2,
        })),
        lastKnownPos:    null,
        searchWait:      0,
        arrivedAtSearch: false,
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  create()
  // ─────────────────────────────────────────────────────────────────────────
  create() {
    this._makeTextures();
    this._buildMap();
    this._buildWalls();

    // Vision-cone graphics layer (drawn beneath entities)
    this.visionGfx = this.add.graphics();
    this.visionGfx.setDepth(5);

    this._createPlayer();
    this._createTeachers();

    // Player collides with walls
    this.physics.add.collider(this.player, this.walls);

    // Teacher catches player → game over
    this.teachers.forEach((t) => {
      this.physics.add.overlap(t.sprite, this.player, this._onCaught, null, this);
    });

    // Input
    this.keys = this.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.UP,
      down:  Phaser.Input.Keyboard.KeyCodes.DOWN,
      left:  Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      hide:  Phaser.Input.Keyboard.KeyCodes.E,
    });
    this.input.keyboard.on('keydown-E', this._toggleHide, this);
    // keybindings for stairs movement
    this.input.keyboard.on('keydown-F', this._useStairsUp, this);
    this.input.keyboard.on('keydown-G', this._useStairsDown, this);

    // Timer
    // restore timer if we switched floors, otherwise start fresh
    this.timeLeft   = this.registry.get('timeLeft') ?? GAME_DURATION;
    this.gameActive = true;
    this.registry.set('timeLeft', this.timeLeft);
    this.registry.set('teacherState', '');

    this.timerEvent = this.time.addEvent({
      delay:         1000,
      callback:      this._tickTimer,
      callbackScope: this,
      repeat:        GAME_DURATION - 1,
    });

    // Launch HUD scene in parallel
    this.scene.launch('UIScene');
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Helper: tile at pixel (px, py)
  // ─────────────────────────────────────────────────────────────────────────
  _tileAt(px, py) {
    const col = Math.floor(px / TILE);
    const row = Math.floor(py / TILE);
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return T_WALL;
    return LEVEL_MAP[row][col];
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Line-of-Sight ray cast (world pixels)
  //  Returns true if no wall tile blocks the path.
  // ─────────────────────────────────────────────────────────────────────────
  _hasLOS(x1, y1, x2, y2) {
    const dx    = x2 - x1;
    const dy    = y2 - y1;
    const dist  = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(dist / (TILE * 0.45));

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (this._tileAt(x1 + dx * t, y1 + dy * t) === T_WALL) return false;
    }
    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Can teacher (t) see the player?
  // ─────────────────────────────────────────────────────────────────────────
  _canSeePlayer(t) {
    if (this.player.isHiding) return false;

    const dx   = this.player.x - t.sprite.x;
    const dy   = this.player.y - t.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > VISION_RANGE) return false;

    const angleToPlayer = Math.atan2(dy, dx);
    let diff = angleToPlayer - t.facing;
    // Normalise to [-π, π]
    while (diff >  Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;

    const half = (VISION_ANGLE * Math.PI / 180) / 2;
    if (Math.abs(diff) > half) return false;

    return this._hasLOS(t.sprite.x, t.sprite.y, this.player.x, this.player.y);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Draw all vision cones
  // ─────────────────────────────────────────────────────────────────────────
  _drawVisionCones() {
    this.visionGfx.clear();

    const STEPS    = 24;
    const halfAngle = (VISION_ANGLE * Math.PI / 180) / 2;

    this.teachers.forEach((t) => {
      const chasing  = t.state === STATE.CHASE;
      const color    = chasing ? COL.VISION_ALERT : COL.VISION_CONE;
      const alpha    = chasing ? 0.30 : 0.18;

      this.visionGfx.fillStyle(color, alpha);
      this.visionGfx.lineStyle(1, color, alpha * 1.5);

      const startA = t.facing - halfAngle;
      const endA   = t.facing + halfAngle;

      this.visionGfx.beginPath();
      this.visionGfx.moveTo(t.sprite.x, t.sprite.y);

      for (let i = 0; i <= STEPS; i++) {
        const a = startA + (endA - startA) * (i / STEPS);
        this.visionGfx.lineTo(
          t.sprite.x + Math.cos(a) * VISION_RANGE,
          t.sprite.y + Math.sin(a) * VISION_RANGE,
        );
      }

      this.visionGfx.closePath();
      this.visionGfx.fillPath();
      this.visionGfx.strokePath();
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Move teacher toward a pixel target; returns true when arrived
  // ─────────────────────────────────────────────────────────────────────────
  _moveToward(t, tx, ty, speed) {
    const dx   = tx - t.sprite.x;
    const dy   = ty - t.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 4) {
      t.sprite.setVelocity(0, 0);
      return true;
    }

    t.sprite.setVelocity((dx / dist) * speed, (dy / dist) * speed);
    t.facing = Math.atan2(dy, dx);
    t.sprite.setRotation(t.facing);
    return false;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Teacher AI update
  // ─────────────────────────────────────────────────────────────────────────
  _updateTeacher(t, delta) {
    const sees = this._canSeePlayer(t);

    switch (t.state) {

      // ░░ PATROL ░░
      case STATE.PATROL: {
        if (sees) {
          t.state = STATE.CHASE;
          break;
        }

        const wp      = t.waypoints[t.waypointIndex];
        const arrived = this._moveToward(t, wp.x, wp.y, TEACHER_PATROL_SPD);

        if (arrived) {
          t.waypointIndex = (t.waypointIndex + 1) % t.waypoints.length;
        }
        break;
      }

      // ░░ CHASE ░░
      case STATE.CHASE: {
        if (!sees) {
          // Lost sight – remember last known position
          t.lastKnownPos     = { x: this.player.x, y: this.player.y };
          t.arrivedAtSearch  = false;
          t.searchWait       = SEARCH_WAIT_MS;
          t.state            = STATE.SEARCH;
          break;
        }

        this._moveToward(t, this.player.x, this.player.y, TEACHER_CHASE_SPD);
        break;
      }

      // ░░ SEARCH ░░
      case STATE.SEARCH: {
        if (sees) {
          t.state = STATE.CHASE;
          break;
        }

        if (!t.arrivedAtSearch) {
          const arrived = this._moveToward(
            t, t.lastKnownPos.x, t.lastKnownPos.y, TEACHER_SEARCH_SPD,
          );
          if (arrived) {
            t.sprite.setVelocity(0, 0);
            t.arrivedAtSearch = true;
          }
        } else {
          // Stand still and wait
          t.sprite.setVelocity(0, 0);
          t.searchWait -= delta;

          if (t.searchWait <= 0) {
            t.state = STATE.PATROL;
          }
        }
        break;
      }
    }

    // Show "!" alert when chasing
    t.alert.setVisible(t.state === STATE.CHASE);
    t.alert.setPosition(t.sprite.x, t.sprite.y - 22);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Timer tick (every 1 s)
  // ─────────────────────────────────────────────────────────────────────────
  _tickTimer() {
    if (!this.gameActive) return;
    this.timeLeft--;
    this.registry.set('timeLeft', this.timeLeft);

    if (this.timeLeft <= 0) {
      this._gameWon();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Toggle hide (key E)
  // ─────────────────────────────────────────────────────────────────────────
  _toggleHide() {
    if (!this.gameActive) return;

    const tile = this._tileAt(this.player.x, this.player.y);

    if (!this.player.isHiding && tile === T_HIDE) {
      this.player.isHiding = true;
      this.player.setAlpha(0.35);
      this.player.setVelocity(0, 0);
    } else if (this.player.isHiding) {
      this.player.isHiding = false;
      this.player.setAlpha(1);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Stairs use handlers
  _useStairsUp() {
    if (!this.gameActive) return;
    const tile = this._tileAt(this.player.x, this.player.y);
    if (tile !== T_STAIRS) return;
    if (CURRENT_FLOOR < LEVEL_MAPS.length - 1) {
      selectFloor(CURRENT_FLOOR + 1);
      this._floorChanged();
    }
  }

  _useStairsDown() {
    if (!this.gameActive) return;
    const tile = this._tileAt(this.player.x, this.player.y);
    if (tile !== T_STAIRS) return;
    if (CURRENT_FLOOR > 0) {
      selectFloor(CURRENT_FLOOR - 1);
      this._floorChanged();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Teacher caught player
  // ─────────────────────────────────────────────────────────────────────────
  _onCaught() {
    if (!this.gameActive) return;
    this._gameOver();
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  End states
  // ─────────────────────────────────────────────────────────────────────────
  _gameOver() {
    this.gameActive = false;
    this.timerEvent.remove();

    // Freeze everything
    this.player.setVelocity(0, 0);
    this.teachers.forEach((t) => t.sprite.setVelocity(0, 0));
    this.physics.pause();

    // Brief flash, then switch scene
    this.cameras.main.flash(300, 220, 30, 30);
    this.time.delayedCall(700, () => {
      this.scene.stop('UIScene');
      this.scene.start('GameOverScene');
    });
  }

  _gameWon() {
    this.gameActive = false;
    this.timerEvent.remove();

    this.player.setVelocity(0, 0);
    this.teachers.forEach((t) => t.sprite.setVelocity(0, 0));
    this.physics.pause();

    this.cameras.main.flash(400, 30, 220, 30);
    this.time.delayedCall(700, () => {
      this.scene.stop('UIScene');
      this.scene.start('WinScene');
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  update()
  // ─────────────────────────────────────────────────────────────────────────
  // helper used when the floor has been changed mid-game
  _floorChanged() {
    // current floor already set via selectFloor()
    // reposition player
    this.player.setPosition(PLAYER_SPAWN.col * TILE + TILE / 2, PLAYER_SPAWN.row * TILE + TILE / 2);

    // redraw map and walls
    this.mapGfx.clear();
    this._buildMap();
    this.walls.clear(true, true);
    this._buildWalls();

    // replace teachers
    this.teachers.forEach((t) => { t.sprite.destroy(); t.alert.destroy(); });
    this.teachers.length = 0;
    this._createTeachers();

    // update UI
    this.registry.set('currentFloor', CURRENT_FLOOR);
  }

  update(_time, delta) {
    if (!this.gameActive) return;

    // ── Player movement ────────────────────────────────────────────────────
    if (!this.player.isHiding) {
      const speed = PLAYER_SPEED;
      let vx = 0;
      let vy = 0;

      if (this.keys.left.isDown)  vx -= speed;
      if (this.keys.right.isDown) vx += speed;
      if (this.keys.up.isDown)    vy -= speed;
      if (this.keys.down.isDown)  vy += speed;

      // Diagonal normalisation
      if (vx !== 0 && vy !== 0) {
        vx *= 0.7071;
        vy *= 0.7071;
      }

      this.player.setVelocity(vx, vy);

      // Rotate sprite toward movement direction
      if (vx !== 0 || vy !== 0) {
        this.player.facing = Math.atan2(vy, vx);
        this.player.setRotation(this.player.facing);
      }
    }

    // ── Hide overlay (pulse indicator on locker tile) ──────────────────────
    this.hideOverlay.clear();
    const curTile = this._tileAt(this.player.x, this.player.y);
    if (curTile === T_HIDE && !this.player.isHiding) {
      // Highlight the tile, advising player they can press E
      this.hideOverlay.lineStyle(2, 0xffffff, 0.6);
      const hcol = Math.floor(this.player.x / TILE);
      const hrow = Math.floor(this.player.y / TILE);
      this.hideOverlay.strokeRect(hcol * TILE + 2, hrow * TILE + 2, TILE - 4, TILE - 4);
    }    // stairs hint
    let hint = '';
    if (curTile === T_STAIRS) {
      if (CURRENT_FLOOR < LEVEL_MAPS.length - 1) hint += '[F] ↑';
      if (CURRENT_FLOOR > 0) {
        if (hint) hint += '  ';
        hint += '[G] ↓';
      }
    }
    this.registry.set('stairHint', hint);
    // ── Vision cones ───────────────────────────────────────────────────────
    this._drawVisionCones();

    // ── Teacher AI ─────────────────────────────────────────────────────────
    this.teachers.forEach((t) => this._updateTeacher(t, delta));

    // expose teacher states to UI –────────────────────────────────────────

    // ── Expose teacher states to UI ────────────────────────────────────────
    const states = this.teachers.map((t) => t.state).join(' | ');
    this.registry.set('teacherState', states);
    // floor/other registry values already updated elsewhere
  }
}
