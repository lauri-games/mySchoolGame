// ─────────────────────────────────────────────
//  Phaser 3 – game bootstrap
// ─────────────────────────────────────────────
/* jshint esversion: 6 */

const config = {
  type: Phaser.AUTO,
  width:  GAME_W,
  height: GAME_H,
  backgroundColor: '#0d0d0d',
  parent: document.body,

  physics: {
    default: 'arcade',
    arcade:  {
      gravity: { x: 0, y: 0 },
      debug:   false,           // set true to visualise physics bodies
    },
  },

  scene: [
    GameScene,      // first scene = starts first
    UIScene,
    GameOverScene,
    WinScene,
  ],
};

// eslint-disable-next-line no-unused-vars
const game = new Phaser.Game(config);
