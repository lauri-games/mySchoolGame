// ─────────────────────────────────────────────
//  player.js – First-person camera, movement, collision
// ─────────────────────────────────────────────
/* jshint esversion: 6 */

const Player = (() => {
  let camera   = null;
  let yaw      = 0;       // horizontal rotation (radians)
  let pitch    = 0;       // vertical look (radians, clamped)
  let isHiding = false;
  let posX     = 0;       // world X
  let posZ     = 0;       // world Z

  // Input state
  const keys = { w: false, a: false, s: false, d: false, e: false, f: false, g: false };

  function init(threeCamera) {
    camera = threeCamera;
    isHiding = false;
    yaw   = -Math.PI / 2; // face "up" (negative Z) at start
    pitch = 0;

    // Spawn
    const spawn = World.tileToWorld(PLAYER_SPAWN.col, PLAYER_SPAWN.row);
    posX = spawn.x;
    posZ = spawn.z;

    camera.position.set(posX, PLAYER_HEIGHT, posZ);
    _updateCameraRotation();

    // Key listeners
    document.addEventListener('keydown', _onKeyDown);
    document.addEventListener('keyup',   _onKeyUp);
    document.addEventListener('mousemove', _onMouse);
  }

  function destroy() {
    document.removeEventListener('keydown', _onKeyDown);
    document.removeEventListener('keyup',   _onKeyUp);
    document.removeEventListener('mousemove', _onMouse);
  }

  function _onKeyDown(e) {
    const k = e.key.toLowerCase();
    if (k in keys) keys[k] = true;
  }

  function _onKeyUp(e) {
    const k = e.key.toLowerCase();
    if (k in keys) keys[k] = false;
  }

  function _onMouse(e) {
    if (document.pointerLockElement !== document.body) return;

    const sensitivity = 0.002;
    yaw   -= e.movementX * sensitivity;
    pitch -= e.movementY * sensitivity;
    pitch  = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, pitch));
  }

  function _updateCameraRotation() {
    const lookX = posX + Math.cos(pitch) * Math.sin(yaw) * -1;
    const lookY = PLAYER_HEIGHT + Math.sin(pitch);
    const lookZ = posZ + Math.cos(pitch) * Math.cos(yaw) * -1;
    camera.lookAt(lookX, lookY, lookZ);
  }

  // Try to move, checking collisions with walls
  function _tryMove(dx, dz) {
    const r = PLAYER_RADIUS;

    // Try X and Z independently for wall sliding
    let newX = posX + dx;
    let newZ = posZ + dz;

    // Check X movement
    if (dx !== 0) {
      if (World.isBlocked(newX + (dx > 0 ? r : -r), posZ + r) ||
          World.isBlocked(newX + (dx > 0 ? r : -r), posZ - r) ||
          World.isBlocked(newX + (dx > 0 ? r : -r), posZ)) {
        newX = posX;
      }
    }

    // Check Z movement
    if (dz !== 0) {
      if (World.isBlocked(newX + r, newZ + (dz > 0 ? r : -r)) ||
          World.isBlocked(newX - r, newZ + (dz > 0 ? r : -r)) ||
          World.isBlocked(newX, newZ + (dz > 0 ? r : -r))) {
        newZ = posZ;
      }
    }

    posX = newX;
    posZ = newZ;
  }

  function update(delta) {
    if (!camera) return;
    if (isHiding) return; // no movement while hiding

    // Movement direction relative to yaw
    const speed = PLAYER_SPEED * TILE3D / TILE; // convert px/s to world units/s
    let moveX = 0;
    let moveZ = 0;

    // Forward/backward (along yaw direction)
    const forwardX = -Math.sin(yaw);
    const forwardZ = -Math.cos(yaw);
    // Right (perpendicular)
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);

    if (keys.w) { moveX += forwardX; moveZ += forwardZ; }
    if (keys.s) { moveX -= forwardX; moveZ -= forwardZ; }
    if (keys.a) { moveX -= rightX;   moveZ -= rightZ; }
    if (keys.d) { moveX += rightX;   moveZ += rightZ; }

    // Normalise diagonal
    const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (len > 0) {
      moveX = (moveX / len) * speed * delta;
      moveZ = (moveZ / len) * speed * delta;
      _tryMove(moveX, moveZ);
    }

    // Update camera
    camera.position.set(posX, isHiding ? PLAYER_HEIGHT * 0.5 : PLAYER_HEIGHT, posZ);
    _updateCameraRotation();
  }

  function toggleHide() {
    const tile = World.tileAtWorld(posX, posZ);
    if (!isHiding && tile === T_HIDE) {
      isHiding = true;
      camera.position.y = PLAYER_HEIGHT * 0.5;
    } else if (isHiding) {
      isHiding = false;
      camera.position.y = PLAYER_HEIGHT;
    }
  }

  function teleportToSpawn() {
    const spawn = World.tileToWorld(PLAYER_SPAWN.col, PLAYER_SPAWN.row);
    posX = spawn.x;
    posZ = spawn.z;
    isHiding = false;
    camera.position.set(posX, PLAYER_HEIGHT, posZ);
    _updateCameraRotation();
  }

  function getPosition()  { return { x: posX, z: posZ }; }
  function getFacing()    { return yaw; }
  function getIsHiding()  { return isHiding; }
  function getKeys()      { return keys; }
  function getCamera()    { return camera; }

  // 2D position in tile-pixel space (for AI compatibility)
  function getTilePixelPos() {
    const t = World.worldToTile(posX, posZ);
    return {
      x: t.col * TILE + TILE / 2,
      y: t.row * TILE + TILE / 2,
    };
  }

  // Precise world-to-pixel for AI calculations
  function getPixelPos() {
    return {
      x: (posX / TILE3D) * TILE,
      y: (posZ / TILE3D) * TILE,
    };
  }

  return {
    init,
    destroy,
    update,
    toggleHide,
    teleportToSpawn,
    getPosition,
    getFacing,
    getIsHiding,
    getKeys,
    getCamera,
    getTilePixelPos,
    getPixelPos,
  };
})();
