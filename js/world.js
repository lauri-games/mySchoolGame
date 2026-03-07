// ─────────────────────────────────────────────
//  world.js – Build the 3D school from tile data
// ─────────────────────────────────────────────
/* jshint esversion: 6 */

const World = (() => {
  let wallMeshes = [];
  let hideMeshes = [];
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
    if (stairMesh) scene.remove(stairMesh);
    if (floorMesh) scene.remove(floorMesh);
    if (ceilingMesh) scene.remove(ceilingMesh);
    lights.forEach(l => scene.remove(l));

    wallMeshes = [];
    hideMeshes = [];
    stairMesh  = null;
    floorMesh  = null;
    ceilingMesh = null;
    lights     = [];
  }

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
