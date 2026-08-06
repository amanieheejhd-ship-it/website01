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
    fog: THREE.FogExp2;
    sun: THREE.DirectionalLight;
    ambient: THREE.AmbientLight;
  };
  site: { developed: THREE.Group };
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
    finishes: THREE.Group;
    rooms: {
      living: THREE.Group;
      kitchen: THREE.Group;
      bedroom: THREE.Group;
      bathroom: THREE.Group;
    };
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
const hedgeMaterial = () => new THREE.MeshStandardMaterial({ color: 0x24452a, roughness: 0.94 });

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

function buildGrass(count = 520, radius = 20, innerRadius = 10, wind = 0.025) {
  const geo = new THREE.PlaneGeometry(0.09, 0.28, 1, 2);
  geo.translate(0, 0.5, 0);
  const material = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uWind: { value: wind },
      uBase: { value: new THREE.Color(0x17341f) },
      uTip: { value: new THREE.Color(0x4f7540) },
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
  mesh.frustumCulled = true;
  const d = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const ang = i * 2.399963;
    const rad = innerRadius + Math.sqrt(t) * (radius - innerRadius);
    d.position.set(Math.cos(ang) * rad + Math.sin(i * 12.9898) * 0.5, 0, Math.sin(ang) * rad + Math.cos(i * 4.1) * 0.5);
    d.rotation.y = i * 1.7;
    d.scale.set(0.8 + (i % 4) * 0.08, 0.65 + (Math.sin(i * 7.7) * 0.5 + 0.5) * 0.45, 1);
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
  mesh.frustumCulled = true;
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

function box(
  parent: THREE.Object3D,
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function cylinder(
  parent: THREE.Object3D,
  radius: number,
  height: number,
  position: [number, number, number],
  material: THREE.Material,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 12), material);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

/** Low-poly, instanced landscape: premium at reveal distance without a draw-call explosion. */
function buildLandscape() {
  const group = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x77736b, roughness: 0.78 });
  const lawn = new THREE.MeshStandardMaterial({ color: 0x243522, roughness: 0.96 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x161719, roughness: 0.28, metalness: 0.82 });
  const water = new THREE.MeshPhysicalMaterial({
    color: 0x16424c,
    roughness: 0.08,
    metalness: 0.05,
    transmission: 0.42,
    transparent: true,
    opacity: 0.86,
  });
  box(group, [30, 0.08, 25], [0, 0.02, 0], lawn);
  box(group, [5.5, 0.11, 15], [0, 0.09, 8], stone); // driveway
  box(group, [1.4, 0.12, 7], [-4.8, 0.1, 7], stone); // pedestrian path
  box(group, [7.5, 0.18, 3.5], [8.1, 0.08, -1.6], stone);
  box(group, [6.8, 0.08, 2.8], [8.1, 0.18, -1.6], water); // pool

  // Low boundary wall leaves the gate/drive axis open.
  for (const [s, p] of [
    [[12, 0.75, 0.25], [-9, 0.38, 12.3]],
    [[12, 0.75, 0.25], [9, 0.38, 12.3]],
    [[0.25, 0.75, 24], [-15, 0.38, 0]],
    [[0.25, 0.75, 24], [15, 0.38, 0]],
  ] as const) box(group, [...s], [...p], stone);

  const hedgeGeo = new THREE.BoxGeometry(0.72, 0.82, 0.72);
  const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x19331f, roughness: 1 });
  const hedges = new THREE.InstancedMesh(hedgeGeo, hedgeMat, 54);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 54; i++) {
    const side = i < 27 ? -1 : 1;
    const j = i % 27;
    dummy.position.set(side * 6.4, 0.45, -6.5 + j * 0.55);
    dummy.scale.set(1, 0.8 + (j % 3) * 0.08, 1);
    dummy.updateMatrix();
    hedges.setMatrixAt(i, dummy.matrix);
  }
  hedges.instanceMatrix.needsUpdate = true;
  group.add(hedges);

  // Alpha-cutout cross-plane trees: organic silhouettes without expensive leaf geometry.
  const foliageCanvas = document.createElement('canvas');
  foliageCanvas.width = foliageCanvas.height = 256;
  const foliageContext = foliageCanvas.getContext('2d');
  if (foliageContext) {
    foliageContext.clearRect(0, 0, 256, 256);
    const leafGradient = foliageContext.createRadialGradient(128, 120, 12, 128, 128, 122);
    leafGradient.addColorStop(0, 'rgba(64,105,55,0.98)');
    leafGradient.addColorStop(0.62, 'rgba(27,67,39,0.96)');
    leafGradient.addColorStop(1, 'rgba(9,31,20,0)');
    foliageContext.fillStyle = leafGradient;
    const lobes = [[128,60,48],[78,100,52],[174,104,58],[108,132,66],[154,150,58],[74,160,42],[188,166,40]];
    for (const [x, y, radius] of lobes) {
      foliageContext.beginPath();
      foliageContext.arc(x, y, radius, 0, Math.PI * 2);
      foliageContext.fill();
    }
  }
  const foliageTexture = new THREE.CanvasTexture(foliageCanvas);
  foliageTexture.colorSpace = THREE.SRGBColorSpace;
  const foliageMaterial = new THREE.MeshStandardMaterial({
    map: foliageTexture,
    transparent: true,
    alphaTest: 0.18,
    depthWrite: true,
    side: THREE.DoubleSide,
    roughness: 0.88,
    metalness: 0,
  });
  const trunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.13, 0.23, 3.7, 7),
    new THREE.MeshStandardMaterial({ color: 0x493321, roughness: 0.96 }),
    11,
  );
  const foliage = new THREE.InstancedMesh(new THREE.PlaneGeometry(3.4, 4.1), foliageMaterial, 33);
  const treePositions: [number, number][] = [
    [-12,-7],[-11.2,-4.8],[-12.6,1],[-10.7,8.5],[11.2,-7.5],[12.8,5.7],[9.2,-10.2],[-7.8,-11],[13.5,-1.8],[-13,5.4],[10.5,8.8],
  ];
  let foliageIndex = 0;
  treePositions.forEach(([x, z], i) => {
    const scale = 0.82 + (i % 4) * 0.1;
    dummy.position.set(x, 1.85 * scale, z); dummy.rotation.set(0, i * 1.73, 0); dummy.scale.set(scale, scale, scale); dummy.updateMatrix(); trunks.setMatrixAt(i, dummy.matrix);
    for (let plane = 0; plane < 3; plane += 1) {
      dummy.position.set(x, 4.1 * scale, z);
      dummy.rotation.set(0, i * 0.73 + plane * Math.PI / 3, 0);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      foliage.setMatrixAt(foliageIndex++, dummy.matrix);
    }
  });
  trunks.instanceMatrix.needsUpdate = foliage.instanceMatrix.needsUpdate = true;
  group.add(trunks, foliage);

  const lampMat = new THREE.MeshStandardMaterial({ color: 0x211b13, emissive: 0xffb45e, emissiveIntensity: 3 });
  for (let i = 0; i < 8; i++) {
    const x = i < 4 ? 5.2 + i * 2 : -5 + (i - 4) * 1.6;
    const z = i < 4 ? 0.4 : 7.5;
    cylinder(group, 0.07, 0.55, [x, 0.34, z], metal);
    box(group, [0.18, 0.15, 0.18], [x, 0.68, z], lampMat);
  }
  return group;
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
  const slab = growGroup([12.4, 0.38, 9.2], [0, 0, 0], { color: 0x6f6f6b, roughness: 0.95 });
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
    { size: [12, 3.2, 0.25], pos: [0, 0.38, -4.35] },
    { size: [0.25, 3.2, 8.7], pos: [-6, 0.38, 0] },
    { size: [0.25, 3.2, 8.7], pos: [6, 0.38, 0] },
    { size: [3.8, 3.2, 0.25], pos: [-4.1, 0.38, 4.35] },
    { size: [3.8, 3.2, 0.25], pos: [4.1, 0.38, 4.35] },
  ];
  const walls = wallDefs.map((w) => {
    const g = growGroup(w.size, w.pos, { color: SHELL, roughness: 0.85, side: THREE.DoubleSide });
    shellMats.push(g.material);
    root.add(g.group);
    return g.group;
  });

  // columns
  const colPos: [number, number][] = [
    [-5.8, -4.1], [5.8, -4.1], [-5.8, 4.1], [5.8, 4.1], [-2.3, 4.1], [2.3, 4.1],
  ];
  const columns = colPos.map(([x, z]) => {
    const g = growGroup([0.32, 3.4, 0.32], [x, 0.3, z], { color: 0x7d7d78, roughness: 0.8 });
    shellMats.push(g.material);
    root.add(g.group);
    return g.group;
  });

  // upper setback
  const upper = growGroup([8.2, 2.8, 6.4], [-1.1, 3.58, -0.75], { color: SHELL, roughness: 0.85, side: THREE.DoubleSide });
  shellMats.push(upper.material);
  root.add(upper.group);

  // roof (drops in — starts hidden/high, director animates)
  const roof = new THREE.Group();
  roof.position.set(-1.1, 6.45, -0.75);
  roof.visible = false;
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x5f5f5b, roughness: 0.9 });
  shellMats.push(roofMat);
  roof.add(new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.28, 7.5), roofMat));
  root.add(roof);

  // cladding (shared material → tween opacity once)
  const finishes = new THREE.Group();
  finishes.visible = false;
  root.add(finishes);
  const claddingMat = new THREE.MeshStandardMaterial({
    color: 0xb98a52,
    roughness: 0.5,
    metalness: 0.35,
    transparent: true,
    opacity: 0,
  });
  const cladDefs: { s: [number, number, number]; p: [number, number, number] }[] = [
    { s: [3.2, 3.2, 0.08], p: [-4.35, 1.98, 4.5] },
    { s: [0.08, 3.2, 3.8], p: [-6.14, 1.98, -1.6] },
    { s: [4.2, 2.8, 0.08], p: [-3.1, 4.98, 2.5] },
    { s: [0.08, 2.8, 3.4], p: [-5.24, 4.98, -0.7] },
  ];
  for (const c of cladDefs) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...c.s), claddingMat);
    m.position.set(...c.p);
    finishes.add(m);
  }

  // glass
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x8da4a8,
    roughness: 0.055,
    metalness: 0.12,
    transmission: 0.82,
    thickness: 0.12,
    ior: 1.5,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 5.9), glassMat);
  glass.position.set(0, 3.35, 4.48);
  finishes.add(glass);

  // Architectural finish layer: double-height portal, balcony, overhang, mullions and marble blade.
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x17191a, roughness: 0.26, metalness: 0.86 });
  const marbleMat = new THREE.MeshStandardMaterial({ color: 0xd8d0c2, roughness: 0.22, metalness: 0.04 });
  const detail = new THREE.Group();
  box(detail, [4.8, 0.22, 2.2], [2.5, 3.65, 4.85], marbleMat); // cantilever balcony
  box(detail, [5.4, 0.18, 2.8], [2.5, 6.25, 4.25], roofMat); // deep overhang
  box(detail, [0.38, 6.1, 1.5], [-2.45, 3.35, 4.65], marbleMat); // entrance blade
  for (const x of [-1.8,-1.2,-0.6,0,0.6,1.2,1.8]) box(detail, [0.045, 5.75, 0.08], [x, 3.35, 4.54], metalMat);
  for (const x of [0.4,2.2,4.1]) cylinder(detail, 0.095, 3.35, [x, 1.96, 5.25], metalMat);
  box(detail, [4.7, 0.08, 0.08], [2.5, 4.7, 5.86], metalMat);
  box(detail, [0.08, 1.05, 0.08], [0.18, 4.18, 5.86], metalMat);
  box(detail, [0.08, 1.05, 0.08], [4.82, 4.18, 5.86], metalMat);
  finishes.add(detail);

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
  winMesh.frustumCulled = true;
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
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(11.4, 8.2), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.46;
  interior.add(floor);
  const furnMat = new THREE.MeshStandardMaterial({ color: 0x3a2f26, roughness: 0.6 });
  const fabric = new THREE.MeshStandardMaterial({ color: 0xb8ad9d, roughness: 0.92 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.42, metalness: 0.25 });
  const white = new THREE.MeshStandardMaterial({ color: 0xe9e3d9, roughness: 0.35 });
  const mirror = new THREE.MeshPhysicalMaterial({
    color: 0xd9e5e5, roughness: 0.025, metalness: 0.96, clearcoat: 1, clearcoatRoughness: 0.02,
  });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc6a15b, roughness: 0.2, metalness: 0.9 });
  const art = new THREE.MeshStandardMaterial({ color: 0x8a5c37, roughness: 0.65, metalness: 0.05 });
  const furnitureGroup = new THREE.Group();
  const living = new THREE.Group();
  box(living,[2.8,.65,1],[-3.5,.85,-2.5],fabric); box(living,[1.25,.3,.75],[-3.3,.65,-1.05],marbleMat);
  box(living,[2.8,.06,2],[-3.3,.5,-1.4],new THREE.MeshStandardMaterial({color:0x705d48,roughness:1}));
  box(living,[2.2,1.25,.12],[-4.1,1.45,-4.18],dark); cylinder(living,.28,1.4,[-1.5,1.15,-2.8],hedgeMaterial());
  box(living,[1.3,.82,.05],[-1.7,1.85,-4.16],art); box(living,[1.4,.06,.9],[-3.3,.52,-1.35],brass);
  const kitchen = new THREE.Group();
  box(kitchen,[3,.9,1],[3,.93,-2.45],furnMat); box(kitchen,[3.15,.12,1.12],[3,1.45,-2.45],marbleMat);
  box(kitchen,[3.6,2.4,.55],[3,1.68,-4],furnMat); box(kitchen,[.8,1.5,.08],[3,1.8,-3.69],dark);
  box(kitchen,[.72,1.75,.08],[1.85,1.75,-3.68],mirror); cylinder(kitchen,.035,.55,[2.6,1.83,-2.25],brass);
  const bedroom = new THREE.Group();
  box(bedroom,[2.7,.5,2.2],[-3,.75,.2],fabric); box(bedroom,[2.8,1.25,.18],[-3,1.35,-.95],furnMat);
  box(bedroom,[2.5,2.2,.6],[-5.35,1.55,.1],furnMat); cylinder(bedroom,.2,.85,[-1.25,.9,-.1],white);
  box(bedroom,[1.2,1.8,.05],[-5.02,1.65,.43],mirror); cylinder(bedroom,.16,.75,[-4.8,.88,-1.0],brass);
  const bathroom = new THREE.Group();
  box(bathroom,[1.8,.75,.58],[3.8,.82,-1.65],marbleMat); box(bathroom,[1.5,1.2,.05],[3.8,1.75,-1.94],mirror);
  box(bathroom,[2.1,.55,.9],[2.7,.72,-3.25],white); box(bathroom,[.06,2.1,1.65],[5.1,1.5,-3],glassMat);
  box(bathroom,[1.1,.08,1.1],[4.7,.52,-3],marbleMat);
  cylinder(bathroom,.045,.7,[3.25,1.36,-1.55],brass); cylinder(bathroom,.04,.8,[4.68,1.08,-2.65],brass);
  furnitureGroup.add(living,kitchen,bedroom,bathroom);
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
    finishes,
    rooms: { living, kitchen, bedroom, bathroom },
  };
}

// ---------- assembly ----------

export function createWorld(): World {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);

  const sky = buildSky();
  const skyMat = (sky as unknown as { userData: { mat: THREE.ShaderMaterial } }).userData.mat;
  scene.add(sky);

  const fog = new THREE.FogExp2(0x223038, 0.018);
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

  const landscape = buildLandscape();
  landscape.visible = false;
  scene.add(landscape);

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
    site: { developed: landscape },
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
      finishes: villa.finishes,
      rooms: villa.rooms,
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
    // Keep the four procedural room sets: loaded hero furniture enriches the living room only.
    invalidate();
  } catch {
    /* keep the procedural furniture boxes */
  }

  // Dense landscape is already GPU-instanced. Do not load the old photogrammetry rock scatter:
  // its unnormalised glTF bounds can invade the enlarged villa and costs ~1.3M triangles.
  return;

  // Real CC0 environment GLBs (Poly Haven rocks + plant) scattered around the plot through the same
  // seam — photoreal props on the terrain, lit by the HDRI, casting sun shadows. Cloned (not GPU-
  // instanced) because each glTF carries its own meshes/materials; a dozen clones is cheap. Placed on
  // a golden-angle ring outside the villa footprint (radius > 6) so nothing intersects the building.
  try {
    const loader = createModelLoader(renderer);
    const [rocks, plant] = await Promise.all([
      loadModel(loader, 'rocks/model.gltf'),
      loadModel(loader, 'plant/model.gltf'),
    ]);
    const shade = (o: THREE.Object3D): void =>
      o.traverse((n) => {
        const m = n as THREE.Mesh;
        if (m.isMesh) {
          m.castShadow = true;
          m.receiveShadow = true;
        }
      });
    shade(rocks.scene);
    shade(plant.scene);
    const scatter = new THREE.Group();
    // The CC0 rock cluster is photogrammetry-grade (~680k tris each) so it is used sparingly — 2 hero
    // clusters at the far edge. The plant is light (~17k tris) so it carries the greenery density.
    // (No decimation tooling here; see SOURCES.md — decimated rocks would allow many more.)
    const defs: { src: THREE.Object3D; base: number }[] = [
      { src: rocks.scene, base: 0.65 },
      { src: rocks.scene, base: 0.8 },
      ...Array.from({ length: 8 }, () => ({ src: plant.scene, base: 1.0 })),
    ];
    defs.forEach((d, i) => {
      const ang = i * 2.399963; // golden angle
      const rad = 8 + (i % 5) * 2.8; // 8..19m ring, clear of the 8.6m slab
      const obj = d.src.clone(true);
      obj.position.set(Math.cos(ang) * rad, 0, Math.sin(ang) * rad);
      obj.rotation.y = i * 1.7;
      obj.scale.setScalar(d.base + (Math.sin(i * 7.7) * 0.5 + 0.5) * 0.4);
      scatter.add(obj);
    });
    scene.add(scatter);
    invalidate();
  } catch {
    /* no environment props — terrain + grass carry the ground on their own */
  }
}
