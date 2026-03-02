// ─────────────────────────────────────────────
//  GameOverScene – auto-restarts after 5 seconds
// ─────────────────────────────────────────────
/* jshint esversion: 6 */

class GameOverScene extends Phaser.Scene {

  constructor() {
    super('GameOverScene');
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

    // Red header
    this.add.graphics()
      .fillStyle(0xdc2626, 1)
      .fillRoundedRect(cx - 260, cy - 160, 520, 64, { tl: 18, tr: 18, bl: 0, br: 0 });

    this.add.text(cx, cy - 128, 'ERWISCHT!', {
      fontSize: '36px',
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.add.text(cx, cy - 44, 'Der Lehrer schimpft:', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#fbbf24',
    }).setOrigin(0.5);

    const schimpf = [
      '"Ab in den Unterricht, aber sofort!"',
      '"Das wird ein Eintrag ins Klassenbuch!"',
      '"Du bekommst eine glatte 6 dafuer!"',
      '"Nachsitzen! Heute Nachmittag, 14 Uhr!"',
      '"Ich rufe sofort deine Eltern an!"',
      '"Was faellt dir ein, hier rumzuschleichen?!"',
      '"Marsch zurueck in den Klassenraum!"',
      '"Das gibt ordentlich Aerger, mein Freund!"',
      '"Dein Zeugnis wird dir nicht gefallen!"',
      '"Warte nur bis der Rektor das erfaehrt!"',
    ];
    this.add.text(cx, cy + 12, Phaser.Math.RND.pick(schimpf), {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#f87171',
    }).setOrigin(0.5);

    // Countdown text
    this.countdown = 5;
    this.countdownText = this.add.text(cx, cy + 100,
      'Neustart in 5 ...', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#a78bfa',
    }).setOrigin(0.5);

    // Tick down every second, restart at 0
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
