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

    // stairs hint (updated via registry)
    this.stairText = this.add.text(W / 2, 24, '', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#fbbf24',
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

    // Floor selection buttons (Etagen)
    this.floorTexts = [];
    const startX = 260;
    for (let i = 0; i < 3; i++) {
      const fx = startX + i * 90;
      const ft = this.add.text(fx, 8, `Etage ${i + 1}`, {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#cbd5e1',
      }).setOrigin(0, 0).setInteractive({ useHandCursor: true });

      ft.on('pointerover', () => ft.setStyle({ color: '#ffffff' }));
      ft.on('pointerout',  () => ft.setStyle({ color: '#cbd5e1' }));

      ft.on('pointerdown', () => {
        if (typeof selectFloor === 'function') selectFloor(i);
        // restart GameScene so new floor data is loaded
        this.scene.stop('UIScene');
        this.scene.stop('GameScene');
        this.scene.start('GameScene');
      });

      this.floorTexts.push(ft);
    }

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

    this.registry.events.on('changedata-stairHint', (_p, value) => {
      this.stairText.setText(value);
    });

    this.registry.events.on('changedata-currentFloor', (_p, value) => {
      this.floorTexts.forEach((ft, idx) => {
        ft.setColor(idx === value ? '#ffffff' : '#cbd5e1');
      });
    });

    // Initialise display with current value
    this._updateTimer(this.registry.get('timeLeft') || GAME_DURATION);
    // also update floor buttons once on start
    const cf = this.registry.get('currentFloor') || 0;
    this.floorTexts.forEach((ft, idx) => {
      ft.setColor(idx === cf ? '#ffffff' : '#cbd5e1');
    });
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
