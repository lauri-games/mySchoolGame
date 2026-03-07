// ─────────────────────────────────────────────
//  world.js – Build the 3D school from tile data
// ─────────────────────────────────────────────
/* jshint esversion: 6 */

const World = (() => {
  let wallMeshes = [];
  let hideMeshes = [];
  let furnitureMeshes = [];
  let stairMesh  = null;
  let floorMesh  = null;
  let ceilingMesh = null;
  let lights     = [];

  // Convert tile grid coords to 3D world position (centre of tile)
  function tileToWorld(col, row) {
    return {
      x: col * TILE3D + TILE3D / 2,
      z: row * TILE3D + TILE3D / 2,
    };
  }

  // Convert 3D world position back to tile coords
  function worldToTile(x, z) {
    return {
      col: Math.floor(x / TILE3D),
      row: Math.floor(z / TILE3D),
    };
  }

  // Get tile type at world position
  function tileAtWorld(x, z) {
    const { col, row } = worldToTile(x, z);
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return T_WALL;
    return LEVEL_MAP[row][col];
  }

  // Check if a world position is blocked (wall)
  function isBlocked(x, z) {
    return tileAtWorld(x, z) === T_WALL;
  }

  function clear(scene) {
    wallMeshes.forEach(m => scene.remove(m));
    hideMeshes.forEach(m => scene.remove(m));
    furnitureMeshes.forEach(m => scene.remove(m));
    if (stairMesh) scene.remove(stairMesh);
    if (floorMesh) scene.remove(floorMesh);
    if (ceilingMesh) scene.remove(ceilingMesh);
    lights.forEach(l => scene.remove(l));

    wallMeshes = [];
    hideMeshes = [];
    furnitureMeshes = [];
    stairMesh  = null;
    floorMesh  = null;
    ceilingMesh = null;
    lights     = [];
  }

  // ── Classroom furniture meshes (tracked for cleanup) ─────────────────────

  // ── Room definitions: 6 classrooms, each with a colour + bounds ───────────
  // col/row ranges are the INTERIOR walkable cells (walls are at the boundary)
  // Colours: each room gets a cheerful accent colour for its inner wall panels
  const ROOM_DEFS = [
    // upper row of classrooms
    { id:'UL', colMin:1,  colMax:7,  rowMin:3, rowMax:7, wallColor:0xff8a80, floorColor:0xf5deb3 }, // red/salmon
    { id:'UM', colMin:12, colMax:19, rowMin:3, rowMax:7, wallColor:0x80cbc4, floorColor:0xf5deb3 }, // teal
    { id:'UR', colMin:24, colMax:30, rowMin:3, rowMax:7, wallColor:0xffcc80, floorColor:0xf5deb3 }, // orange
    // lower row of classrooms
    { id:'LL', colMin:1,  colMax:7,  rowMin:12, rowMax:16, wallColor:0xce93d8, floorColor:0xf5deb3 }, // purple
    { id:'LM', colMin:12, colMax:19, rowMin:12, rowMax:16, wallColor:0xa5d6a7, floorColor:0xf5deb3 }, // green
    { id:'LR', colMin:24, colMax:30, rowMin:12, rowMax:16, wallColor:0x90caf9, floorColor:0xf5deb3 }, // blue
  ];

  // ── helpers ──────────────────────────────────────────────────────────────

  /** Add a ceiling lamp: visible housing + point light */
  function addCeilingLamp(scene, wx, wz, color, intensity, range) {
    // Housing – flat disc / cylinder
    const hGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.12, 12);
    const hMat = new THREE.MeshLambertMaterial({ color: 0xf5f0e8 });
    const housing = new THREE.Mesh(hGeo, hMat);
    housing.position.set(wx, WALL_HEIGHT - 0.07, wz);
    scene.add(housing);
    hideMeshes.push(housing); // reuse array for cleanup

    // Glowing diffuser disc (emissive)
    const dGeo = new THREE.CylinderGeometry(0.20, 0.20, 0.02, 12);
    const dMat = new THREE.MeshLambertMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 1.0,
    });
    const diffuser = new THREE.Mesh(dGeo, dMat);
    diffuser.position.set(wx, WALL_HEIGHT - 0.14, wz);
    scene.add(diffuser);
    hideMeshes.push(diffuser);

    // Actual light
    const pl = new THREE.PointLight(color, intensity, range);
    pl.position.set(wx, WALL_HEIGHT - 0.15, wz);
    scene.add(pl);
    lights.push(pl);
  }

  /** Add a window pane on a wall face.
   *  dir: 'N'|'S'|'E'|'W'  – which wall face the window sits on */
  function addWindow(scene, col, row, dir) {
    const pos = tileToWorld(col, row);
    const W   = TILE3D * 0.62;   // window width
    const H   = WALL_HEIGHT * 0.45; // window height
    const yc  = WALL_HEIGHT * 0.60; // vertical centre (upper half of wall)
    const off = TILE3D * 0.501;  // push slightly outside the wall face

    // Glass pane
    const glassGeo = new THREE.PlaneGeometry(W, H);
    const glassMat = new THREE.MeshLambertMaterial({
      color: 0x8dd8f8,
      emissive: 0x4ab8e0,
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);

    // Frame
    const frameMat = new THREE.MeshLambertMaterial({ color: 0xd8cfc0 });
    const frameGeo = new THREE.PlaneGeometry(W + 0.10, H + 0.10);
    const frame = new THREE.Mesh(frameGeo, frameMat);

    switch (dir) {
      case 'N':
        glass.position.set(pos.x, yc, pos.z - off);
        frame.position.set(pos.x, yc, pos.z - off - 0.01);
        break;
      case 'S':
        glass.position.set(pos.x, yc, pos.z + off);
        frame.position.set(pos.x, yc, pos.z + off + 0.01);
        glass.rotation.y = Math.PI; frame.rotation.y = Math.PI;
        break;
      case 'W':
        glass.position.set(pos.x - off, yc, pos.z);
        frame.position.set(pos.x - off - 0.01, yc, pos.z);
        glass.rotation.y =  Math.PI / 2; frame.rotation.y =  Math.PI / 2;
        break;
      case 'E':
        glass.position.set(pos.x + off, yc, pos.z);
        frame.position.set(pos.x + off + 0.01, yc, pos.z);
        glass.rotation.y = -Math.PI / 2; frame.rotation.y = -Math.PI / 2;
        break;
    }

    scene.add(frame);
    scene.add(glass);
    hideMeshes.push(frame, glass);
  }

  // ── build ─────────────────────────────────────────────────────────────────

  /** Paint coloured wall panels on the inner faces of classroom walls */
  function addRoomWallPanels(scene, room) {
    const mat = new THREE.MeshLambertMaterial({ color: room.wallColor });
    // Panel dimensions
    const panelH = WALL_HEIGHT * 0.55;  // lower half of the wall
    const panelY = panelH / 2 + 0.02;
    const thickness = 0.04;

    const x0 = room.colMin * TILE3D;          // west inner face X
    const x1 = (room.colMax + 1) * TILE3D;    // east inner face X
    const z0 = room.rowMin * TILE3D;           // north inner face Z
    const z1 = (room.rowMax + 1) * TILE3D;     // south inner face Z
    const roomW = x1 - x0;
    const roomD = z1 - z0;

    // North inner wall panel
    const nGeo = new THREE.BoxGeometry(roomW, panelH, thickness);
    const nMesh = new THREE.Mesh(nGeo, mat);
    nMesh.position.set((x0 + x1) / 2, panelY, z0 + thickness / 2);
    scene.add(nMesh); furnitureMeshes.push(nMesh);

    // South inner wall panel
    const sGeo = new THREE.BoxGeometry(roomW, panelH, thickness);
    const sMesh = new THREE.Mesh(sGeo, mat);
    sMesh.position.set((x0 + x1) / 2, panelY, z1 - thickness / 2);
    scene.add(sMesh); furnitureMeshes.push(sMesh);

    // West inner wall panel
    const wGeo = new THREE.BoxGeometry(thickness, panelH, roomD);
    const wMesh = new THREE.Mesh(wGeo, mat);
    wMesh.position.set(x0 + thickness / 2, panelY, (z0 + z1) / 2);
    scene.add(wMesh); furnitureMeshes.push(wMesh);

    // East inner wall panel
    const eGeo = new THREE.BoxGeometry(thickness, panelH, roomD);
    const eMesh = new THREE.Mesh(eGeo, mat);
    eMesh.position.set(x1 - thickness / 2, panelY, (z0 + z1) / 2);
    scene.add(eMesh); furnitureMeshes.push(eMesh);
  }

  /** Add a blackboard / whiteboard on the north wall inside the room */
  function addBlackboard(scene, room) {
    const bW = TILE3D * 2.2;
    const bH = WALL_HEIGHT * 0.38;
    const bGeo = new THREE.BoxGeometry(bW, bH, 0.06);
    const bMat = new THREE.MeshLambertMaterial({ color: 0x1b5e20 }); // dark green board
    const board = new THREE.Mesh(bGeo, bMat);

    const cx = ((room.colMin + room.colMax + 1) / 2) * TILE3D;
    const z  = room.rowMin * TILE3D + 0.15;
    board.position.set(cx, WALL_HEIGHT * 0.65, z);
    scene.add(board); furnitureMeshes.push(board);

    // White chalk lines (thin strips)
    const lineMat = new THREE.MeshLambertMaterial({ color: 0xf5f5f5 });
    for (let i = 0; i < 3; i++) {
      const lGeo = new THREE.BoxGeometry(bW * 0.82, 0.025, 0.07);
      const lMesh = new THREE.Mesh(lGeo, lineMat);
      lMesh.position.set(cx, WALL_HEIGHT * 0.55 + i * 0.13, z);
      scene.add(lMesh); furnitureMeshes.push(lMesh);
    }

    // Board frame (dark wood)
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x5d4037 });
    const topBot = new THREE.BoxGeometry(bW + 0.06, 0.05, 0.08);
    const sides  = new THREE.BoxGeometry(0.05, bH + 0.06, 0.08);
    const top  = new THREE.Mesh(topBot, frameMat);
    const bot  = new THREE.Mesh(topBot.clone(), frameMat);
    const lft  = new THREE.Mesh(sides, frameMat);
    const rgt  = new THREE.Mesh(sides.clone(), frameMat);
    top.position.set(cx, WALL_HEIGHT * 0.65 + bH / 2, z);
    bot.position.set(cx, WALL_HEIGHT * 0.65 - bH / 2, z);
    lft.position.set(cx - bW / 2, WALL_HEIGHT * 0.65, z);
    rgt.position.set(cx + bW / 2, WALL_HEIGHT * 0.65, z);
    [top,bot,lft,rgt].forEach(m => { scene.add(m); furnitureMeshes.push(m); });
  }

  /** Add teacher's desk at the front of the room */
  function addTeacherDesk(scene, room) {
    const cx = ((room.colMin + room.colMax + 1) / 2) * TILE3D;
    const z  = room.rowMin * TILE3D + TILE3D * 1.1;

    // Desk top
    const dtGeo = new THREE.BoxGeometry(TILE3D * 1.0, 0.08, TILE3D * 0.55);
    const dtMat = new THREE.MeshLambertMaterial({ color: 0x8d6e63 });
    const dt = new THREE.Mesh(dtGeo, dtMat);
    dt.position.set(cx, 0.72, z);
    scene.add(dt); furnitureMeshes.push(dt);

    // Desk body
    const dbGeo = new THREE.BoxGeometry(TILE3D * 1.0, 0.70, TILE3D * 0.50);
    const db = new THREE.Mesh(dbGeo, dtMat);
    db.position.set(cx, 0.36, z);
    scene.add(db); furnitureMeshes.push(db);

    // Teacher's chair
    addChair(scene, cx + TILE3D * 0.0, z + TILE3D * 0.45, 0x5d4037);
  }

  /** Add a simple chair */
  function addChair(scene, x, z, color) {
    const mat = new THREE.MeshLambertMaterial({ color });
    // seat
    const sGeo = new THREE.BoxGeometry(0.38, 0.05, 0.36);
    const seat = new THREE.Mesh(sGeo, mat);
    seat.position.set(x, 0.44, z);
    scene.add(seat); furnitureMeshes.push(seat);
    // backrest
    const bGeo = new THREE.BoxGeometry(0.38, 0.35, 0.04);
    const back = new THREE.Mesh(bGeo, mat);
    back.position.set(x, 0.66, z - 0.16);
    scene.add(back); furnitureMeshes.push(back);
    // legs (2 front, 2 back)
    const lGeo = new THREE.BoxGeometry(0.04, 0.42, 0.04);
    [[-0.15, 0.14], [0.15, 0.14], [-0.15, -0.14], [0.15, -0.14]].forEach(([dx, dz]) => {
      const leg = new THREE.Mesh(lGeo, mat);
      leg.position.set(x + dx, 0.21, z + dz);
      scene.add(leg); furnitureMeshes.push(leg);
    });
  }

  /** Add a student desk + chair pair */
  function addStudentDesk(scene, x, z) {
    const deskMat = new THREE.MeshLambertMaterial({ color: 0xd7ccc8 });
    // Desk top
    const tGeo = new THREE.BoxGeometry(0.60, 0.05, 0.44);
    const top = new THREE.Mesh(tGeo, deskMat);
    top.position.set(x, 0.70, z);
    scene.add(top); furnitureMeshes.push(top);
    // Desk legs
    const lMat = new THREE.MeshLambertMaterial({ color: 0x9e9e9e });
    const lGeo = new THREE.BoxGeometry(0.04, 0.68, 0.04);
    [[-0.26, 0.18], [0.26, 0.18], [-0.26, -0.18], [0.26, -0.18]].forEach(([dx, dz]) => {
      const leg = new THREE.Mesh(lGeo, lMat);
      leg.position.set(x + dx, 0.34, z + dz);
      scene.add(leg); furnitureMeshes.push(leg);
    });
    // Chair behind the desk
    addChair(scene, x, z + 0.50, 0x607d8b);
  }

  /** Fill a classroom with student desks in a grid pattern */
  function addClassroomFurniture(scene, room) {
    addRoomWallPanels(scene, room);
    addBlackboard(scene, room);
    addTeacherDesk(scene, room);

    // Student desks: rows of 2, starting after the teacher area
    const startZ = room.rowMin * TILE3D + TILE3D * 2.0;
    const endZ   = (room.rowMax + 1) * TILE3D - TILE3D * 0.6;
    const startX = room.colMin * TILE3D + TILE3D * 0.65;
    const endX   = (room.colMax + 1) * TILE3D - TILE3D * 0.65;

    const xStep = TILE3D * 0.95;
    const zStep = TILE3D * 0.92;

    for (let zz = startZ; zz < endZ; zz += zStep) {
      for (let xx = startX; xx < endX; xx += xStep) {
        // Don't place desks on T_HIDE tiles or in doorway rows
        const { col, row } = worldToTile(xx, zz);
        const tile = (LEVEL_MAP[row] && typeof LEVEL_MAP[row][col] !== 'undefined')
          ? LEVEL_MAP[row][col] : T_WALL;
        if (tile === T_FLOOR) {
          addStudentDesk(scene, xx, zz);
        }
      }
    }
  }

  function build(scene) {
    clear(scene);

    const wallGeo = new THREE.BoxGeometry(TILE3D, WALL_HEIGHT, TILE3D);

    // Bright cream wall material
    const wallMat = new THREE.MeshLambertMaterial({ color: 0xe8e0d0 });

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const tile = LEVEL_MAP[row][col];
        const pos = tileToWorld(col, row);

        if (tile === T_WALL) {
          const mesh = new THREE.Mesh(wallGeo, wallMat);
          mesh.position.set(pos.x, WALL_HEIGHT / 2, pos.z);
          mesh.castShadow = false;
          mesh.receiveShadow = true;
          scene.add(mesh);
          wallMeshes.push(mesh);
        }
      }
    }

    // Hide spots (lockers – wooden boxes, shorter than walls)
    const hideGeo = new THREE.BoxGeometry(TILE3D * 0.7, WALL_HEIGHT * 0.6, TILE3D * 0.7);
    const hideMat = new THREE.MeshLambertMaterial({ color: 0x9c7050 });

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (LEVEL_MAP[row][col] === T_HIDE) {
          const pos = tileToWorld(col, row);
          const mesh = new THREE.Mesh(hideGeo, hideMat);
          mesh.position.set(pos.x, WALL_HEIGHT * 0.3, pos.z);
          scene.add(mesh);
          hideMeshes.push(mesh);
        }
      }
    }

    // Stairs indicator (glowing cylinder on floor)
    const stairPos = tileToWorld(STAIR_POS.col, STAIR_POS.row);
    const stairGeo = new THREE.CylinderGeometry(TILE3D * 0.4, TILE3D * 0.4, 0.1, 16);
    const stairMat = new THREE.MeshLambertMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.8 });
    stairMesh = new THREE.Mesh(stairGeo, stairMat);
    stairMesh.position.set(stairPos.x, 0.05, stairPos.z);
    scene.add(stairMesh);

    // ── Floor – warm light checkerboard ──────────────────────────────────────
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width  = COLS;
    floorCanvas.height = ROWS;
    const fctx = floorCanvas.getContext('2d');
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (LEVEL_MAP[r][c] === T_WALL) {
          fctx.fillStyle = '#c8bfb0';
        } else {
          // warm beige checkerboard
          fctx.fillStyle = (r + c) % 2 === 0 ? '#ddd5c0' : '#cdc4ae';
        }
        fctx.fillRect(c, r, 1, 1);
      }
    }
    const floorTex = new THREE.CanvasTexture(floorCanvas);
    floorTex.magFilter = THREE.NearestFilter;
    floorTex.minFilter = THREE.NearestFilter;

    const floorGeo = new THREE.PlaneGeometry(COLS * TILE3D, ROWS * TILE3D);
    const floorMat = new THREE.MeshLambertMaterial({ map: floorTex });
    floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set((COLS * TILE3D) / 2, 0, (ROWS * TILE3D) / 2);
    scene.add(floorMesh);

    // ── Ceiling – bright white-grey ───────────────────────────────────────────
    const ceilMat = new THREE.MeshLambertMaterial({ color: 0xf0ede8, side: THREE.BackSide });
    ceilingMesh = new THREE.Mesh(floorGeo.clone(), ceilMat);
    ceilingMesh.rotation.x = -Math.PI / 2;
    ceilingMesh.position.set((COLS * TILE3D) / 2, WALL_HEIGHT, (ROWS * TILE3D) / 2);
    scene.add(ceilingMesh);

    // ── Global ambient – bright, warm school feeling ──────────────────────────
    const ambient = new THREE.AmbientLight(0xfff8f0, 0.72);
    scene.add(ambient);
    lights.push(ambient);

    // ── Ceiling lamps in corridors ────────────────────────────────────────────
    // top corridor  (row 1), middle corridors (rows 9/10), bottom corridor (row 18)
    const corridorLightRows = [1, 9, 10, 18];
    const corridorLightCols = [3, 8, 15, 22, 28];
    corridorLightRows.forEach(r => {
      corridorLightCols.forEach(c => {
        if (LEVEL_MAP[r] && LEVEL_MAP[r][c] !== T_WALL) {
          const lpos = tileToWorld(c, r);
          addCeilingLamp(scene, lpos.x, lpos.z, 0xfff5d6, 1.1, TILE3D * 9);
        }
      });
    });

    // ── Ceiling lamps in classrooms ───────────────────────────────────────────
    // Upper classrooms: rows 3-7, lower classrooms: rows 12-16
    // Three room columns: cols ~2-7, ~12-19, ~24-30
    const roomLampDefs = [
      // upper left   upper mid   upper right
      { col: 4, row: 4 }, { col: 4, row: 6 },
      { col: 14, row: 4 }, { col: 14, row: 6 },
      { col: 17, row: 4 }, { col: 17, row: 6 },
      { col: 26, row: 4 }, { col: 26, row: 6 },
      // lower left   lower mid   lower right
      { col: 4, row: 13 }, { col: 4, row: 15 },
      { col: 14, row: 13 }, { col: 14, row: 15 },
      { col: 17, row: 13 }, { col: 17, row: 15 },
      { col: 26, row: 13 }, { col: 26, row: 15 },
    ];
    roomLampDefs.forEach(({ col, row }) => {
      const lpos = tileToWorld(col, row);
      addCeilingLamp(scene, lpos.x, lpos.z, 0xfff8e8, 1.0, TILE3D * 8);
    });

    // ── Windows ───────────────────────────────────────────────────────────────
    // Windows face NORTH on the top border walls (row 2) and
    // SOUTH on the bottom border walls (row 17).
    // Upper classrooms: rows 2-8 sit between the two corridor rows.
    // Place windows in the outer walls (row 2 → facing N, row 17 → facing S).
    // Also place windows on the east outer wall (col 31 facing E)
    // and west outer wall (col 0 facing W) for side rooms.

    // North-facing windows (on the inner south face of the top border wall row=1)
    // and south-facing windows on inner north face of bottom border wall row=18
    const windowCols = [2, 3, 5, 6, 13, 14, 16, 17, 18, 24, 25, 27, 28];
    windowCols.forEach(c => {
      // Upper rooms – windows look out through north wall (row 2)
      if (LEVEL_MAP[2] && LEVEL_MAP[2][c] === T_WALL) {
        addWindow(scene, c, 2, 'N');
      }
      // Lower rooms – windows look out through south wall (row 17)
      if (LEVEL_MAP[17] && LEVEL_MAP[17][c] === T_WALL) {
        addWindow(scene, c, 17, 'S');
      }
    });

    // East/West outer wall windows (classroom side rooms)
    const windowRows = [3, 4, 5, 6, 7, 12, 13, 14, 15, 16];
    windowRows.forEach(r => {
      // West outer wall col 0
      if (LEVEL_MAP[r] && LEVEL_MAP[r][0] === T_WALL) {
        addWindow(scene, 0, r, 'W');
      }
      // East outer wall col 31
      if (LEVEL_MAP[r] && LEVEL_MAP[r][31] === T_WALL) {
        addWindow(scene, 31, r, 'E');
      }
    });

    // ── Classroom furniture (desks, chairs, blackboards, coloured walls) ─────
    ROOM_DEFS.forEach(room => addClassroomFurniture(scene, room));
  }

  return {
    build,
    clear,
    tileToWorld,
    worldToTile,
    tileAtWorld,
    isBlocked,
  };
})();
