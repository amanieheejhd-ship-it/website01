import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
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
  site: {
    developed: THREE.Group;
    pavingMat: THREE.MeshStandardMaterial;
    lawnMat: THREE.MeshStandardMaterial;
    waterNormal: THREE.Texture;
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
    marbleMat: THREE.MeshStandardMaterial;
    furnitureGroup: THREE.Group;
    finishes: THREE.Group;
    rooms: {
      foyer: THREE.Group;
      living: THREE.Group;
      dining: THREE.Group;
      kitchen: THREE.Group;
      powder: THREE.Group;
      stairs: THREE.Group;
      landing: THREE.Group;
      master: THREE.Group;
      masterBath: THREE.Group;
      secondBedroom: THREE.Group;
      terrace: THREE.Group;
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
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.045, 0, 0,
    0.045, 0, 0,
    0, 0.28, 0,
  ], 3));
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
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    ior: 1.333,
    thickness: 0.35,
  });
  const normalData = new Uint8Array(128 * 128 * 4);
  for (let y = 0; y < 128; y += 1) for (let x = 0; x < 128; x += 1) {
    const offset = (y * 128 + x) * 4;
    normalData[offset] = 128 + Math.round(Math.sin(x * 0.23 + y * 0.11) * 18);
    normalData[offset + 1] = 128 + Math.round(Math.cos(y * 0.19 - x * 0.07) * 18);
    normalData[offset + 2] = 245;
    normalData[offset + 3] = 255;
  }
  const waterNormal = new THREE.DataTexture(normalData, 128, 128, THREE.RGBAFormat);
  waterNormal.wrapS = waterNormal.wrapT = THREE.RepeatWrapping;
  waterNormal.repeat.set(5, 2);
  waterNormal.needsUpdate = true;
  water.normalMap = waterNormal;
  water.normalScale.set(0.22, 0.22);
  box(group, [30, 0.08, 25], [0, 0.02, 0], lawn);
  box(group, [5.5, 0.11, 15], [0, 0.09, 8], stone); // driveway
  box(group, [1.4, 0.12, 7], [-4.8, 0.1, 7], stone); // pedestrian path
  box(group, [7.8, 0.18, 3.8], [8.1, 0.08, -1.6], stone);
  box(group, [6.9, 0.12, 2.9], [8.1, 0.14, -1.6], new THREE.MeshStandardMaterial({ color: 0x315c66, roughness: 0.58 }));
  const waterSurface = new THREE.Mesh(new THREE.PlaneGeometry(6.75, 2.75, 1, 1), water);
  waterSurface.rotation.x = -Math.PI / 2;
  waterSurface.position.set(8.1, 0.245, -1.6);
  group.add(waterSurface);
  for (const [size, position] of [
    [[7.4,.12,.2],[8.1,.27,-3.1]], [[7.4,.12,.2],[8.1,.27,-.1]],
    [[.2,.12,3.2],[4.5,.27,-1.6]], [[.2,.12,3.2],[11.7,.27,-1.6]],
  ] as const) box(group, [...size], [...position], stone);
  const poolLight = new THREE.MeshStandardMaterial({ color: 0x8ad9e8, emissive: 0x73dfff, emissiveIntensity: 2.2 });
  for (const x of [6.1, 8.1, 10.1]) box(group, [.22,.08,.1], [x,.2,-3.02], poolLight);

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
    foliageContext.strokeStyle = 'rgba(72,48,28,.9)';
    foliageContext.lineCap = 'round';
    foliageContext.lineWidth = 10;
    foliageContext.beginPath();
    foliageContext.moveTo(128, 252); foliageContext.lineTo(126, 105);
    foliageContext.moveTo(126, 150); foliageContext.lineTo(72, 92);
    foliageContext.moveTo(128, 132); foliageContext.lineTo(178, 70);
    foliageContext.moveTo(126, 105); foliageContext.lineTo(118, 38);
    foliageContext.stroke();
    const lobes = [[118,32,28],[86,55,34],[150,58,38],[62,92,42],[111,91,48],[178,98,42],[84,132,47],[145,135,53],[194,142,34],[105,178,48],[160,184,42],[127,213,32]];
    for (const [x, y, radius] of lobes) {
      const leafGradient = foliageContext.createRadialGradient(x - radius * .18, y - radius * .2, 2, x, y, radius);
      leafGradient.addColorStop(0, 'rgba(79,122,65,0.98)');
      leafGradient.addColorStop(0.58, 'rgba(29,72,41,0.96)');
      leafGradient.addColorStop(1, 'rgba(8,29,18,0)');
      foliageContext.fillStyle = leafGradient;
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
      foliage.setColorAt(foliageIndex - 1, new THREE.Color(i % 3 === 0 ? 0x78906a : i % 3 === 1 ? 0x607c57 : 0x87966d));
    }
  });
  trunks.instanceMatrix.needsUpdate = foliage.instanceMatrix.needsUpdate = true;
  if (foliage.instanceColor) foliage.instanceColor.needsUpdate = true;
  group.add(trunks, foliage);

  // Three low-detail LOD villas beyond the hero plot make the composition read as a gated estate.
  const estateStone = new THREE.MeshStandardMaterial({ color: 0x8b8171, roughness: 0.76 });
  const estateGlass = new THREE.MeshPhysicalMaterial({ color: 0x52666a, roughness: 0.12, metalness: 0.12, transmission: 0.45, transparent: true, opacity: 0.8 });
  const estateGlow = new THREE.MeshStandardMaterial({ color: 0x2a1b10, emissive: 0xffbd70, emissiveIntensity: 0.85 });
  const buildEstateVilla = (x: number, z: number, rotation: number, scale: number) => {
    const lod = new THREE.LOD();
    const near = new THREE.Group();
    box(near, [8,3.2,5.5], [0,1.6,0], estateStone);
    box(near, [5.4,2.7,4.2], [-.8,4.55,-.45], estateStone);
    box(near, [3.8,2.1,.08], [1.3,2.1,2.78], estateGlass);
    box(near, [3.1,1.2,.06], [-1.7,4.55,1.68], estateGlow);
    const far = new THREE.Group();
    box(far, [8,5.7,5.4], [0,2.85,0], estateStone);
    box(far, [3.6,1.3,.05], [.8,3,2.73], estateGlow);
    lod.addLevel(near, 0);
    lod.addLevel(far, 28);
    lod.position.set(x, 0, z);
    lod.rotation.y = rotation;
    lod.scale.setScalar(scale);
    group.add(lod);
  };
  buildEstateVilla(-18, -24, 0.24, 0.88);
  buildEstateVilla(17, -27, -0.28, 0.82);
  buildEstateVilla(1, -34, 0.08, 0.76);

  const lampMat = new THREE.MeshStandardMaterial({ color: 0x211b13, emissive: 0xffb45e, emissiveIntensity: 3 });
  for (let i = 0; i < 8; i++) {
    const x = i < 4 ? 5.2 + i * 2 : -5 + (i - 4) * 1.6;
    const z = i < 4 ? 0.4 : 7.5;
    cylinder(group, 0.07, 0.55, [x, 0.34, z], metal);
    box(group, [0.18, 0.15, 0.18], [x, 0.68, z], lampMat);
  }
  return { group, pavingMat: stone, lawnMat: lawn, waterNormal };
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
  const marbleMat = new THREE.MeshStandardMaterial({ color: 0xc7bba9, roughness: 0.32, metalness: 0.02 });
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
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xb28b68, roughness: 0.52 });
  const tile = new THREE.MeshStandardMaterial({ color: 0xc2bcb1, roughness: 0.46 });
  const wall = new THREE.MeshStandardMaterial({ color: 0xc8bfae, roughness: 0.86 });
  const furnMat = new THREE.MeshStandardMaterial({ color: 0x3a2f26, roughness: 0.6 });
  const fabric = new THREE.MeshStandardMaterial({ color: 0xb8ad9d, roughness: 0.92 });
  const cushion = new THREE.MeshStandardMaterial({ color: 0x9d9180, roughness: 0.96 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.42, metalness: 0.25 });
  const white = new THREE.MeshStandardMaterial({ color: 0xc9c2b7, roughness: 0.48 });
  const mirror = new THREE.MeshPhysicalMaterial({
    color: 0xd9e5e5, roughness: 0.025, metalness: 0.96, clearcoat: 1, clearcoatRoughness: 0.02,
  });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc6a15b, roughness: 0.2, metalness: 0.9 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0x8f713c, roughness: .34, metalness: .82 });
  const stairWood = new THREE.MeshPhysicalMaterial({ color: 0x9b704d, roughness: .58, metalness: 0, clearcoat: .16, clearcoatRoughness: .45 });
  const interiorGlass = new THREE.MeshPhysicalMaterial({
    // Reflective alpha glass avoids the extra full-scene transmission prepass on weak GPUs.
    color: 0xb8c9c9, roughness: .1, metalness: .05, transmission: 0, transparent: true,
    opacity: .26, depthWrite: false, envMapIntensity: .35, clearcoat: 1, clearcoatRoughness: .08,
    side: THREE.DoubleSide,
  });
  const mirrorPanel = new THREE.MeshPhysicalMaterial({
    color: 0x7f8989, roughness: .045, metalness: 1, clearcoat: 1, clearcoatRoughness: .02, envMapIntensity: .5,
  });
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xd8b887, emissive: 0xffb968, emissiveIntensity: 0.38, roughness: .5 });
  const art = new THREE.MeshStandardMaterial({ color: 0x8a5c37, roughness: 0.65, metalness: 0.05 });
  const furnitureGroup = new THREE.Group();
  type DoorCut = { center: number; width: number };
  type RoomShellOptions = { wet?: boolean; floor?: boolean; leftDoor?: DoorCut; backDoor?: DoorCut };
  const roomShell = (
    room: THREE.Group,
    x: number,
    y: number,
    z: number,
    sx: number,
    sz: number,
    options: RoomShellOptions = {},
  ) => {
    if (options.floor !== false) box(room, [sx, .08, sz], [x, y, z], options.wet ? tile : floorMat);
    const wallHeight = 2.65;
    const wallY = y + 1.34;
    const openingHeight = 2.15;
    const headerHeight = wallHeight - openingHeight;
    const headerY = y + openingHeight + headerHeight / 2 + .04;
    const buildBackWall = (door?: DoorCut) => {
      const min = x - sx / 2;
      const max = x + sx / 2;
      if (!door) { box(room, [sx, wallHeight, .09], [x, wallY, z - sz / 2], wall); return; }
      const openingMin = door.center - door.width / 2;
      const openingMax = door.center + door.width / 2;
      const leftWidth = openingMin - min;
      const rightWidth = max - openingMax;
      if (leftWidth > .02) box(room, [leftWidth, wallHeight, .09], [min + leftWidth / 2, wallY, z - sz / 2], wall);
      if (rightWidth > .02) box(room, [rightWidth, wallHeight, .09], [openingMax + rightWidth / 2, wallY, z - sz / 2], wall);
      box(room, [door.width, headerHeight, .09], [door.center, headerY, z - sz / 2], wall);
      for (const dx of [-door.width / 2, door.width / 2]) box(room,[.025,openingHeight,.055],[door.center+dx,y+openingHeight/2+.04,z-sz/2+.05],brass);
      box(room,[door.width+.025,.025,.055],[door.center,y+openingHeight+.04,z-sz/2+.05],brass);
    };
    const buildLeftWall = (door?: DoorCut) => {
      const min = z - sz / 2;
      const max = z + sz / 2;
      if (!door) { box(room, [.09, wallHeight, sz], [x - sx / 2, wallY, z], wall); return; }
      const openingMin = door.center - door.width / 2;
      const openingMax = door.center + door.width / 2;
      const backDepth = openingMin - min;
      const frontDepth = max - openingMax;
      if (backDepth > .02) box(room, [.09, wallHeight, backDepth], [x - sx / 2, wallY, min + backDepth / 2], wall);
      if (frontDepth > .02) box(room, [.09, wallHeight, frontDepth], [x - sx / 2, wallY, openingMax + frontDepth / 2], wall);
      box(room, [.09, headerHeight, door.width], [x - sx / 2, headerY, door.center], wall);
      for (const dz of [-door.width / 2, door.width / 2]) box(room,[.055,openingHeight,.025],[x-sx/2+.05,y+openingHeight/2+.04,door.center+dz],brass);
      box(room,[.055,.025,door.width+.025],[x-sx/2+.05,y+openingHeight+.04,door.center],brass);
    };
    buildBackWall(options.backDoor);
    buildLeftWall(options.leftDoor);
  };
  const ceilingLight = (room: THREE.Group, x: number, y: number, z: number, radius = .18) => {
    cylinder(room, radius, .08, [x, y, z], lightMat);
  };
  const acUnit = (room: THREE.Group, x: number, y: number, z: number) => box(room,[1.05,.34,.22],[x,y,z],white);
  const chair = (room: THREE.Group, x: number, floorY: number, z: number, rotation = 0) => {
    const group = new THREE.Group(); group.position.set(x, floorY, z); group.rotation.y = rotation;
    box(group,[.48,.1,.46],[0,.47,0],fabric); box(group,[.48,.58,.1],[0,.78,-.2],fabric);
    for (const lx of [-.18,.18]) for (const lz of [-.16,.16]) box(group,[.045,.44,.045],[lx,.23,lz],brass);
    room.add(group);
  };
  const tableLamp = (room: THREE.Group, x: number, baseY: number, z: number) => {
    cylinder(room,.055,.42,[x,baseY+.21,z],brass);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(.13,.24,.28,16,1,true),lightMat);
    shade.position.set(x,baseY+.54,z); room.add(shade);
  };
  const pendant = (room: THREE.Group, x: number, ceilingY: number, z: number, drop = .7) => {
    cylinder(room,.018,drop,[x,ceilingY-drop/2,z],brass);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(.11,.26,.22,18,1,true),lightMat);
    shade.position.set(x,ceilingY-drop-.1,z); room.add(shade);
  };
  const plate = (room: THREE.Group, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(.16,.18,.025,20),white);
    mesh.position.set(x,y,z); room.add(mesh);
  };

  const foyer = new THREE.Group();
  roomShell(foyer,0,.48,2.8,2.3,2.1,{leftDoor:{center:2.8,width:.9}}); box(foyer,[1.25,.1,.34],[-.55,1.18,2.05],marbleMat);
  for (const x of [-1.05,-.05]) box(foyer,[.06,.62,.06],[x,.83,2.05],brass);
  box(foyer,[1.05,.05,1.2],[0,.54,2.8],art); box(foyer,[1.2,2.2,.12],[.55,1.62,3.78],furnMat);
  cylinder(foyer,.035,.22,[.15,1.63,3.69],brass);
  for (const [x,z,drop] of [[-.45,2.55,2.25],[.05,2.82,2.75],[.45,2.5,1.85]] as [number,number,number][]) {
    cylinder(foyer,.012,drop,[x,5.75-drop/2,z],brass);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(.11,14,10),lightMat); globe.position.set(x,5.75-drop,z); foyer.add(globe);
  }

  const living = new THREE.Group();
  roomShell(living,-3.65,.48,1.25,4.2,4.8,{backDoor:{center:-2.1,width:.9}}); box(living,[2.75,.28,.92],[-4.2,.69,1.6],furnMat);
  box(living,[2.55,.22,.78],[-4.2,.91,1.55],fabric); box(living,[2.6,.78,.2],[-4.2,1.28,2.02],fabric);
  box(living,[.22,.68,.92],[-5.53,1.0,1.6],fabric); box(living,[.22,.68,.92],[-2.87,1.0,1.6],fabric);
  for (const x of [-4.82,-4.2,-3.58]) box(living,[.55,.16,.62],[x,1.08,1.55],cushion);
  box(living,[1.45,.32,.8],[-3.55,.72,.05],marbleMat); box(living,[3.1,.06,2.2],[-3.6,.54,.7],art);
  for (const x of [-4.08,-3.02]) for (const z of [-.18,.28]) box(living,[.055,.22,.055],[x,.57,z],brass);
  box(living,[2.5,1.35,.08],[-3.75,1.58,-1.1],dark); box(living,[2.75,.46,.38],[-3.75,.77,-.88],furnMat);
  box(living,[1.35,.84,.05],[-5.68,2.25,2.25],art);
  cylinder(living,.05,1.35,[-2.2,1.18,2.4],brass);
  const floorShade = new THREE.Mesh(new THREE.CylinderGeometry(.16,.3,.36,16,1,true),lightMat); floorShade.position.set(-2.2,1.82,2.4); living.add(floorShade);
  cylinder(living,.2,.34,[-5.25,.7,-.55],marbleMat);
  cylinder(living,.025,1.05,[-5.25,1.37,-.55],brass);
  for (const [x,y,z,s] of [[-5.48,1.72,-.55,.28],[-5.1,1.83,-.58,.34],[-5.28,2.02,-.55,.3]] as [number,number,number,number][]) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(s,12,8),new THREE.MeshStandardMaterial({color:0x35553b,roughness:.88}));
    leaf.scale.set(.65,1,.5); leaf.position.set(x,y,z); living.add(leaf);
  }
  ceilingLight(living,-3.7,2.9,.9,.28);

  const dining = new THREE.Group();
  roomShell(dining,3.5,.48,2.6,3.8,2.35,{leftDoor:{center:2.6,width:.9},backDoor:{center:4.9,width:.8}}); box(dining,[2.25,.12,1.02],[3.5,1.23,2.6],furnMat);
  for (const x of [2.55,4.45]) for (const z of [2.23,2.97]) box(dining,[.07,.68,.07],[x,.86,z],brass);
  for (const x of [2.7,3.5,4.3]) { chair(dining,x,.48,1.88,0); chair(dining,x,.48,3.32,Math.PI); plate(dining,x,1.31,2.6); }
  cylinder(dining,.22,.08,[3.5,1.34,2.6],brass);
  for (const x of [3.32,3.5,3.68]) { const glass = cylinder(dining,.035,.16,[x,1.43,2.62],glassMat); glass.material = glassMat; }
  ceilingLight(dining,3.5,2.92,2.6,.32);
  pendant(dining,3.5,2.9,2.6,.72);

  const kitchen = new THREE.Group();
  roomShell(kitchen,3.55,.48,-1.15,4.1,3.7,{wet:true,leftDoor:{center:-1.7,width:.8}}); box(kitchen,[3.65,.88,.58],[3.55,.94,-2.7],furnMat);
  box(kitchen,[3.8,.11,.72],[3.55,1.43,-2.7],marbleMat); box(kitchen,[2.45,.9,.9],[3.5,.95,-.75],furnMat);
  box(kitchen,[2.6,.12,1.02],[3.5,1.46,-.75],marbleMat);
  for (const x of [2.15,2.85,3.55,4.25]) box(kitchen,[.62,.62,.4],[x,2.25,-2.83],furnMat);
  for (const x of [2.05,2.75,3.45,4.15]) { box(kitchen,[.58,.68,.025],[x,.95,-2.39],furnMat); box(kitchen,[.22,.025,.025],[x+.17,.96,-2.36],brass); }
  box(kitchen,[.82,1.95,.68],[5.18,1.5,-2.25],metalMat); box(kitchen,[.32,.025,.025],[5.02,1.52,-1.9],brass);
  box(kitchen,[.75,.04,.55],[3.2,1.52,-.72],dark); box(kitchen,[.75,.55,.08],[3.2,1.06,-.29],dark); // cooktop + oven
  const ovenGlass = box(kitchen,[.58,.32,.025],[3.2,1.08,-.24],mirror); ovenGlass.material = mirror;
  box(kitchen,[.9,.22,.58],[3.2,2.35,-.72],metalMat); box(kitchen,[.3,.68,.24],[3.2,2.68,-.72],metalMat); // hood + flue
  for (const x of [2.98,3.2,3.42]) cylinder(kitchen,.025,.035,[x,1.58,-.45],brass);
  box(kitchen,[.7,.05,.45],[4.25,1.51,-.75],mirror); cylinder(kitchen,.035,.42,[4.25,1.74,-.75],brass);
  const spout = box(kitchen,[.32,.035,.035],[4.1,1.92,-.75],brass); spout.rotation.z = -.08;
  box(kitchen,[3.6,.5,.05],[3.55,1.72,-2.38],tile);
  for (const x of [2.9,3.5,4.1]) box(kitchen,[.025,.58,.025],[x,.96,-.27],brass); // island panel rhythm
  const fruitBowl = new THREE.Mesh(new THREE.CylinderGeometry(.18,.25,.1,20),brass); fruitBowl.position.set(3.85,1.58,-.75); kitchen.add(fruitBowl);
  for (const [x,z,c] of [[3.78,-.75,0xa43b2f],[3.9,-.72,0xd88a2e],[3.84,-.64,0x7d9634]] as [number,number,number][]) {
    const fruit = new THREE.Mesh(new THREE.SphereGeometry(.09,10,8),new THREE.MeshStandardMaterial({color:c,roughness:.75})); fruit.position.set(x,1.68,z); kitchen.add(fruit);
  }
  cylinder(kitchen,.12,.28,[4.55,1.62,-2.25],furnMat);
  for (let i=0;i<4;i++) { const utensil = cylinder(kitchen,.012,.42,[4.49+i*.04,1.93,-2.25],brass); utensil.rotation.z=(i-1.5)*.08; }
  acUnit(kitchen,2.2,2.55,-2.86); ceilingLight(kitchen,3.5,2.92,-.7,.26);
  pendant(kitchen,3.05,2.9,-.75,.65); pendant(kitchen,3.95,2.9,-.75,.65);

  const powder = new THREE.Group();
  roomShell(powder,.55,.48,-2.45,1.8,2.2,{wet:true}); box(powder,[.72,.78,.5],[.18,.89,-2.9],marbleMat);
  box(powder,[1.7,.04,2.1],[.55,.53,-2.45],marbleMat);
  box(powder,[1.7,2.55,.035],[.55,1.8,-3.5],marbleMat);
  box(powder,[.75,.95,.04],[.18,1.75,-3.17],mirrorPanel);
  box(powder,[.8,.025,.025],[.18,2.24,-3.14],bronze); box(powder,[.8,.025,.025],[.18,1.26,-3.14],bronze);
  box(powder,[.025,1,.025],[-.22,1.75,-3.14],bronze); box(powder,[.025,1,.025],[.58,1.75,-3.14],bronze);
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(.24,.2,.12,20),white); basin.position.set(.18,1.34,-2.86); powder.add(basin);
  box(powder,[.78,.055,.54],[.18,1.31,-2.9],marbleMat);
  box(powder,[.64,.24,.025],[.18,1.02,-2.635],furnMat); box(powder,[.22,.025,.025],[.18,1.03,-2.615],bronze);
  box(powder,[.48,.42,.26],[.95,.94,-2.95],white); // cistern
  const toilet = new THREE.Mesh(new THREE.CylinderGeometry(.2,.27,.32,20),white); toilet.scale.z=1.35; toilet.position.set(.95,.7,-2.62); powder.add(toilet);
  const powderSeat = new THREE.Mesh(new THREE.TorusGeometry(.21,.028,8,20),white); powderSeat.rotation.x=Math.PI/2; powderSeat.scale.z=1.28; powderSeat.position.set(.95,.875,-2.62); powder.add(powderSeat);
  box(powder,[.34,.035,.42],[.95,.89,-2.67],white);
  cylinder(powder,.02,.34,[.18,1.53,-2.85],bronze); box(powder,[.24,.025,.025],[.07,1.68,-2.85],bronze);
  box(powder,[.49,2.65,.08],[-.105,1.82,-1.35],wall); box(powder,[.49,2.65,.08],[1.205,1.82,-1.35],wall);
  box(powder,[.82,.52,.08],[.55,2.885,-1.35],wall);
  for (const x of [.14,.96]) box(powder,[.025,2.12,.055],[x,1.58,-1.31],bronze);
  box(powder,[.845,.025,.055],[.55,2.65,-1.31],bronze);
  // A second framed doorway makes the kitchen-to-powder leg architectural rather than a cutaway gap.
  box(powder,[.08,2.65,1.45],[1.45,1.82,-2.825],wall);
  box(powder,[.08,.52,.75],[1.45,2.885,-1.725],wall);
  for (const z of [-2.1,-1.35]) box(powder,[.055,2.12,.025],[1.41,1.58,z],bronze);
  box(powder,[.055,.025,.775],[1.41,2.65,-1.725],bronze);
  ceilingLight(powder,.55,2.9,-2.45,.14);

  const stairs = new THREE.Group();
  for (let i=0;i<16;i++) {
    box(stairs,[1.1,.09,.34],[-1,.665+i*.19,-3.0+i*.24],stairWood);
    box(stairs,[1.0,.018,.025],[-1,.615+i*.19,-3.17+i*.24],lightMat);
  }
  for (let i=0;i<8;i++) box(stairs,[.03,.9,.03],[-1.61,1.16+i*.38,-3.0+i*.48],bronze);
  const handrail = box(stairs,[.05,.06,4.6],[-1.61,3.0,-1.2],bronze); handrail.rotation.x = -.67;
  box(stairs,[.05,.06,1.55],[-1.61,4.46,.25],bronze);
  const stairGlow = new THREE.PointLight(0xffc27d,.2,4,2);
  stairGlow.position.set(-1.05,2.15,-1.35); stairs.add(stairGlow);

  const landing = new THREE.Group();
  roomShell(landing,0,3.55,-.25,2.1,4.9,{floor:false});
  box(landing,[1.5,.08,4.9],[.3,3.55,-.25],floorMat);
  box(landing,[.65,.08,.95],[-.725,3.55,-2.225],floorMat);
  box(landing,[.65,.08,1.05],[-.725,3.55,1.675],floorMat);
  box(landing,[1.15,.1,.3],[.25,4.29,-2.43],marbleMat);
  for (const x of [-.2,.7]) box(landing,[.06,.64,.06],[x,3.92,-2.43],brass);
  box(landing,[.95,.7,.04],[.25,4.85,-2.64],art); ceilingLight(landing,0,5.9,-.2,.18);
  for (const x of [-.95,-.58,-.2,.18]) box(landing,[.04,.9,.04],[x,4.05,1.25],brass);
  box(landing,[1.25,.06,.07],[-.39,4.5,1.25],brass);

  const master = new THREE.Group();
  roomShell(master,-3.7,3.55,.7,4.2,5.2); box(master,[2.75,.34,2.15],[-3.75,3.76,.85],furnMat);
  box(master,[2.62,.28,2.02],[-3.75,4.04,.85],fabric); box(master,[2.45,.12,1.5],[-3.75,4.22,1.08],white);
  for (const x of [-4.38,-3.12]) box(master,[.52,.16,.35],[x,4.3,.12],fabric);
  box(master,[2.9,1.25,.18],[-3.75,4.48,-.25],furnMat);
  for (const x of [-5.35,-2.15]) { box(master,[.62,.48,.55],[x,3.85,.05],furnMat); tableLamp(master,x,4.09,.05); }
  box(master,[.58,2.2,2.35],[-5.45,4.72,1.95],furnMat); for (const z of [1.35,2.55]) box(master,[.025,1.75,.025],[-5.14,4.72,z],brass);
  box(master,[1.8,.045,1.25],[-3.75,3.59,2.5],art);
  acUnit(master,-5.5,5.35,-.1); ceilingLight(master,-3.7,5.92,1.2,.26);

  const masterBath = new THREE.Group();
  roomShell(masterBath,3.85,3.55,-1.55,3.35,2.75,{wet:true}); box(masterBath,[1.45,.78,.55],[3.25,4.0,-2.45],marbleMat);
  box(masterBath,[3.2,.04,2.6],[3.85,3.60,-1.55],marbleMat);
  box(masterBath,[3.2,2.55,.035],[3.85,4.85,-2.88],marbleMat);
  box(masterBath,[1.35,1.05,.04],[3.25,4.9,-2.74],mirrorPanel);
  box(masterBath,[1.4,.025,.025],[3.25,5.44,-2.71],bronze); box(masterBath,[1.4,.025,.025],[3.25,4.36,-2.71],bronze);
  box(masterBath,[.025,1.1,.025],[2.55,4.9,-2.71],bronze); box(masterBath,[.025,1.1,.025],[3.95,4.9,-2.71],bronze);
  for (const x of [2.9,3.6]) { const sink = new THREE.Mesh(new THREE.CylinderGeometry(.18,.15,.1,20),white); sink.position.set(x,4.44,-2.42); masterBath.add(sink); }
  box(masterBath,[1.48,.08,.58],[4.65,3.61,-1.7],white);
  box(masterBath,[1.65,.5,.1],[4.65,3.85,-2.04],white); box(masterBath,[1.65,.5,.1],[4.65,3.85,-1.36],white);
  box(masterBath,[.1,.5,.58],[3.87,3.85,-1.7],white); box(masterBath,[.1,.5,.58],[5.43,3.85,-1.7],white);
  box(masterBath,[1.4,.025,.48],[4.65,3.96,-1.7],mirror);
  box(masterBath,[.05,2.15,1.35],[2.38,4.67,-1.55],interiorGlass);
  box(masterBath,[.45,2.15,.05],[2.655,4.67,-.9],interiorGlass);
  box(masterBath,[.5,2.15,.05],[3.18,4.67,-.9],interiorGlass);
  box(masterBath,[.025,.28,.035],[2.96,4.72,-.86],bronze);
  box(masterBath,[1.05,.05,1.15],[2.8,3.63,-1.45],tile);
  box(masterBath,[.48,.42,.26],[4.7,4.02,-.38],white);
  const upperToilet = new THREE.Mesh(new THREE.CylinderGeometry(.2,.27,.32,20),white); upperToilet.scale.z=1.35; upperToilet.position.set(4.7,3.72,-.6); masterBath.add(upperToilet);
  const upperSeat = new THREE.Mesh(new THREE.TorusGeometry(.21,.028,8,20),white); upperSeat.rotation.x=Math.PI/2; upperSeat.scale.z=1.28; upperSeat.position.set(4.7,3.9,-.6); masterBath.add(upperSeat);
  box(masterBath,[.34,.035,.42],[4.7,3.915,-.65],white);
  for (const x of [2.9,3.6]) { cylinder(masterBath,.02,.34,[x,4.53,-2.38],bronze); box(masterBath,[.22,.025,.025],[x-.09,4.68,-2.38],bronze); }
  cylinder(masterBath,.018,1.15,[2.76,4.95,-1.88],bronze); const showerHead=box(masterBath,[.24,.025,.16],[2.76,5.48,-1.75],bronze); showerHead.rotation.x=.25;
  cylinder(masterBath,.02,.85,[5.15,4.045,-1.24],bronze); box(masterBath,[.025,.025,.28],[5.15,4.46,-1.37],bronze);
  box(masterBath,[.65,.025,.035],[4.55,4.75,-2.85],bronze);
  box(masterBath,[.035,.08,.035],[4.25,4.71,-2.82],bronze); box(masterBath,[.035,.08,.035],[4.85,4.71,-2.82],bronze);
  ceilingLight(masterBath,3.85,5.9,-1.5,.15);

  const secondBedroom = new THREE.Group();
  roomShell(secondBedroom,3.75,3.55,2.15,3.6,3.55); box(secondBedroom,[2.15,.3,1.75],[3.1,3.74,2.25],furnMat);
  box(secondBedroom,[2.05,.24,1.65],[3.1,3.99,2.25],fabric); box(secondBedroom,[1.85,.1,1.2],[3.1,4.16,2.43],white);
  for (const x of [2.68,3.52]) box(secondBedroom,[.38,.14,.3],[x,4.24,1.68],fabric);
  box(secondBedroom,[2.25,1.05,.16],[3.1,4.4,1.35],furnMat); box(secondBedroom,[.55,2.1,1.45],[5.2,4.66,2.75],furnMat);
  box(secondBedroom,[1.35,.09,.58],[4.55,4.25,.75],furnMat); for (const x of [4.05,5.05]) box(secondBedroom,[.055,.66,.055],[x,3.88,.75],brass);
  chair(secondBedroom,4.55,3.55,1.38,Math.PI); box(secondBedroom,[1.2,.65,.05],[4.55,4.75,.45],art);
  box(secondBedroom,[1.45,.045,1.05],[3.1,3.59,3.15],art);
  ceilingLight(secondBedroom,3.75,5.92,2.3,.22);

  // Continuous circulation surfaces make the route physically legible between the separate rooms.
  const circulation = new THREE.Group();
  box(circulation,[.4,.08,.9],[-1.35,.48,2.8],floorMat); // foyer -> living doorway
  box(circulation,[.4,.08,.6],[-1.35,.48,2.05],floorMat); // level threshold infill
  box(circulation,[.45,.08,.9],[1.375,.48,2.6],floorMat); // foyer -> dining doorway
  box(circulation,[.8,.08,.725],[4.9,.48,1.0625],tile); // dining -> kitchen doorway
  box(circulation,[3.9,.08,.35],[3.5,.48,3.95],floorMat); // dining-front walking strip
  box(circulation,[3.05,.08,3.1],[-.025,.48,.2],floorMat); // central ground-floor hall
  box(circulation,[.95,.08,2.4],[-2.025,.48,-2.35],floorMat); // living rear door -> stair hall
  box(circulation,[2.4,.08,.7],[-1.3,.48,-3.55],floorMat); // stair approach
  // Upper circulation belongs to the landing threshold so it never floats over ground-floor shots.
  box(landing,[.9,.08,6.3],[1.5,3.55,.65],floorMat);
  box(landing,[7.2,.08,.7],[1.98,3.55,4.29],floorMat);
  box(landing,[.9,.08,4.55],[6.02,3.55,2.1],floorMat);
  box(landing,[2.65,.08,1.74],[-.275,3.55,3.07],floorMat); // landing -> master connector
  box(landing,[.4,.08,.64],[-1.8,3.55,3.62],floorMat); // master-door corner infill
  box(landing,[.4,.08,.3],[5.7,3.55,4.5],floorMat); // east passage -> terrace connector
  for (const z of [-.05,.85,1.75,2.65,3.55,4.35]) box(landing,[.035,.9,.035],[6.45,4.05,z],brass);
  box(landing,[.045,.055,4.55],[6.45,4.5,2.1],brass);
  for (const z of [-1.65,-.95,-.25,.25]) box(landing,[.035,.9,.035],[-.38,4.05,z],brass);
  box(landing,[.045,.055,1.9],[-.38,4.5,-.7],brass); // open at the stair arrival

  // The cantilevered upper terrace is a furnished outdoor room, not an empty balcony slab.
  // Its sofa faces the doorway so the walkthrough frames the seating, table, greenery and skyline.
  const terrace = new THREE.Group();
  box(terrace,[4.45,.045,1.82],[2.5,3.78,4.88],marbleMat);
  for (let i=0;i<11;i++) box(terrace,[.34,.018,1.72],[.46+i*.405,3.81,4.88],stairWood);
  box(terrace,[2.25,.22,.62],[2.0,4.02,5.35],furnMat);
  box(terrace,[2.08,.16,.52],[2.0,4.2,5.25],fabric);
  box(terrace,[2.12,.58,.14],[2.0,4.43,5.62],fabric);
  for (const x of [1.28,2.0,2.72]) box(terrace,[.58,.16,.12],[x,4.48,5.53],white);
  box(terrace,[.14,.46,.58],[.945,4.28,5.34],fabric); box(terrace,[.14,.46,.58],[3.055,4.28,5.34],fabric);
  box(terrace,[1.25,.1,.58],[2.0,4.14,4.53],marbleMat);
  for (const x of [1.52,2.48]) for (const z of [4.34,4.72]) box(terrace,[.045,.32,.045],[x,3.96,z],bronze);
  for (const x of [.55,4.45]) {
    cylinder(terrace,.22,.38,[x,3.98,5.35],marbleMat);
    cylinder(terrace,.022,.72,[x,4.48,5.35],brass);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(.34,12,8),new THREE.MeshStandardMaterial({color:0x3b5a3d,roughness:.9}));
    crown.scale.set(.72,1,.72); crown.position.set(x,4.84,5.35); terrace.add(crown);
  }
  box(terrace,[4.65,1.05,.035],[2.5,4.34,5.82],interiorGlass);
  for (const x of [.2,1.35,2.5,3.65,4.8]) box(terrace,[.035,1.08,.035],[x,4.35,5.84],bronze);
  box(terrace,[4.65,.045,.045],[2.5,4.89,5.84],bronze);
  for (const x of [.45,4.55]) {
    box(terrace,[.09,.42,.09],[x,4.03,4.08],bronze);
    box(terrace,[.16,.12,.16],[x,4.28,4.08],lightMat);
  }

  // Persistence means every completed room remains visible. Batch each static room by material so
  // that richer furniture does not turn that guarantee into hundreds of draw calls on weak GPUs.
  const batchRoom = (room: THREE.Group): void => {
    room.updateMatrixWorld(true);
    const roomInverse = room.matrixWorld.clone().invert();
    const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
    const sources: THREE.Mesh[] = [];
    room.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || object instanceof THREE.InstancedMesh || object instanceof THREE.SkinnedMesh || Array.isArray(object.material)) return;
      object.updateWorldMatrix(true, false);
      const geometry = object.geometry.clone();
      geometry.applyMatrix4(roomInverse.clone().multiply(object.matrixWorld));
      const bucket = batches.get(object.material) ?? [];
      bucket.push(geometry);
      batches.set(object.material, bucket);
      sources.push(object);
    });
    sources.forEach((mesh) => {
      mesh.removeFromParent();
      mesh.geometry.dispose();
    });
    batches.forEach((geometries, material) => {
      const geometry = mergeGeometries(geometries, false);
      geometries.forEach((source) => source.dispose());
      if (!geometry) return;
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, material);
      const shaded = material !== interiorGlass && material !== lightMat;
      mesh.castShadow = shaded;
      mesh.receiveShadow = shaded;
      room.add(mesh);
    });
  };
  [foyer,living,dining,kitchen,powder,stairs,landing,master,masterBath,secondBedroom,terrace,circulation].forEach(batchRoom);

  furnitureGroup.add(circulation,foyer,living,dining,kitchen,powder,stairs,landing,master,masterBath,secondBedroom,terrace);
  interior.add(furnitureGroup);
  const interiorLight = new THREE.PointLight(0xffb968, 0, 11, 2);
  interiorLight.position.set(0, 3.2, 0);
  interior.add(interiorLight);
  // The outdoor HDRI still supplies reflections, but indoor PBR materials receive a deliberately
  // dimmer image-based-lighting contribution so pale surfaces retain tone and texture.
  interior.traverse((object) => {
    const material = (object as THREE.Mesh).material;
    const materials = Array.isArray(material) ? material : material ? [material] : [];
    materials.forEach((entry) => {
      if (entry instanceof THREE.MeshStandardMaterial) entry.envMapIntensity = 0.72;
    });
  });
  interiorGlass.envMapIntensity = .35;
  mirrorPanel.envMapIntensity = .5;
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
    marbleMat,
    furnitureGroup,
    finishes,
    rooms: { foyer, living, dining, kitchen, powder, stairs, landing, master, masterBath, secondBedroom, terrace },
  };
}

// ---------- assembly ----------

export function createWorld(): World {
  const scene = new THREE.Scene();
  // A moderate architectural lens keeps whole-room compositions readable without fisheye distortion.
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200);

  const sky = buildSky();
  const skyMat = (sky as unknown as { userData: { mat: THREE.ShaderMaterial } }).userData.mat;
  scene.add(sky);

  const fog = new THREE.FogExp2(0x223038, 0.018);
  scene.fog = fog;
  // HDRI env supplies most of the ambient/reflections, so keep the fill low; the sun is the shadow key.
  const ambient = new THREE.AmbientLight(0x9fb4c9, 0.18);
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
  landscape.group.visible = false;
  scene.add(landscape.group);

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
    site: {
      developed: landscape.group,
      pavingMat: landscape.pavingMat,
      lawnMat: landscape.lawnMat,
      waterNormal: landscape.waterNormal,
    },
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
      marbleMat: villa.marbleMat,
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
    handles.site.waterNormal.offset.set(elapsed * 0.018, elapsed * 0.01);
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
      (scene as THREE.Scene & { environmentIntensity: number }).environmentIntensity = 0.45;
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
    const wood = await loadPbr('wood', 3);
    graft(handles.villa.claddingMat, wood);
    graft(handles.villa.floorMat, wood);
    invalidate();
  } catch {
    /* keep flat cladding */
  }
  try {
    const marble = await loadPbr('marble', 2);
    graft(handles.villa.marbleMat, marble);
    invalidate();
  } catch {
    /* keep flat floor */
  }
  try {
    graft(handles.terrainMat, await loadPbr('grass', 24));
    graft(handles.site.lawnMat, await loadPbr('grass', 18));
    handles.terrainMat.flatShading = false;
    handles.terrainMat.needsUpdate = true;
    invalidate();
  } catch {
    /* keep flat terrain */
  }
  try {
    graft(handles.site.pavingMat, await loadPbr('concrete', 8));
    invalidate();
  } catch {
    /* keep flat paving */
  }

  // Real CC0 furniture GLBs (glTF) into the interior via the loader seam — proves real models load;
  // scene.environment lights them automatically. Falls back to the procedural boxes if any fails.
  // The authored set is the default: these decorative GLBs contain hundreds of separate meshes,
  // duplicate the authored sofa/table, and are prohibitively draw-call heavy on weak GPUs.
  const loadDecorativeHeroModels = false;
  if (loadDecorativeHeroModels) {
    try {
      const loader = createModelLoader(renderer);
      const [sofa, table, chair] = await Promise.all([
      loadModel(loader, 'sofa/model.gltf'),
      loadModel(loader, 'coffee_table/model.gltf'),
      loadModel(loader, 'armchair/model.gltf'),
    ]);
      const place = (obj: THREE.Object3D, x: number, z: number, ry: number, s: number): void => {
      obj.position.set(x, 0.52, z);
      obj.rotation.y = ry;
      obj.scale.setScalar(s);
      obj.traverse((n) => {
        const m = n as THREE.Mesh;
        if (m.isMesh) {
          m.castShadow = true;
          m.receiveShadow = true;
          const materials = Array.isArray(m.material) ? m.material : [m.material];
          materials.forEach((material) => {
            if (material instanceof THREE.MeshStandardMaterial) material.envMapIntensity = 0.72;
          });
        }
      });
      handles.villa.rooms.living.add(obj);
    };
      place(sofa.scene, -4.2, 1.58, 0, 1);
      place(table.scene, -3.55, .05, 0, 1);
      place(chair.scene, -2.15, .8, -Math.PI / 3, 1);
      invalidate();
    } catch {
      /* keep the authored furniture */
    }
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
