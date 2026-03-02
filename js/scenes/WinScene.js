// ─────────────────────────────────────────────
//  WinScene – auto-restarts after 5 seconds
// ─────────────────────────────────────────────
/* jshint esversion: 6 */

class WinScene extends Phaser.Scene {

  constructor() {
    super('WinScene');
  }

  create() {
    const cx = GAME_W / 2;
    const cy = GAME_H / 2;

    // Dark overlay
    this.add.graphics()
      .fillStyle(0x000000, 0.78)
      .fillRect(0, 0, GAME_W, GAME_H);

    // Card
    this.add.graphics()
      .fillStyle(0x1e1e2e, 0.95)
      .fillRoundedRect(cx - 260, cy - 160, 520, 320, 18);

    // Green header
    this.add.graphics()
      .fillStyle(0x15803d, 1)
      .fillRoundedRect(cx - 260, cy - 160, 520, 64, { tl: 18, tr: 18, bl: 0, br: 0 });

    this.add.text(cx, cy - 128, 'PAUSE GESCHAFFT!', {
      fontSize: '34px',
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.add.text(cx, cy - 50, 'Du hast die Pause\nunentdeckt ueberstanden!', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#4ade80',
      align: 'center',
    }).setOrigin(0.5);

    this.add.text(cx, cy + 20, 'Kein Lehrer hat dich erwischt.', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#d1fae5',
      align: 'center',
    }).setOrigin(0.5);

    // Countdown text
    this.countdown = 5;
    this.countdownText = this.add.text(cx, cy + 100,
      'Neustart in 5 ...', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#34d399',
    }).setOrigin(0.5);

    this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.countdown--;
        if (this.countdown <= 0) {
          this.scene.start('GameScene');
        } else {
          this.countdownText.setText('Neustart in ' + this.countdown + ' ...');
        }
      },
      repeat: 4,
    });
  }
}
