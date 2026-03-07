// ─────────────────────────────────────────────
//  Global game constants
// ─────────────────────────────────────────────

const TILE   = 40;          // pixel size of one map tile
const COLS   = 32;          // map width  in tiles
const ROWS   = 20;          // map height in tiles

const GAME_W = COLS * TILE; // 1280
const GAME_H = ROWS * TILE; // 800

const GAME_DURATION = 60;   // seconds to survive

// Tile IDs
const T_FLOOR  = 0;
const T_WALL   = 1;
const T_HIDE   = 2;          // locker / desk – player can hide here
const T_STAIRS = 3;          // staircase tile (can change floor)

// Enemy states
const STATE = Object.freeze({
  PATROL: 'PATROL',
  CHASE:  'CHASE',
  SEARCH: 'SEARCH',
});

// Vision
const VISION_ANGLE  = 60;   // degrees (±30 from facing direction)
const VISION_RANGE  = 220;  // pixels

// Speeds (px/s)
const PLAYER_SPEED        = 160;
const TEACHER_PATROL_SPD  =  80;
const TEACHER_CHASE_SPD   = 160;
const TEACHER_SEARCH_SPD  = 110;

// Search "I lost you" pause duration
const SEARCH_WAIT_MS = 2000;

// 3D world constants
const WALL_HEIGHT   = 3;      // wall height in world units
const TILE3D        = 2;      // world units per tile
const PLAYER_HEIGHT = 1.6;    // camera eye height
const PLAYER_RADIUS = 0.35;   // collision radius in world units
const CATCH_DIST    = 1.2;    // distance at which teacher catches player

// Colours (hex)
const COL = {
  FLOOR_A      : 0x2b2d42,
  FLOOR_B      : 0x252636,
  WALL         : 0x6b7280,
  WALL_TOP     : 0x9ca3af,
  HIDE_TILE    : 0x4a3728,
  HIDE_FRONT   : 0x6b4c36,
  STAIRS       : 0xfbbf24,   // bright amber so the player notices stairs

  PLAYER       : 0x38bdf8,
  PLAYER_DIR   : 0x0ea5e9,

  TEACHER      : 0xf97316,
  TEACHER_DIR  : 0xdc2626,

  VISION_CONE  : 0xfef08a,
  VISION_ALERT : 0xef4444,

  HUD_BG       : 0x000000,
  HUD_TEXT     : 0xffffff,
};
