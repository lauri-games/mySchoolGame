// ─────────────────────────────────────────────
//  Map definition  –  32 × 20 tiles
//
//  T_FLOOR = 0   (walkable)
//  T_WALL  = 1   (solid – blocks movement + LOS)
//  T_STAIRS = 3  (staircase tile)
//
//  Layout:
//   Row 0 / 19          : border walls
//   Rows 1, 9, 10, 18   : horizontal corridors
//   Cols 9-10 / 21-22   : vertical corridors
//   Rows 2-8 / 11-17    : classroom zones
//     Vertical room dividers at cols 8 and 11 (with door at row 5 / 14)
//     Vertical room dividers at cols 20 and 23 (same)
//     Horizontal room walls at rows 2,8 / 11,17 with doorways
// ─────────────────────────────────────────────
/* jshint esversion: 6 */

// Single wall row (used for rows 2, 8, 11, 17)
// cols 9+10 and 21+22 are the vertical corridors → stay open
// Door openings break the horizontal wall at col 4 (left room) and col 15 (mid room) and col 26 (right room)
const _WR = [1,1,1,1,0,1,1,1,1,0,0,1,1,1,1,0,1,1,1,1,1,0,0,1,1,1,0,1,1,1,1,1];

// Interior row WITH vertical dividers (plain – no hiding spots)
const _IR = [1,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,1];

// Door row – ALL vertical dividers removed for passage (cols 8,11,20,23 become floor)
const _DR = [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1];

// Full open corridor row
const _CR = [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1];

// Solid border row
const _BR = [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1];

// Base (ground) floor map – used as floor 0
// Each row is explicitly sliced so LEVEL_MAP_0 owns its own copies
// (the _WR/_CR/… constants are shared templates and must not be mutated).
const LEVEL_MAP_0 = [
  _BR.slice(), // row  0 – top border
  _CR.slice(), // row  1 – top horizontal corridor
  _WR.slice(), // row  2 – north wall of upper classrooms
  _IR.slice(), // row  3 – upper classroom interior
  _IR.slice(), // row  4 – upper classroom interior
  _DR.slice(), // row  5 – door row (all vertical dividers open)
  _IR.slice(), // row  6 – upper classroom interior
  _IR.slice(), // row  7 – upper classroom interior
  _WR.slice(), // row  8 – south wall of upper classrooms
  _CR.slice(), // row  9 – middle corridor top
  _CR.slice(), // row 10 – middle corridor bottom  (player spawns here)
  _WR.slice(), // row 11 – north wall of lower classrooms
  _IR.slice(), // row 12 – lower classroom interior
  _IR.slice(), // row 13 – lower classroom interior
  _DR.slice(), // row 14 – door row
  _IR.slice(), // row 15 – lower classroom interior
  _IR.slice(), // row 16 – lower classroom interior
  _WR.slice(), // row 17 – south wall of lower classrooms
  _CR.slice(), // row 18 – bottom horizontal corridor
  _BR.slice(), // row 19 – bottom border
];

// Helper to deep-clone a map definition (each row gets its own array copy)
const _cloneMap = (m) => m.map((r) => r.slice());

// All floors start from the same clean map
const LEVEL_MAP_1 = _cloneMap(LEVEL_MAP_0);
const LEVEL_MAP_2 = _cloneMap(LEVEL_MAP_0);

// Aggregate floors
const LEVEL_MAPS = [LEVEL_MAP_0, LEVEL_MAP_1, LEVEL_MAP_2];

// Current floor index (0 = ground / first floor)
let CURRENT_FLOOR = 0;

// location of the (single) stair tile on each floor
const STAIR_POS = { col: 15, row: 9 };

// Active references (GameScene expects LEVEL_MAP, PLAYER_SPAWN, TEACHER_DEFS)
let LEVEL_MAP = LEVEL_MAPS[0];

// ─────────────────────────────────────────────
//  Furniture layout – per floor array of {type, col, row}
//  types: 'blackboard' | 'teacher_desk' | 'student_desk'
//  Default layout mirrors the old auto-generated classroom setup.
// ─────────────────────────────────────────────

// Helper: generate a default classroom furniture set for a room definition
function _defaultRoomFurniture(colMin, colMax, rowMin, rowMax) {
  const items = [];
  const cx = Math.round((colMin + colMax) / 2);

  // Blackboard on north wall row
  items.push({ type: 'blackboard',   col: cx,       row: rowMin });
  // Teacher desk one row south of blackboard
  items.push({ type: 'teacher_desk', col: cx,       row: rowMin + 1 });

  // Student desks filling the rest of the room
  for (let r = rowMin + 2; r <= rowMax - 1; r++) {
    for (let c = colMin + 1; c <= colMax - 1; c += 2) {
      items.push({ type: 'student_desk', col: c, row: r });
    }
  }
  return items;
}

// Upper classrooms: rowMin=3,rowMax=7  /  lower classrooms: rowMin=12,rowMax=16
const _defaultFurniture = [
  _defaultRoomFurniture(1,  7,  3, 7),   // UL
  _defaultRoomFurniture(12, 19, 3, 7),   // UM
  _defaultRoomFurniture(24, 30, 3, 7),   // UR
  _defaultRoomFurniture(1,  7,  12, 16), // LL
  _defaultRoomFurniture(12, 19, 12, 16), // LM
  _defaultRoomFurniture(24, 30, 12, 16), // LR
].reduce((a, b) => a.concat(b), []);

// FURNITURE_LAYOUT[floorIndex] = array of {type, col, row}
// All floors start with the same default; the editor can override per floor.
const FURNITURE_LAYOUT = [
  _defaultFurniture.map(f => Object.assign({}, f)),
  _defaultFurniture.map(f => Object.assign({}, f)),
  _defaultFurniture.map(f => Object.assign({}, f)),
];


const PLAYER_SPAWNS = [
  { col: 15, row: 10 }, // floor 0
  { col: 15, row: 10 }, // floor 1
  { col: 15, row: 9  }, // floor 2
];

let PLAYER_SPAWN = PLAYER_SPAWNS[0];

// Teacher defs per floor (basic variations)
// Waypoints now include deep classroom positions so teachers roam inside rooms.
// The AI will pick random next waypoints from the full list instead of looping.
const TEACHERS_FLOOR_0 = [
  {
    col: 2, row: 1,
    waypoints: [
      // corridors
      [2,1],[14,1],[29,1],
      // upper-left classroom
      [3,4],[5,6],[2,5],
      // upper-mid classroom
      [13,4],[17,6],[15,5],
      // lower-left classroom
      [3,13],[5,15],[2,14],
      // middle corridors
      [8,9],[22,10],[15,9],
    ],
  },
  {
    col: 29, row: 9,
    waypoints: [
      // corridors
      [29,9],[15,10],[2,9],
      // upper-right classroom
      [26,4],[28,6],[25,5],
      // lower-right classroom
      [26,13],[28,15],[25,14],
      // upper-mid classroom
      [14,6],[17,4],[16,5],
      // vertical corridors
      [9,5],[9,14],[22,5],[22,14],
    ],
  },
  {
    col: 9, row: 18,
    waypoints: [
      // corridors
      [9,18],[9,10],[9,1],[22,18],[22,1],
      // lower-left classroom
      [3,15],[5,13],[4,14],
      // lower-mid classroom
      [14,15],[17,13],[15,14],
      // lower-right classroom
      [26,15],[28,13],[27,14],
      // upper classrooms
      [4,5],[16,5],[27,5],
    ],
  },
  {
    col: 21, row: 5,
    waypoints: [
      // corridors
      [21,2],[15,1],[3,1],[29,1],
      [15,9],[3,10],[29,10],
      [21,18],[15,18],[3,18],
      // upper-right classroom
      [25,4],[27,6],[26,5],
      // upper-mid classroom
      [13,3],[17,7],[15,5],
      // lower-right classroom
      [25,13],[27,15],[26,14],
      // lower-mid classroom
      [13,12],[17,16],[15,14],
    ],
  },
];

const TEACHERS_FLOOR_1 = TEACHERS_FLOOR_0.map((t) => ({
  col: t.col,
  row: Math.max(1, t.row - 1),
  waypoints: t.waypoints.map(([c,r]) => [c, Math.max(1, r - 1)]),
}));

const TEACHERS_FLOOR_2 = TEACHERS_FLOOR_0.map((t) => ({
  col: t.col,
  row: Math.min(18, t.row + 1),
  waypoints: t.waypoints.map(([c,r]) => [c, Math.min(18, r + 1)]),
}));

const TEACHER_DEFS_BY_FLOOR = [TEACHERS_FLOOR_0, TEACHERS_FLOOR_1, TEACHERS_FLOOR_2];

// Mutable active teacher defs array (GameScene expects TEACHER_DEFS variable)
const TEACHER_DEFS = [];

// Function to switch active floor during runtime
function selectFloor(n) {
  if (typeof n !== 'number' || n < 0 || n >= LEVEL_MAPS.length) return;
  CURRENT_FLOOR = n;
  LEVEL_MAP = LEVEL_MAPS[n];
  PLAYER_SPAWN = PLAYER_SPAWNS[n] || PLAYER_SPAWNS[0];

  // Replace contents of TEACHER_DEFS to match requested floor
  TEACHER_DEFS.length = 0;
  (TEACHER_DEFS_BY_FLOOR[n] || TEACHER_DEFS_BY_FLOOR[0]).forEach(d => TEACHER_DEFS.push(Object.assign({}, d)));
}

// inject the stair tile into each floor map so player can move between them
function _addStairs(m) {
  if (m[STAIR_POS.row] && typeof m[STAIR_POS.row][STAIR_POS.col] !== 'undefined') {
    m[STAIR_POS.row][STAIR_POS.col] = T_STAIRS;
  }
}
LEVEL_MAPS.forEach(_addStairs);

// ── Load custom map from editor ───────────────────────────────────────────────
// The editor saves maps to IndexedDB (SchoolGameDB / maps / "floorMaps").
// We read them here synchronously-ish: since IDB is async we patch LEVEL_MAPS
// and rebuild the world once the data arrives, signalling via a custom event.
(function _loadEditorMap() {
  try {
    const req = indexedDB.open('SchoolGameDB', 2);
    req.onupgradeneeded = function(e) {
      // Create the store if it doesn't exist yet (e.g. first run in game tab)
      const d = e.target.result;
      if (!d.objectStoreNames.contains('maps')) {
        d.createObjectStore('maps');
      }
    };
    req.onsuccess = function(e) {
      try {
        const db    = e.target.result;
        const tx    = db.transaction('maps', 'readonly');
        const store = tx.objectStore('maps');
        const get   = store.get('floorMaps');
        get.onsuccess = function(ev) {
          const saved = ev.target.result;
          if (!saved) return;

          // Apply tile maps
          const mapData = saved.maps;
          if (Array.isArray(mapData) && mapData.length === LEVEL_MAPS.length) {
            let changed = false;
            mapData.forEach((floor, i) => {
              if (Array.isArray(floor) && floor.length === ROWS) {
                LEVEL_MAPS[i] = floor.map(row => Array.isArray(row) ? row.slice() : row);
                changed = true;
              }
            });
            if (changed) {
              LEVEL_MAPS.forEach(_addStairs);
              selectFloor(CURRENT_FLOOR);
            }
          }

          // Apply furniture layout
          const furnitureData = saved.furniture;
          if (Array.isArray(furnitureData) && furnitureData.length === FURNITURE_LAYOUT.length) {
            furnitureData.forEach((floor, i) => {
              if (Array.isArray(floor)) FURNITURE_LAYOUT[i] = floor.slice();
            });
          }

          console.log('[Editor] Map + Möbel aus IndexedDB geladen.');
          window.dispatchEvent(new CustomEvent('editorMapLoaded'));
        };
      } catch(err) {
        console.warn('Editor-Map IDB read error:', err);
      }
    };
  } catch (e) {
    console.warn('Editor-Map konnte nicht geladen werden:', e);
  }
})();

// Initialise first floor
selectFloor(0);
