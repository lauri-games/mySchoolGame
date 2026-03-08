// ─────────────────────────────────────────────────────────────────────────────
//  editor.js – Interactive tile map editor + furniture placer
//  Stores maps AND furniture layout in IndexedDB ("SchoolGameDB").
// ─────────────────────────────────────────────────────────────────────────────
/* jshint esversion: 6 */

const Editor = (() => {
  // ── Constants ──────────────────────────────────────────────────────────────
  const TILE_PX    = 22;
  const GRID_COLOR = '#1e2235';

  // Tile map rendering colours
  const TILE_COLORS = {
    0: '#2d3320',  // floor
    1: '#4b5563',  // wall
    3: '#064e3b',  // stair
  };
  const TILE_NAMES = { 0:'Boden', 1:'Wand', 3:'Treppe' };

  // Furniture types rendered as icons on the canvas
  const FURN_COLORS = {
    blackboard:   '#1b5e20',
    teacher_desk: '#8d6e63',
    student_desk: '#d7ccc8',
  };
  const FURN_ICONS  = { blackboard:'🖼', teacher_desk:'🪑', student_desk:'📚' };
  const FURN_NAMES  = { blackboard:'Tafel', teacher_desk:'Lehrerpult', student_desk:'Schülertisch' };

  const DB_NAME    = 'SchoolGameDB';
  const DB_VERSION = 2;
  const DB_STORE   = 'maps';
  const DB_KEY     = 'floorMaps';

  // ── State ──────────────────────────────────────────────────────────────────
  let maps      = [];   // maps[floor][row][col]
  let furniture = [];   // furniture[floor] = [{type,col,row}, ...]
  let currentFloor = 0;
  let mode      = 'tile';   // 'tile' | 'furniture' | 'erase_furn'
  let currentTile = 0;
  let currentFurn = 'blackboard';
  let isPainting  = false;
  let lastPainted = null;
  let db = null;

  // ── DOM refs ───────────────────────────────────────────────────────────────
  const canvas   = document.getElementById('map-canvas');
  const ctx      = canvas.getContext('2d');
  const infoCol  = document.getElementById('info-col');
  const infoRow  = document.getElementById('info-row');
  const infoTile = document.getElementById('info-tile');
  const statWall  = document.getElementById('stat-wall');
  const statFloor = document.getElementById('stat-floor');
  const statStair = document.getElementById('stat-stair');
  const statFurn  = document.getElementById('stat-furn');
  const jsOutput  = document.getElementById('js-output');
  const statusEl  = document.getElementById('status');
  const toastEl   = document.getElementById('toast');

  // ── IndexedDB ──────────────────────────────────────────────────────────────
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains(DB_STORE)) d.createObjectStore(DB_STORE);
      };
      req.onsuccess = (e) => {
        const database = e.target.result;
        database.onversionchange = () => { database.close(); db = null; };
        resolve(database);
      };
      req.onerror   = (e) => reject(e.target.error);
      req.onblocked = ()  => reject(new Error('IndexedDB blockiert – andere Tabs schließen.'));
    });
  }
  async function getDB() { if (!db) db = await openDB(); return db; }

  function dbPut(key, value) {
    return getDB().then(database => new Promise((resolve, reject) => {
      let tx;
      try { tx = database.transaction(DB_STORE, 'readwrite'); } catch(e) { return reject(e); }
      tx.onerror = (e) => reject(e.target.error);
      tx.onabort = (e) => reject(new Error('Transaktion abgebrochen: ' + (e.target.error || '?')));
      const req = tx.objectStore(DB_STORE).put(value, key);
      req.onsuccess = () => resolve();
      req.onerror   = (e) => { e.stopPropagation(); reject(e.target.error); };
    }));
  }

  function dbGet(key) {
    return getDB().then(database => new Promise((resolve, reject) => {
      let tx;
      try { tx = database.transaction(DB_STORE, 'readonly'); } catch(e) { return reject(e); }
      tx.onerror = (e) => reject(e.target.error);
      tx.onabort = (e) => reject(new Error('Transaktion abgebrochen: ' + (e.target.error || '?')));
      const req = tx.objectStore(DB_STORE).get(key);
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror   = (e) => { e.stopPropagation(); reject(e.target.error); };
    }));
  }

  // ── Map helpers ────────────────────────────────────────────────────────────
  function cloneMap(m) { return m.map(r => r.slice()); }

  function loadDefaults() {
    maps      = LEVEL_MAPS.map(m => cloneMap(m));
    furniture = FURNITURE_LAYOUT.map(f => f.map(item => Object.assign({}, item)));
  }

  function furnitureAt(floor, col, row) {
    return furniture[floor].find(f => f.col === col && f.row === row) || null;
  }
  function removeFurnitureAt(floor, col, row) {
    furniture[floor] = furniture[floor].filter(f => !(f.col === col && f.row === row));
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  function updateStats() {
    const m = maps[currentFloor];
    let w = 0, f = 0, s = 0;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const t = m[r][c];
        if (t === T_WALL) w++;
        else if (t === T_STAIRS) s++;
        else f++;
      }
    statWall.textContent  = w;
    statFloor.textContent = f;
    statStair.textContent = s;
    statFurn.textContent  = furniture[currentFloor].length;
  }

  // ── Canvas ─────────────────────────────────────────────────────────────────
  function initCanvas() {
    canvas.width  = COLS * TILE_PX;
    canvas.height = ROWS * TILE_PX;
  }

  function drawMap() {
    const m    = maps[currentFloor];
    const furn = furniture[currentFloor];
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1 – Tile layer
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = m[r][c];
        const x = c * TILE_PX, y = r * TILE_PX;
        ctx.fillStyle = TILE_COLORS[t] ?? TILE_COLORS[0];
        ctx.fillRect(x, y, TILE_PX, TILE_PX);
        ctx.strokeStyle = GRID_COLOR;
        ctx.lineWidth   = 0.5;
        ctx.strokeRect(x + 0.5, y + 0.5, TILE_PX - 1, TILE_PX - 1);
        if (t === T_STAIRS) {
          ctx.fillStyle = '#4ade80';
          ctx.font = `bold ${TILE_PX - 6}px monospace`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('⬡', x + TILE_PX / 2, y + TILE_PX / 2);
        }
      }
    }

    // 2 – Furniture layer
    furn.forEach(({ type, col, row }) => {
      const x = col * TILE_PX, y = row * TILE_PX;
      // coloured background
      ctx.fillStyle = FURN_COLORS[type] ?? '#555';
      ctx.fillRect(x + 2, y + 2, TILE_PX - 4, TILE_PX - 4);
      // icon
      ctx.font = `${TILE_PX - 8}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(FURN_ICONS[type] ?? '?', x + TILE_PX / 2, y + TILE_PX / 2);
    });

    // 3 – Coordinate labels
    ctx.fillStyle = 'rgba(148,163,184,0.45)';
    ctx.font = '8px monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    for (let c = 0; c < COLS; c += 5) ctx.fillText(c, c * TILE_PX + 2, 1);
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let r = 0; r < ROWS; r += 5) ctx.fillText(r, TILE_PX - 2, r * TILE_PX + TILE_PX / 2);
  }

  // ── Painting ───────────────────────────────────────────────────────────────
  function canvasPosToTile(e) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width, sy = canvas.height / rect.height;
    return {
      col: Math.floor((e.clientX - rect.left) * sx / TILE_PX),
      row: Math.floor((e.clientY - rect.top)  * sy / TILE_PX),
    };
  }

  function applyPaint(col, row) {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
    if (lastPainted && lastPainted.col === col && lastPainted.row === row) return;
    lastPainted = { col, row };

    if (mode === 'tile') {
      maps[currentFloor][row][col] = currentTile;
    } else if (mode === 'furniture') {
      // Only place on floor tiles
      if (maps[currentFloor][row][col] !== T_FLOOR) return;
      removeFurnitureAt(currentFloor, col, row);
      furniture[currentFloor].push({ type: currentFurn, col, row });
    } else if (mode === 'erase_furn') {
      removeFurnitureAt(currentFloor, col, row);
    }
    drawMap();
    updateStats();
  }

  function applyErase(col, row) {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
    if (mode === 'furniture' || mode === 'erase_furn') {
      removeFurnitureAt(currentFloor, col, row);
    } else {
      maps[currentFloor][row][col] = T_FLOOR;
    }
    drawMap(); updateStats();
  }

  // ── Event wiring ───────────────────────────────────────────────────────────
  function setupCanvasEvents() {
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2) { e.preventDefault(); applyErase(...Object.values(canvasPosToTile(e))); return; }
      if (e.button !== 0) return;
      isPainting = true; lastPainted = null;
      const { col, row } = canvasPosToTile(e);
      applyPaint(col, row);
    });
    canvas.addEventListener('mousemove', (e) => {
      const { col, row } = canvasPosToTile(e);
      if (col >= 0 && col < COLS && row >= 0 && row < ROWS) {
        infoCol.textContent  = col;
        infoRow.textContent  = row;
        const fItem = furnitureAt(currentFloor, col, row);
        const tileT = maps[currentFloor][row][col];
        infoTile.textContent = fItem
          ? `Möbel: ${FURN_NAMES[fItem.type]}`
          : `${tileT} – ${TILE_NAMES[tileT] ?? '?'}`;
      }
      if (isPainting) applyPaint(col, row);
    });
    canvas.addEventListener('mouseup',    () => { isPainting = false; lastPainted = null; });
    canvas.addEventListener('mouseleave', () => { isPainting = false; lastPainted = null; });
    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const { col, row } = canvasPosToTile(e);
      applyErase(col, row);
    });
    // Touch
    const getTouchTile = (e) => canvasPosToTile(e.touches[0]);
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault(); isPainting = true; lastPainted = null;
      const { col, row } = getTouchTile(e); applyPaint(col, row);
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const { col, row } = getTouchTile(e); applyPaint(col, row);
    }, { passive: false });
    canvas.addEventListener('touchend', () => { isPainting = false; lastPainted = null; });
  }

  // ── Toolbar ────────────────────────────────────────────────────────────────
  function setActiveBtn(selector) {
    document.querySelectorAll('.tool-btn, .furn-btn').forEach(b => b.classList.remove('active'));
    const el = document.querySelector(selector);
    if (el) el.classList.add('active');
  }

  function setupToolButtons() {
    // Tile tools
    document.querySelectorAll('.tool-btn[data-tile]').forEach(btn => {
      btn.addEventListener('click', () => {
        mode = 'tile';
        currentTile = parseInt(btn.dataset.tile, 10);
        setActiveBtn(`[data-tile="${btn.dataset.tile}"]`);
      });
    });
    // Furniture tools
    document.querySelectorAll('.furn-btn[data-furn]').forEach(btn => {
      btn.addEventListener('click', () => {
        mode = 'furniture';
        currentFurn = btn.dataset.furn;
        setActiveBtn(`[data-furn="${btn.dataset.furn}"]`);
      });
    });
    // Erase furniture
    const eraseBtn = document.getElementById('tool-erase-furn');
    if (eraseBtn) eraseBtn.addEventListener('click', () => {
      mode = 'erase_furn';
      setActiveBtn('#tool-erase-furn');
    });
  }

  function setupFloorTabs() {
    document.querySelectorAll('.floor-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.floor-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFloor = parseInt(tab.dataset.floor, 10);
        drawMap(); updateStats();
        setStatus(`Etage ${currentFloor + 1}`, 'ok');
      });
    });
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  function buildSavePayload() {
    return {
      maps:      maps.map(m => m.map(r => Array.from(r))),
      furniture: furniture.map(f => f.map(item => Object.assign({}, item))),
    };
  }

  function applyLoadedPayload(saved) {
    if (saved.maps && Array.isArray(saved.maps) && saved.maps.length === LEVEL_MAPS.length) {
      maps = saved.maps.map(m => m.map(r => Array.from(r)));
    }
    if (saved.furniture && Array.isArray(saved.furniture) && saved.furniture.length === FURNITURE_LAYOUT.length) {
      furniture = saved.furniture.map(f => f.map(item => Object.assign({}, item)));
    }
  }

  function setupActionButtons() {
    document.getElementById('btn-reset').addEventListener('click', () => {
      if (!confirm(`Etage ${currentFloor + 1} zurücksetzen?`)) return;
      maps[currentFloor]      = cloneMap(LEVEL_MAPS[currentFloor]);
      furniture[currentFloor] = FURNITURE_LAYOUT[currentFloor].map(f => Object.assign({}, f));
      drawMap(); updateStats();
      setStatus('Zurückgesetzt', 'ok'); toast('Etage zurückgesetzt.');
    });

    document.getElementById('btn-save').addEventListener('click', async () => {
      try {
        await dbPut(DB_KEY, buildSavePayload());
        setStatus('Gespeichert ✓', 'ok'); toast('Map + Möbel gespeichert! 💾');
      } catch (err) { setStatus('Fehler!', 'error'); toast('Fehler: ' + err.message); }
    });

    document.getElementById('btn-load').addEventListener('click', async () => {
      try {
        const saved = await dbGet(DB_KEY);
        if (!saved) { toast('Nichts gespeichert.'); return; }
        applyLoadedPayload(saved);
        drawMap(); updateStats();
        setStatus('Geladen ✓', 'ok'); toast('Map + Möbel geladen! 📂');
      } catch (err) { setStatus('Fehler!', 'error'); toast('Fehler: ' + err.message); }
    });

    document.getElementById('btn-copy-js').addEventListener('click', () => {
      const m = maps[currentFloor];
      let lines = [`// Etage ${currentFloor + 1} – Map-Editor`];
      lines.push(`const LEVEL_MAP_CUSTOM_${currentFloor} = [`);
      for (let r = 0; r < ROWS; r++) lines.push(`  [${m[r].join(',')}], // row ${r}`);
      lines.push('];');
      const code = lines.join('\n');
      jsOutput.value = code;
      navigator.clipboard.writeText(code)
        .then(() => toast('JS kopiert!'))
        .catch(() => toast('Bitte manuell aus Textfeld kopieren.'));
    });

    document.getElementById('btn-play').addEventListener('click', async () => {
      try {
        await dbPut(DB_KEY, buildSavePayload());
        setStatus('Gespeichert ✓', 'ok');
        toast('Gespeichert – öffne Spiel… ▶');
        setTimeout(() => window.open('index.html', '_blank'), 400);
      } catch (err) { setStatus('Fehler!', 'error'); toast('Fehler: ' + err.message); }
    });
  }

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  function setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyS' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault(); document.getElementById('btn-save').click();
      }
      // 1 = Boden, 2 = Wand, 3 = Treppe  (tile mode)
      if (e.code === 'Digit1') { mode='tile'; currentTile=0; setActiveBtn('[data-tile="0"]'); }
      if (e.code === 'Digit2') { mode='tile'; currentTile=1; setActiveBtn('[data-tile="1"]'); }
      if (e.code === 'Digit3') { mode='tile'; currentTile=3; setActiveBtn('[data-tile="3"]'); }
      // 4/5/6 = furniture tools
      if (e.code === 'Digit4') { mode='furniture'; currentFurn='blackboard';   setActiveBtn('[data-furn="blackboard"]'); }
      if (e.code === 'Digit5') { mode='furniture'; currentFurn='teacher_desk'; setActiveBtn('[data-furn="teacher_desk"]'); }
      if (e.code === 'Digit6') { mode='furniture'; currentFurn='student_desk'; setActiveBtn('[data-furn="student_desk"]'); }
      if (e.code === 'Digit7') { mode='erase_furn'; setActiveBtn('#tool-erase-furn'); }
    });
  }

  // ── Status / Toast ─────────────────────────────────────────────────────────
  function setStatus(msg, type) { statusEl.textContent = msg; statusEl.className = type || ''; }
  let toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2800);
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  async function init() {
    loadDefaults();
    initCanvas();

    try {
      db = await openDB();
      const saved = await dbGet(DB_KEY);
      if (saved && typeof saved === 'object') {
        applyLoadedPayload(saved);
        setStatus('Gespeicherte Map geladen ✓', 'ok');
        toast('Gespeicherte Map geladen! 📂');
      } else {
        setStatus('Standardmap geladen', 'ok');
      }
    } catch (err) {
      setStatus('IndexedDB Fehler', 'error');
      console.error('IndexedDB:', err);
    }

    drawMap(); updateStats();
    setupCanvasEvents();
    setupToolButtons();
    setupFloorTabs();
    setupActionButtons();
    setupKeyboard();
  }

  return { init };
})();

window.addEventListener('DOMContentLoaded', () => Editor.init());
