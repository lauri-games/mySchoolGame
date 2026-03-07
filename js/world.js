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

  function build(scene) {
    clear(scene);

    const wallGeo = new THREE.BoxGeometry(TILE3D, WALL_HEIGHT, TILE3D);

    // Wall material
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x6b7280 });

    // Merge walls into a single mesh for performance
    // We'll use individual meshes for simplicity (32x20 = 640 max walls, fine for perf)
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

    // Hide spots (lockers – brown boxes, shorter than walls)
    const hideGeo = new THREE.BoxGeometry(TILE3D * 0.7, WALL_HEIGHT * 0.6, TILE3D * 0.7);
    const hideMat = new THREE.MeshLambertMaterial({ color: 0x6b4c36 });

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
    const stairMat = new THREE.MeshLambertMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.5 });
    stairMesh = new THREE.Mesh(stairGeo, stairMat);
    stairMesh.position.set(stairPos.x, 0.05, stairPos.z);
    scene.add(stairMesh);

    // Floor – large plane with checkerboard texture
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width  = COLS;
    floorCanvas.height = ROWS;
    const fctx = floorCanvas.getContext('2d');
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (LEVEL_MAP[r][c] === T_WALL) {
          fctx.fillStyle = '#6b7280';
        } else {
          fctx.fillStyle = (r + c) % 2 === 0 ? '#2b2d42' : '#252636';
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

    // Ceiling
    const ceilMat = new THREE.MeshLambertMaterial({ color: 0x1a1a2e, side: THREE.BackSide });
    ceilingMesh = new THREE.Mesh(floorGeo.clone(), ceilMat);
    ceilingMesh.rotation.x = -Math.PI / 2;
    ceilingMesh.position.set((COLS * TILE3D) / 2, WALL_HEIGHT, (ROWS * TILE3D) / 2);
    scene.add(ceilingMesh);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);
    lights.push(ambient);

    // Point lights in corridors for atmosphere
    const corridorRows = [1, 9, 10, 18];
    const lightCols = [5, 15, 26];
    corridorRows.forEach(r => {
      lightCols.forEach(c => {
        const lpos = tileToWorld(c, r);
        const pl = new THREE.PointLight(0xffe4b5, 0.8, TILE3D * 8);
        pl.position.set(lpos.x, WALL_HEIGHT - 0.3, lpos.z);
        scene.add(pl);
        lights.push(pl);
      });
    });

    // Lights inside classrooms
    const classRooms = [
      { col: 4, row: 5 }, { col: 16, row: 5 }, { col: 27, row: 5 },
      { col: 4, row: 14 }, { col: 16, row: 14 }, { col: 27, row: 14 },
    ];
    classRooms.forEach(cr => {
      const lpos = tileToWorld(cr.col, cr.row);
      const pl = new THREE.PointLight(0xffe4b5, 0.6, TILE3D * 6);
      pl.position.set(lpos.x, WALL_HEIGHT - 0.3, lpos.z);
      scene.add(pl);
      lights.push(pl);
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
