// ─────────────────────────────────────────────
//  minimap.js – 2D top-down minimap (bottom-right)
// ─────────────────────────────────────────────
/* jshint esversion: 6 */

const Minimap = (() => {
  let canvas, ctx;
  let scaleX, scaleY;

  function init() {
    canvas = document.getElementById('minimap');
    ctx    = canvas.getContext('2d');
    scaleX = canvas.width  / COLS;
    scaleY = canvas.height / ROWS;
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw tiles
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = LEVEL_MAP[r][c];
        const x = c * scaleX;
        const y = r * scaleY;

        if (tile === T_WALL) {
          ctx.fillStyle = '#6b7280';
        } else if (tile === T_HIDE) {
          ctx.fillStyle = '#4a3728';
        } else if (tile === T_STAIRS) {
          ctx.fillStyle = '#fbbf24';
        } else {
          ctx.fillStyle = (r + c) % 2 === 0 ? '#2b2d42' : '#252636';
        }
        ctx.fillRect(x, y, scaleX + 0.5, scaleY + 0.5);
      }
    }

    // Draw vision cones
    const halfAngle = (VISION_ANGLE * Math.PI / 180) / 2;
    const visionRangePx = VISION_RANGE;

    TeacherManager.getTeachers().forEach(t => {
      const tx = (t.px / TILE) * scaleX;
      const ty = (t.py / TILE) * scaleY;
      const rangeScaled = (visionRangePx / TILE) * scaleX;

      const chasing = t.state === STATE.CHASE;
      ctx.fillStyle = chasing ? 'rgba(239,68,68,0.3)' : 'rgba(254,240,138,0.2)';

      ctx.beginPath();
      ctx.moveTo(tx, ty);
      const startA = t.facing - halfAngle;
      const endA   = t.facing + halfAngle;
      const steps  = 12;
      for (let i = 0; i <= steps; i++) {
        const a = startA + (endA - startA) * (i / steps);
        ctx.lineTo(tx + Math.cos(a) * rangeScaled, ty + Math.sin(a) * rangeScaled);
      }
      ctx.closePath();
      ctx.fill();
    });

    // Draw teachers
    TeacherManager.getTeachers().forEach(t => {
      const tx = (t.px / TILE) * scaleX;
      const ty = (t.py / TILE) * scaleY;

      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(tx, ty, 3, 0, Math.PI * 2);
      ctx.fill();

      // Alert indicator
      if (t.state === STATE.CHASE) {
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('!', tx, ty - 5);
      }
    });

    // Draw player
    const pp = Player.getPixelPos();
    const px = (pp.x / TILE) * scaleX;
    const py = (pp.y / TILE) * scaleY;

    // Player dot
    ctx.fillStyle = Player.getIsHiding() ? 'rgba(56,189,248,0.4)' : '#38bdf8';
    ctx.beginPath();
    ctx.arc(px, py, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Direction line
    const facing = Player.getFacing();
    const dirLen = 10;
    // Player yaw: 0 = right, but in our system yaw points in -sin(yaw), -cos(yaw) for 3D
    // On minimap: x increases right, y increases down
    // facing (yaw) in player: -sin(yaw) is forward X in 3D, -cos(yaw) is forward Z
    // In tile space: X maps to col (right), Z maps to row (down)
    const dirX = -Math.sin(facing);
    const dirY = -Math.cos(facing);

    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + dirX * dirLen, py + dirY * dirLen);
    ctx.stroke();
  }

  return { init, draw };
})();
