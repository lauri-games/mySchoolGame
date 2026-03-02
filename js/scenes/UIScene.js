// ─────────────────────────────────────────────
//  UIScene – HUD overlay (runs in parallel with GameScene)
// ─────────────────────────────────────────────
/* jshint esversion: 6 */

class UIScene extends Phaser.Scene {

  constructor() {
    super({ key: 'UIScene', active: false });
  }

  create() {
    const W = GAME_W;

    // Semi-transparent top bar
    const bar = this.add.graphics();
    bar.fillStyle(0x000000, 0.55);
    bar.fillRect(0, 0, W, 44);

    // Timer label
    this.add.text(16, 8, 'ÜBERLEBE:', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#94a3b8',
    });

    this.timerText = this.add.text(148, 8, '60', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    });

    // Hint / hide status
    this.hideText = this.add.text(W / 2, 8, '[E] Verstecken', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#64748b',
    }).setOrigin(0.5, 0);

    // School name
    this.add.text(W - 16, 8, 'Friedrich Wilhelm Gymnasium', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#e2e8f0',
      stroke: '#000000',
      strokeThickness: 1,
    }).setOrigin(1, 0);

    // Teacher state display (debug / atmosphere)
    this.stateText = this.add.text(W - 16, 28, '', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#6b7280',
    }).setOrigin(1, 0);

    // Warning flash overlay (when a teacher is chasing)
    this.warningOverlay = this.add.graphics();

    // Watch registry for updates
    this.registry.events.on('changedata-timeLeft', (_parent, value) => {
      this._updateTimer(value);
    });

    this.registry.events.on('changedata-teacherState', (_parent, value) => {
      this.stateText.setText(value);

      // Chase warning: red border flash
      this.warningOverlay.clear();
      if (value.includes(STATE.CHASE)) {
        this.warningOverlay.lineStyle(6, 0xef4444, 0.45);
        this.warningOverlay.strokeRect(3, 47, GAME_W - 6, GAME_H - 50);
      }
    });

    // Initialise display with current value
    this._updateTimer(this.registry.get('timeLeft') || GAME_DURATION);
  }

  _updateTimer(seconds) {
    this.timerText.setText(String(seconds).padStart(2, '0'));

    // Colour shifts: green → yellow → red
    if (seconds > 30) {
      this.timerText.setColor('#4ade80');
    } else if (seconds > 10) {
      this.timerText.setColor('#facc15');
    } else {
      this.timerText.setColor('#ef4444');
    }
  }
}
