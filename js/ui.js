// ─────────────────────────────────────────────
//  ui.js – HTML-based HUD + end-screen overlays
// ─────────────────────────────────────────────
/* jshint esversion: 6 */

const UI = (() => {

  // DOM references (cached on init)
  let elTimer, elHideHint, elStairHint, elTeacherState;
  let elChaseWarning, elEndOverlay, elEndHeader, elEndSubtitle, elEndMessage, elEndCountdown;
  let floorBtns = [];

  function init(onFloorClick) {
    elTimer        = document.getElementById('hud-timer');
    elHideHint     = document.getElementById('hud-hide-hint');
    elStairHint    = document.getElementById('hud-stair-hint');
    elTeacherState = document.getElementById('hud-teacher-state');
    elChaseWarning = document.getElementById('chase-warning');
    elEndOverlay   = document.getElementById('end-overlay');
    elEndHeader    = document.getElementById('end-header');
    elEndSubtitle  = document.getElementById('end-subtitle');
    elEndMessage   = document.getElementById('end-message');
    elEndCountdown = document.getElementById('end-countdown');

    floorBtns = document.querySelectorAll('.floor-btn');
    floorBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const floor = parseInt(btn.dataset.floor, 10);
        if (onFloorClick) onFloorClick(floor);
      });
    });
  }

  function updateTimer(seconds) {
    elTimer.textContent = String(seconds).padStart(2, '0');
    if (seconds > 30)      elTimer.style.color = '#4ade80';
    else if (seconds > 10) elTimer.style.color = '#facc15';
    else                   elTimer.style.color = '#ef4444';
  }

  function updateStairHint(text) {
    elStairHint.textContent = text;
  }

  function updateTeacherState(text) {
    elTeacherState.textContent = text;
  }

  function setChaseWarning(active) {
    elChaseWarning.classList.toggle('active', active);
  }

  function setActiveFloor(floor) {
    floorBtns.forEach((btn, idx) => {
      btn.classList.toggle('active', idx === floor);
    });
  }

  // ── End screens ────────────────────────────────────────────────────

  const SCHIMPF = [
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

  function showGameOver(onRestart) {
    elEndOverlay.classList.add('active');
    elEndHeader.className = 'lose';
    elEndHeader.textContent = 'ERWISCHT!';
    elEndSubtitle.textContent = 'Der Lehrer schimpft:';
    elEndSubtitle.style.color = '#fbbf24';
    elEndMessage.textContent = SCHIMPF[Math.floor(Math.random() * SCHIMPF.length)];
    elEndMessage.style.color = '#f87171';
    elEndCountdown.style.color = '#a78bfa';

    _startCountdown(onRestart);
  }

  function showWin(onRestart) {
    elEndOverlay.classList.add('active');
    elEndHeader.className = 'win';
    elEndHeader.textContent = 'PAUSE GESCHAFFT!';
    elEndSubtitle.textContent = 'Du hast die Pause\nunentdeckt ueberstanden!';
    elEndSubtitle.style.color = '#4ade80';
    elEndMessage.textContent = 'Kein Lehrer hat dich erwischt.';
    elEndMessage.style.color = '#d1fae5';
    elEndCountdown.style.color = '#34d399';

    _startCountdown(onRestart);
  }

  let countdownInterval = null;

  function _startCountdown(onRestart) {
    let count = 5;
    elEndCountdown.textContent = 'Neustart in 5 ...';

    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(countdownInterval);
        countdownInterval = null;
        hideEndScreen();
        if (onRestart) onRestart();
      } else {
        elEndCountdown.textContent = 'Neustart in ' + count + ' ...';
      }
    }, 1000);
  }

  function hideEndScreen() {
    elEndOverlay.classList.remove('active');
  }

  return {
    init,
    updateTimer,
    updateStairHint,
    updateTeacherState,
    setChaseWarning,
    setActiveFloor,
    showGameOver,
    showWin,
    hideEndScreen,
  };
})();
