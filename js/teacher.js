// ─────────────────────────────────────────────
//  teacher.js – Teacher AI + 3D representation
//  AI logic mirrors the original GameScene exactly
// ─────────────────────────────────────────────
/* jshint esversion: 6 */

const TeacherManager = (() => {
  let teachers = [];

  // ── helpers (work in tile-pixel space, same as original) ──────────

  function _tileAt(px, py) {
    const col = Math.floor(px / TILE);
    const row = Math.floor(py / TILE);
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return T_WALL;
    return LEVEL_MAP[row][col];
  }

  function _hasLOS(x1, y1, x2, y2) {
    const dx   = x2 - x1;
    const dy   = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(dist / (TILE * 0.45));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (_tileAt(x1 + dx * t, y1 + dy * t) === T_WALL) return false;
    }
    return true;
  }

  function _canSeePlayer(t) {
    if (Player.getIsHiding()) return false;

    const pp = Player.getPixelPos();
    const dx   = pp.x - t.px;
    const dy   = pp.y - t.py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > VISION_RANGE) return false;

    const angleToPlayer = Math.atan2(dy, dx);
    let diff = angleToPlayer - t.facing;
    while (diff >  Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;

    const half = (VISION_ANGLE * Math.PI / 180) / 2;
    if (Math.abs(diff) > half) return false;

    return _hasLOS(t.px, t.py, pp.x, pp.y);
  }

  function _moveToward(t, tx, ty, speed, delta) {
    const dx   = tx - t.px;
    const dy   = ty - t.py;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 4) {
      return true; // arrived
    }

    const move = speed * delta;
    t.px += (dx / dist) * move;
    t.py += (dy / dist) * move;
    t.facing = Math.atan2(dy, dx);
    return false;
  }

  // ── public ────────────────────────────────────────────────────────

  function create(scene) {
    destroy(scene);

    TEACHER_DEFS.forEach((def) => {
      // 3D mesh: cylinder body + sphere head
      const group = new THREE.Group();

      // Body – cylinder
      const bodyGeo = new THREE.CylinderGeometry(0.3, 0.35, 1.4, 8);
      const bodyMat = new THREE.MeshLambertMaterial({ color: 0x3e2723 });
      const body    = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.7;
      group.add(body);

      // Head – sphere
      const headGeo = new THREE.SphereGeometry(0.25, 8, 8);
      const headMat = new THREE.MeshLambertMaterial({ color: 0xf5cba7 });
      const head    = new THREE.Mesh(headGeo, headMat);
      head.position.y = 1.6;
      group.add(head);

      // Hair
      const hairGeo = new THREE.SphereGeometry(0.27, 8, 8);
      const hairMat = new THREE.MeshLambertMaterial({ color: 0xd1d5db });
      const hair    = new THREE.Mesh(hairGeo, hairMat);
      hair.position.y = 1.65;
      hair.scale.set(1, 0.6, 1);
      group.add(hair);

      // Alert "!" sprite (billboard)
      const alertCanvas = document.createElement('canvas');
      alertCanvas.width = 64;
      alertCanvas.height = 64;
      const actx = alertCanvas.getContext('2d');
      actx.font = 'bold 48px monospace';
      actx.fillStyle = '#ef4444';
      actx.strokeStyle = '#000';
      actx.lineWidth = 4;
      actx.textAlign = 'center';
      actx.textBaseline = 'middle';
      actx.strokeText('!', 32, 32);
      actx.fillText('!', 32, 32);

      const alertTex = new THREE.CanvasTexture(alertCanvas);
      const alertMat = new THREE.SpriteMaterial({ map: alertTex, transparent: true });
      const alertSprite = new THREE.Sprite(alertMat);
      alertSprite.position.y = 2.2;
      alertSprite.scale.set(0.5, 0.5, 0.5);
      alertSprite.visible = false;
      group.add(alertSprite);

      scene.add(group);

      // Initial pixel position (tile-pixel space for AI)
      const px = def.col * TILE + TILE / 2;
      const py = def.row * TILE + TILE / 2;

      teachers.push({
        group,
        alertSprite,
        state:           STATE.PATROL,
        facing:          0,
        px, py,          // position in tile-pixel coords
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

  function destroy(scene) {
    teachers.forEach(t => {
      if (t.group) scene.remove(t.group);
    });
    teachers = [];
  }

  function update(delta) {
    teachers.forEach(t => {
      _updateAI(t, delta);

      // Sync 3D position from tile-pixel coords
      const wx = (t.px / TILE) * TILE3D;
      const wz = (t.py / TILE) * TILE3D;
      t.group.position.set(wx, 0, wz);

      // Rotate body to face direction
      t.group.rotation.y = -t.facing + Math.PI / 2;

      // Alert visibility
      t.alertSprite.visible = (t.state === STATE.CHASE);
    });
  }

  function _updateAI(t, delta) {
    const sees = _canSeePlayer(t);

    switch (t.state) {
      case STATE.PATROL: {
        if (sees) { t.state = STATE.CHASE; break; }
        const wp = t.waypoints[t.waypointIndex];
        const arrived = _moveToward(t, wp.x, wp.y, TEACHER_PATROL_SPD, delta);
        if (arrived) {
          t.waypointIndex = (t.waypointIndex + 1) % t.waypoints.length;
        }
        break;
      }

      case STATE.CHASE: {
        if (!sees) {
          const pp = Player.getPixelPos();
          t.lastKnownPos    = { x: pp.x, y: pp.y };
          t.arrivedAtSearch = false;
          t.searchWait      = SEARCH_WAIT_MS / 1000; // convert to seconds
          t.state           = STATE.SEARCH;
          break;
        }
        const pp = Player.getPixelPos();
        _moveToward(t, pp.x, pp.y, TEACHER_CHASE_SPD, delta);
        break;
      }

      case STATE.SEARCH: {
        if (sees) { t.state = STATE.CHASE; break; }
        if (!t.arrivedAtSearch) {
          const arrived = _moveToward(
            t, t.lastKnownPos.x, t.lastKnownPos.y, TEACHER_SEARCH_SPD, delta
          );
          if (arrived) t.arrivedAtSearch = true;
        } else {
          t.searchWait -= delta;
          if (t.searchWait <= 0) t.state = STATE.PATROL;
        }
        break;
      }
    }
  }

  // Check if any teacher caught the player
  function checkCatch() {
    const pp = Player.getPixelPos();
    for (const t of teachers) {
      const dx = pp.x - t.px;
      const dy = pp.y - t.py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < TILE * 0.65) return true; // caught!
    }
    return false;
  }

  // Get teacher data for minimap
  function getTeachers() { return teachers; }

  // Get states string for HUD
  function getStatesString() {
    return teachers.map(t => t.state).join(' | ');
  }

  // Is any teacher chasing?
  function isAnyChasing() {
    return teachers.some(t => t.state === STATE.CHASE);
  }

  return {
    create,
    destroy,
    update,
    checkCatch,
    getTeachers,
    getStatesString,
    isAnyChasing,
  };
})();
