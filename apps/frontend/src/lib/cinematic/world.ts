import * as THREE from 'three';
import { createModelLoader, loadEnvironment, loadModel, loadPbr, type PbrMaps } from './assets';

/**
 * Builds the entire procedural cinematic world in raw three.js (no react-reconciler / R3F — React
 * stays completely out of the render path). Returns the scene, camera, a set of mutable "handles"
 * the director tweens, an ambient-update fn, and a disposer. All geometry is simple boxes/planes/
 * instances with clean seams to swap in real GLB later. `enrichWorld()` (below) does the async
 * realism pass — HDRI IBL + real PBR textures — grafted onto these same materials.
 */

export interface WorldHandles {
  env: {
    skyMat: THREE.ShaderMaterial;
    fog: THREE.Fog;
    sun: THREE.DirectionalLight;
    ambient: THREE.AmbientLight;
  };
  villa: {
    slab: THREE.Group;
    rebar: THREE.Group;
    walls: THREE.Group[];
    columns: THREE.Group[];
    upper: THREE.Group;
    roof: THREE.Group;
    shellMats: THREE.MeshStandardMaterial[];
    claddingMat: THREE.MeshStandardMaterial;
    glassMat: THREE.MeshStandardMaterial;
    windowMat: THREE.MeshStandardMaterial;
    interior: THREE.Group;
    interiorLight: THREE.PointLight;
    windowMesh: THREE.InstancedMesh;
    floorMat: THREE.MeshStandardMaterial;
    furnitureGroup: THREE.Group;
  };
  grass: { group: THREE.Group; material: THREE.ShaderMaterial };
  birds: { group: THREE.Group; flock: THREE.Group; material: THREE.ShaderMaterial };
  gate: { group: THREE.Group; left: THREE.Group; right: THREE.Group };
  terrainMat: THREE.MeshStandardMaterial;
}

export interface World {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  handles: WorldHandles;
  updateAmbient: (elapsed: number) => void;
  dispose: () => void;
}

const SHELL = 0x8c8c86;

// ---------- primitives ----------

function buildSky(): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color(0x1a2436) },
      uBottom: { value: new THREE.Color(0x2f3a42) },
      uExponent: { value: 0.8 },
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() { vWorld = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: `
      uniform vec3 uTop; uniform vec3 uBottom; uniform float uExponent;
      varying vec3 vWorld;
      void main() {
        float h = normalize(vWorld).y * 0.5 + 0.5;
        gl_FragColor = vec4(mix(uBottom, uTop, pow(clamp(h,0.0,1.0), uExponent)), 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(60, 24, 16), mat);
  (mesh as unknown as { userData: { mat: THREE.ShaderMaterial } }).userData = { mat };
  return mesh;
}

function buildTerrain(): { mesh: THREE.Mesh; material: THREE.MeshStandardMaterial } {
  const g = new THREE.PlaneGeometry(140, 140, 48, 48);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const flat = THREE.MathUtils.clamp((Math.hypot(x, y) - 7) / 22, 0, 1);
    pos.setZ(i, (Math.sin(x * 0.18) * Math.cos(y * 0.16) + Math.sin(x * 0.05 + y * 0.07)) * 0.6 * flat);
  }
  g.computeVertexNormals();
  g.rotateX(-Math.PI / 2);
  const material = new THREE.MeshStandardMaterial({ color: 0x20261f, roughness: 1, flatShading: true });
  return { mesh: new THREE.Mesh(g, material), material };
}

function buildGrass(count = 1400, radius = 16, innerRadius = 5, wind = 0.18) {
  const geo = new THREE.PlaneGeometry(0.06, 1, 1, 3);
  geo.translate(0, 0.5, 0);
  const material = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uWind: { value: wind },
      uBase: { value: new THREE.Color(0x1d2a1c) },
      uTip: { value: new THREE.Color(0x7d7a3f) },
    },
    vertexShader: `
      uniform float uTime; uniform float uWind; varying float vY;
      void main() {
        vY = position.y;
        vec4 wp = instanceMatrix * vec4(0.0,0.0,0.0,1.0);
        float sway = sin(uTime*1.5 + wp.x*0.55 + wp.z*0.55) * uWind * position.y;
        vec3 p = position; p.x += sway; p.z += sway*0.35;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p,1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uBase; uniform vec3 uTip; varying float vY;
      void main() { gl_FragColor = vec4(mix(uBase, uTip, vY), 1.0); }
    `,
  });
  const mesh = new THREE.InstancedMesh(geo, material, count);
  mesh.frustumCulled = false;
  const d = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const ang = i * 2.399963;
    const rad = innerRadius + Math.sqrt(t) * (radius - innerRadius);
    d.position.set(Math.cos(ang) * rad + Math.sin(i * 12.9898) * 0.5, 0, Math.sin(ang) * rad + Math.cos(i * 4.1) * 0.5);
    d.rotation.y = i * 1.7;
    d.scale.set(1, 0.6 + (Math.sin(i * 7.7) * 0.5 + 0.5) * 0.9, 1);
    d.updateMatrix();
    mesh.setMatrixAt(i, d.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  const group = new THREE.Group();
  group.add(mesh);
  return { group, material };
}

function buildBirds(count = 14) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    'position',
    new THREE.BufferAttribute(
      new Float32Array([0, 0, 0.15, -0.5, 0, 0, 0, 0, -0.05, 0, 0, 0.15, 0, 0, -0.05, 0.5, 0, 0]),
      3,
    ),
  );
  const material = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0x0a0a0a) } },
    vertexShader: `
      uniform float uTime;
      void main() {
        vec4 wp = instanceMatrix * vec4(0.0,0.0,0.0,1.0);
        float flap = sin(uTime*7.0 + wp.x + wp.z) * 0.35 * abs(position.x);
        vec3 p = position; p.y += flap;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p,1.0);
      }
    `,
    fragmentShader: `uniform vec3 uColor; void main(){ gl_FragColor = vec4(uColor, 0.75); }`,
  });
  const mesh = new THREE.InstancedMesh(geo, material, count);
  mesh.frustumCulled = false;
  const d = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const ang = i * 2.399963;
    const rad = 6 + (i % 5) * 1.4;
    d.position.set(Math.cos(ang) * rad, 7 + Math.sin(i * 1.3) * 2.2, Math.sin(ang) * rad - 4);
    d.rotation.set(0.1, ang, 0);
    d.scale.setScalar(0.5 + (i % 3) * 0.18);
    d.updateMatrix();
    mesh.setMatrixAt(i, d.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  const flock = new THREE.Group();
  flock.add(mesh);
  const group = new THREE.Group();
  group.add(flock);
  return { group, flock, material };
}

/** A box that grows from a grounded pivot (group.scale.y 0→1). */
function growGroup(
  size: [number, number, number],
  pos: [number, number, number],
  matOpts: THREE.MeshStandardMaterialParameters,
): { group: THREE.Group; material: THREE.MeshStandardMaterial } {
  const material = new THREE.MeshStandardMaterial(matOpts);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.y = size[1] / 2;
  const group = new THREE.Group();
  group.position.set(...pos);
  group.scale.set(1, 0, 1);
  group.add(mesh);
  return { group, material };
}

function buildGate() {
  const group = new THREE.Group();
  group.position.set(0, 0, 4.6);
  const span = 3;
  const height = 2.2;
  const half = span / 2;
  const postMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6, metalness: 0.4 });
  for (const x of [-half, half]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, height + 0.4, 0.18), postMat);
    post.position.set(x, height / 2 + 0.1, 0);
    group.add(post);
  }
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0xc8a15a,
    roughness: 0.35,
    metalness: 0.8,
    emissive: new THREE.Color(0xc8a15a),
    emissiveIntensity: 0.05,
  });
  const makeHinge = (hingeX: number, dir: 1 | -1) => {
    const hinge = new THREE.Group();
    hinge.position.set(hingeX, 0, 0);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(half, height, 0.06), panelMat);
    panel.position.set((dir * half) / 2, height / 2, 0);
    hinge.add(panel);
    return hinge;
  };
  const left = makeHinge(-half, 1);
  const right = makeHinge(half, -1);
  group.add(left, right);
  return { group, left, right };
}

function buildVilla() {
  const root = new THREE.Group();
  const shellMats: THREE.MeshStandardMaterial[] = [];

  // slab + rebar
  const slab = growGroup([8.6, 0.3, 8.6], [0, 0, 0], { color: 0x6f6f6b, roughness: 0.95 });
  root.add(slab.group);

  const rebar = new THREE.Group();
  rebar.position.set(0, 0.3, 0);
  rebar.scale.set(1, 0, 1);
  const rebarMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.04, 0.8, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x6b6b6b, roughness: 0.5, metalness: 0.7 }),
    49,
  );
  const rd = new THREE.Object3D();
  let ri = 0;
  for (let gx = -3; gx <= 3; gx++)
    for (let gz = -3; gz <= 3; gz++) {
      rd.position.set(gx * 1.1, 0.4, gz * 1.1);
      rd.updateMatrix();
      rebarMesh.setMatrixAt(ri++, rd.matrix);
    }
  rebarMesh.instanceMatrix.needsUpdate = true;
  rebar.add(rebarMesh);
  root.add(rebar);

  // walls (DoubleSide so interiors read from inside)
  const wallDefs: { size: [number, number, number]; pos: [number, number, number] }[] = [
    { size: [8.4, 3, 0.25], pos: [0, 0.3, -4] },
    { size: [0.25, 3, 8.4], pos: [-4, 0.3, 0] },
    { size: [0.25, 3, 8.4], pos: [4, 0.3, 0] },
    { size: [3.1, 3, 0.25], pos: [-2.65, 0.3, 4] },
    { size: [3.1, 3, 0.25], pos: [2.65, 0.3, 4] },
  ];
  const walls = wallDefs.map((w) => {
    const g = growGroup(w.size, w.pos, { color: SHELL, roughness: 0.85, side: THREE.DoubleSide });
    shellMats.push(g.material);
    root.add(g.group);
    return g.group;
  });

  // columns
  const colPos: [number, number][] = [
    [-3.9, -3.9],
    [3.9, -3.9],
    [-3.9, 3.9],
    [3.9, 3.9],
  ];
  const columns = colPos.map(([x, z]) => {
    const g = growGroup([0.32, 3.4, 0.32], [x, 0.3, z], { color: 0x7d7d78, roughness: 0.8 });
    shellMats.push(g.material);
    root.add(g.group);
    return g.group;
  });

  // upper setback
  const upper = growGroup([6, 2.6, 6], [0, 3.3, -0.4], { color: SHELL, roughness: 0.85, side: THREE.DoubleSide });
  shellMats.push(upper.material);
  root.add(upper.group);

  // roof (drops in — starts hidden/high, director animates)
  const roof = new THREE.Group();
  roof.position.set(0, 6.1, -0.4);
  roof.visible = false;
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x5f5f5b, roughness: 0.9 });
  shellMats.push(roofMat);
  roof.add(new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.3, 6.6), roofMat));
  root.add(roof);

  // cladding (shared material → tween opacity once)
  const claddingMat = new THREE.MeshStandardMaterial({
    color: 0xb98a52,
    roughness: 0.5,
    metalness: 0.35,
    transparent: true,
    opacity: 0,
  });
  const cladDefs: { s: [number, number, number]; p: [number, number, number] }[] = [
    { s: [8.5, 3, 0.06], p: [0, 1.8, -4.16] },
    { s: [0.06, 3, 8.5], p: [-4.16, 1.8, 0] },
    { s: [0.06, 3, 8.5], p: [4.16, 1.8, 0] },
    { s: [6.1, 2.6, 0.06], p: [0, 4.6, -3.46] },
  ];
  for (const c of cladDefs) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...c.s), claddingMat);
    m.position.set(...c.p);
    root.add(m);
  }

  // glass
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0b1418,
    roughness: 0.1,
    metalness: 0.9,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(2, 2.4), glassMat);
  glass.position.set(0, 1.9, 4.03);
  root.add(glass);

  // emissive windows (instanced)
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x120d08,
    emissive: new THREE.Color(0xffcf87),
    emissiveIntensity: 0,
    roughness: 0.4,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });
  const winMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.7, 1.0), windowMat, 24);
  winMesh.frustumCulled = false;
  winMesh.visible = false; // appears with the cladding in Scene 4
  const wd = new THREE.Object3D();
  let wi = 0;
  const heights = [1.4, 3.4];
  const across = [-2.4, 0, 2.4];
  for (const z of [4.02, -4.02])
    for (const x of across)
      for (const y of heights) {
        wd.position.set(x, y, z);
        wd.rotation.set(0, z > 0 ? 0 : Math.PI, 0);
        wd.updateMatrix();
        winMesh.setMatrixAt(wi++, wd.matrix);
      }
  for (const x of [-4.02, 4.02])
    for (const z of across)
      for (const y of heights) {
        wd.position.set(x, y, z);
        wd.rotation.set(0, x > 0 ? Math.PI / 2 : -Math.PI / 2, 0);
        wd.updateMatrix();
        winMesh.setMatrixAt(wi++, wd.matrix);
      }
  winMesh.instanceMatrix.needsUpdate = true;
  root.add(winMesh);

  // interior (warm, hidden until scenes 6–9)
  const interior = new THREE.Group();
  interior.visible = false;
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xece7dd, roughness: 0.35, side: THREE.DoubleSide });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 7.6), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.46;
  interior.add(floor);
  const furn: { s: [number, number, number]; p: [number, number, number] }[] = [
    { s: [2, 0.6, 0.9], p: [-2, 0.75, -2] },
    { s: [1.2, 0.35, 0.7], p: [-2, 0.6, -0.9] },
    { s: [2, 0.5, 1.3], p: [-2.2, 0.7, 2.4] },
    { s: [2.4, 0.9, 0.6], p: [2.6, 0.9, -2.6] },
    { s: [0.6, 1.6, 2], p: [3.4, 1.2, 0] },
  ];
  const furnMat = new THREE.MeshStandardMaterial({ color: 0x3a2f26, roughness: 0.6 });
  const furnitureGroup = new THREE.Group(); // procedural boxes; hidden once real GLB furniture loads
  for (const f of furn) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...f.s), furnMat);
    m.position.set(...f.p);
    furnitureGroup.add(m);
  }
  interior.add(furnitureGroup);
  const interiorLight = new THREE.PointLight(0xffb968, 0, 14);
  interiorLight.position.set(0, 2.4, 0);
  interior.add(interiorLight);
  root.add(interior);

  return {
    root,
    slab: slab.group,
    rebar,
    walls,
    columns,
    upper: upper.group,
    roof,
    shellMats,
    claddingMat,
    glassMat,
    windowMat,
    windowMesh: winMesh,
    interior,
    interiorLight,
    floorMat,
    furnitureGroup,
  };
}

// ---------- assembly ----------

export function createWorld(): World {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);

  const sky = buildSky();
  const skyMat = (sky as unknown as { userData: { mat: THREE.ShaderMaterial } }).userData.mat;
  scene.add(sky);

  const fog = new THREE.Fog(0x223038, 14, 60);
  scene.fog = fog;
  // HDRI env supplies most of the ambient/reflections, so keep the fill low; the sun is the shadow key.
  const ambient = new THREE.AmbientLight(0x9fb4c9, 0.3);
  const sun = new THREE.DirectionalLight(0xfff1e0, 2.7);
  sun.position.set(9, 12, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 60;
  sun.shadow.camera.left = -16;
  sun.shadow.camera.right = 16;
  sun.shadow.camera.top = 16;
  sun.shadow.camera.bottom = -16;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(ambient, sun);

  const terrain = buildTerrain();
  scene.add(terrain.mesh);

  const grass = buildGrass();
  scene.add(grass.group);
  const birds = buildBirds();
  scene.add(birds.group);

  const villa = buildVilla();
  scene.add(villa.root);

  const gate = buildGate();
  gate.group.visible = false; // appears as the camera approaches in Scene 5
  scene.add(gate.group);

  // Shadows: the villa + gate cast and receive; the terrain receives; sky/grass/birds opt out.
  villa.root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  gate.group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) m.castShadow = true;
  });
  terrain.mesh.receiveShadow = true;

  const handles: WorldHandles = {
    env: { skyMat, fog, sun, ambient },
    villa: {
      slab: villa.slab,
      rebar: villa.rebar,
      walls: villa.walls,
      columns: villa.columns,
      upper: villa.upper,
      roof: villa.roof,
      shellMats: villa.shellMats,
      claddingMat: villa.claddingMat,
      glassMat: villa.glassMat,
      windowMat: villa.windowMat,
      interior: villa.interior,
      interiorLight: villa.interiorLight,
      windowMesh: villa.windowMesh,
      floorMat: villa.floorMat,
      furnitureGroup: villa.furnitureGroup,
    },
    grass: { group: grass.group, material: grass.material },
    birds: { group: birds.group, flock: birds.flock, material: birds.material },
    gate,
    terrainMat: terrain.material,
  };

  const updateAmbient = (elapsed: number) => {
    grass.material.uniforms.uTime.value = elapsed;
    birds.material.uniforms.uTime.value = elapsed;
    birds.flock.rotation.y = elapsed * 0.02;
  };

  const dispose = () => {
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    });
  };

  return { scene, camera, handles, updateAmbient, dispose };
}

/**
 * Async realism pass (post-mount, off the SSR/LCP path): loads the HDRI environment for image-based
 * lighting + reflections, and real CC0 PBR textures grafted onto the procedural materials. Each asset
 * is guarded — if it fails the material keeps its solid colour, so a scene never breaks. Call
 * `invalidate()` after each graft so the demand loop repaints. The director's colour/opacity/emissive
 * tweens keep working (colour tints the albedo map).
 */
export async function enrichWorld(
  world: World,
  renderer: THREE.WebGLRenderer,
  invalidate: () => void,
): Promise<void> {
  const { scene, handles } = world;

  loadEnvironment(renderer, 'sunset_puresky_1k.hdr')
    .then((env) => {
      scene.environment = env;
      (scene as THREE.Scene & { environmentIntensity: number }).environmentIntensity = 0.85;
      invalidate();
    })
    .catch(() => undefined); // keep sky-gradient lighting

  const graft = (mat: THREE.MeshStandardMaterial, maps: PbrMaps): void => {
    mat.map = maps.map;
    mat.normalMap = maps.normalMap;
    if (maps.roughnessMap) {
      mat.roughnessMap = maps.roughnessMap;
      mat.roughness = 1;
    }
    if (maps.metalnessMap) {
      mat.metalnessMap = maps.metalnessMap;
      mat.metalness = 1;
    }
    mat.needsUpdate = true;
  };

  // concrete -> exterior shell · wood -> warm cladding · marble -> interior floor · grass -> terrain.
  try {
    const c = await loadPbr('concrete', 2);
    handles.villa.shellMats.forEach((m) => graft(m, c));
    invalidate();
  } catch {
    /* keep flat shell */
  }
  try {
    graft(handles.villa.claddingMat, await loadPbr('wood', 3));
    invalidate();
  } catch {
    /* keep flat cladding */
  }
  try {
    graft(handles.villa.floorMat, await loadPbr('marble', 2));
    invalidate();
  } catch {
    /* keep flat floor */
  }
  try {
    graft(handles.terrainMat, await loadPbr('grass', 24));
    handles.terrainMat.flatShading = false;
    handles.terrainMat.needsUpdate = true;
    invalidate();
  } catch {
    /* keep flat terrain */
  }

  // Real CC0 furniture GLBs (glTF) into the interior via the loader seam — proves real models load;
  // scene.environment lights them automatically. Falls back to the procedural boxes if any fails.
  try {
    const loader = createModelLoader(renderer);
    const [sofa, table, chair] = await Promise.all([
      loadModel(loader, 'sofa/model.gltf'),
      loadModel(loader, 'coffee_table/model.gltf'),
      loadModel(loader, 'armchair/model.gltf'),
    ]);
    const place = (obj: THREE.Object3D, x: number, z: number, ry: number, s: number): void => {
      obj.position.set(x, 0.46, z);
      obj.rotation.y = ry;
      obj.scale.setScalar(s);
      obj.traverse((n) => {
        const m = n as THREE.Mesh;
        if (m.isMesh) {
          m.castShadow = true;
          m.receiveShadow = true;
        }
      });
      handles.villa.interior.add(obj);
    };
    place(sofa.scene, -1.8, -2.1, 0, 1);
    place(table.scene, -1.8, -0.6, 0, 1);
    place(chair.scene, 1.7, -2.0, -Math.PI / 3, 1);
    handles.villa.furnitureGroup.visible = false; // real furniture replaces the boxes
    invalidate();
  } catch {
    /* keep the procedural furniture boxes */
  }
}
