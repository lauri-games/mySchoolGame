// ─────────────────────────────────────────────
//  Map definition  –  32 × 20 tiles
//
//  T_FLOOR = 0   (walkable)
//  T_WALL  = 1   (solid – blocks movement + LOS)
//  T_HIDE  = 2   (locker/desk – player can hide)
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

// Interior row WITH vertical dividers (no hiding spots)
const _IR = [1,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,1];

// Interior row with HIDING SPOTS
const _H1 = [1,0,2,0,2,0,2,0,1,0,0,1,0,2,0,2,0,2,0,0,1,0,0,1,0,2,0,2,0,2,0,1];
const _H2 = [1,0,0,2,0,0,2,0,1,0,0,1,0,0,2,0,0,2,0,0,1,0,0,1,0,0,2,0,0,2,0,1];

// Door row – ALL vertical dividers removed for passage (cols 8,11,20,23 become floor)
const _DR = [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1];

// Full open corridor row
const _CR = [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1];

// Solid border row
const _BR = [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1];

const LEVEL_MAP = [
  _BR, // row  0 – top border
  _CR, // row  1 – top horizontal corridor
  _WR, // row  2 – north wall of upper classrooms
  _IR, // row  3 – upper classroom interior
  _H1, // row  4 – upper classroom interior (hiding spots set A)
  _DR, // row  5 – door row (all vertical dividers open)
  _H2, // row  6 – upper classroom interior (hiding spots set B)
  _IR, // row  7 – upper classroom interior
  _WR, // row  8 – south wall of upper classrooms
  _CR, // row  9 – middle corridor top
  _CR, // row 10 – middle corridor bottom  (player spawns here)
  _WR, // row 11 – north wall of lower classrooms
  _IR, // row 12 – lower classroom interior
  _H1, // row 13 – lower classroom (hiding spots A)
  _DR, // row 14 – door row
  _H2, // row 15 – lower classroom (hiding spots B)
  _IR, // row 16 – lower classroom interior
  _WR, // row 17 – south wall of lower classrooms
  _CR, // row 18 – bottom horizontal corridor
  _BR, // row 19 – bottom border
];

// ─────────────────────────────────────────────
//  Spawn positions  (tile col, tile row)
// ─────────────────────────────────────────────
const PLAYER_SPAWN = { col: 15, row: 10 };

// Each teacher: { col, row, waypoints: [[c,r], ...] }
// Waypoints form a looping patrol path entirely on floor tiles.
const TEACHER_DEFS = [
  {
    col: 2, row: 1,
    waypoints: [
      [2,  1], [14, 1], [29, 1], [14, 1],
    ],
  },
  {
    col: 29, row: 9,
    waypoints: [
      [29, 9], [15, 9], [2, 9], [15, 9],
    ],
  },
  {
    col: 9, row: 18,
    waypoints: [
      [9, 18], [9, 10], [9,  1], [9, 10],
    ],
  },
  {
    col: 21, row: 2,
    waypoints: [
      [21,  2], [21,  9], [21, 18], [21,  9],
    ],
  },
];
