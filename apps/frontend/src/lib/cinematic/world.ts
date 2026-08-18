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
    exteriorShell: THREE.Group;
    upperLeftFacade: THREE.Group;
    mainDoor: THREE.Group;
    /** Live (un-batched) pivot for the ground-floor guest-bedroom door — director-animated. */
    groundBedroomDoor: THREE.Group;
    /** Live (un-batched) pivot for the guest ensuite door — director-animated. */
    groundBathDoor: THREE.Group;
    rooms: {
      living: THREE.Group;
      dining: THREE.Group;
      kitchen: THREE.Group;
      stairs: THREE.Group;
      landing: THREE.Group;
      master: THREE.Group;
      masterBath: THREE.Group;
      commonBath: THREE.Group;
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

const SHELL = 0xa39f96;
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
  for (const x of [-2.86, 2.86]) box(group, [.16, .15, 15], [x, .13, 8], metal); // crisp driveway edging
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
    dummy.position.set(side * 8.35, 0.45, -6.5 + j * 0.55);
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
    [-12,-7],[-11.2,-4.8],[-12.6,1],[-12.8,9.8],[11.2,-7.5],[13.7,3.8],[9.2,-10.2],[-7.8,-11],[13.5,-1.8],[-13,5.4],[13.8,10.8],
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
  const estateStone = new THREE.MeshStandardMaterial({ color: 0x4b4945, roughness: 0.86 });
  const estateGlass = new THREE.MeshPhysicalMaterial({ color: 0x52666a, roughness: 0.12, metalness: 0.12, transmission: 0.45, transparent: true, opacity: 0.8 });
  const estateGlow = new THREE.MeshStandardMaterial({ color: 0x2a1b10, emissive: 0xffbd70, emissiveIntensity: 0.55 });
  const buildEstateVilla = (x: number, z: number, rotation: number, scale: number) => {
    const lod = new THREE.LOD();
    const near = new THREE.Group();
    box(near, [8,3.2,5.5], [0,1.6,0], estateStone);
    box(near, [5.4,2.7,4.2], [-.8,4.55,-.45], estateStone);
    box(near, [3.8,2.1,.08], [1.3,2.1,2.78], estateGlass);
    box(near, [3.1,1.2,.06], [-1.7,4.55,1.68], estateGlow);
    const far = new THREE.Group();
    box(far, [8,5.7,5.4], [0,2.85,0], estateStone);
    box(far, [3.6,1.3,.05], [.8,3,2.73], estateGlass);
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
  // Path lamps flank the pedestrian walkway ONLY — none on the door axis. (Two used to sit right in
  // front of the entrance, where their dark posts vanished at dusk and the lit caps read as two
  // floating rectangles.)
  for (let i = 0; i < 6; i++) {
    const x = i < 4 ? 5.2 + i * 2 : -5.5 + (i - 4) * 1.3;
    const z = i < 4 ? 0.4 : 7.5;
    cylinder(group, 0.07, 0.55, [x, 0.34, z], metal);
    box(group, [0.18, 0.15, 0.18], [x, 0.68, z], lampMat);
  }

  // Four clipped specimen planters frame the architecture without blocking the hero sightline.
  const planterPositions: [number, number][] = [[-5.25,6.45],[5.25,6.45],[-7.15,2.4],[7.05,3.65]];
  const planterMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(.42,.5,.58,12),
    new THREE.MeshStandardMaterial({ color:0x777168, roughness:.72 }),
    planterPositions.length,
  );
  const topiaryMesh = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(.55,1),
    new THREE.MeshStandardMaterial({ color:0x29422d, roughness:.96 }),
    planterPositions.length,
  );
  planterPositions.forEach(([x,z],index) => {
    dummy.position.set(x,.34,z); dummy.rotation.set(0,index*.8,0); dummy.scale.set(1,1,1); dummy.updateMatrix(); planterMesh.setMatrixAt(index,dummy.matrix);
    dummy.position.set(x,.98,z); dummy.rotation.set(0,index*.8,0); dummy.scale.set(.78,1.18,.78); dummy.updateMatrix(); topiaryMesh.setMatrixAt(index,dummy.matrix);
  });
  planterMesh.instanceMatrix.needsUpdate = topiaryMesh.instanceMatrix.needsUpdate = true;
  group.add(planterMesh,topiaryMesh);
  return { group, pavingMat: stone, lawnMat: lawn, waterNormal };
}

function buildGate() {
  const group = new THREE.Group();
  group.position.set(0, 0, 10.85);
  const span = 4.6;
  const height = 2.2;
  const half = span / 2;
  const postMat = new THREE.MeshStandardMaterial({ color: 0x777168, roughness: 0.72, metalness: 0.04 });
  for (const x of [-half, half]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, height + 0.4, 0.18), postMat);
    post.position.set(x, height / 2 + 0.1, 0);
    group.add(post);
  }
  const panelMat = new THREE.MeshStandardMaterial({ color:0x1b1d1d, roughness:.3, metalness:.78 });
  const accentMat = new THREE.MeshStandardMaterial({ color:0x9d7b45, roughness:.28, metalness:.86 });
  const makeHinge = (hingeX: number, dir: 1 | -1) => {
    const hinge = new THREE.Group();
    hinge.position.set(hingeX, 0, 0);
    const center = (dir * half) / 2;
    box(hinge,[half,.08,.08],[center,.08,0],accentMat);
    box(hinge,[half,.08,.08],[center,height-.04,0],accentMat);
    for (let i=0;i<7;i++) {
      const x = dir * (.16 + i * (half - .32) / 6);
      box(hinge,[.085,height-.22,.065],[x,height/2,0],panelMat);
    }
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
  const upperMaterial = new THREE.MeshStandardMaterial({ color:SHELL, roughness:.82, side:THREE.DoubleSide });
  const upper = { group:new THREE.Group(), material:upperMaterial };
  upper.group.position.set(0,3.58,0);
  upper.group.scale.set(1,0,1);
  box(upper.group,[4.3,2.8,6.2],[-3.65,1.4,-.65],upperMaterial);
  box(upper.group,[3.6,2.8,4.6],[2.0,1.4,-1.45],upperMaterial);
  shellMats.push(upperMaterial);
  root.add(upper.group);

  // roof (drops in — starts hidden/high, director animates)
  const roof = new THREE.Group();
  roof.position.set(0, 6.45, 0);
  roof.visible = false;
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x4c4d4b, roughness: 0.72 });
  shellMats.push(roofMat);
  box(roof,[5.05,.28,6.9],[-3.35,0,-.65],roofMat);
  box(roof,[4.15,.28,5.25],[2.0,0,-1.45],roofMat);
  box(roof,[5.0,.18,2.55],[2.45,-.04,4.55],roofMat);
  root.add(roof);

  // cladding (shared material → tween opacity once)
  const finishes = new THREE.Group();
  finishes.visible = false;
  root.add(finishes);
  const claddingMat = new THREE.MeshStandardMaterial({
    color: 0x6e4529,
    roughness: 0.46,
    metalness: 0.06,
    transparent: true,
    opacity: 0,
  });
  claddingMat.name = 'facade-walnut-cladding';
  const cladDefs: { s: [number, number, number]; p: [number, number, number] }[] = [
    { s: [1.55, 3.2, 0.08], p: [-5.08, 1.98, 4.5] },
    { s: [0.08, 3.2, 3.15], p: [-6.14, 1.98, -1.85] },
  ];
  for (const c of cladDefs) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...c.s), claddingMat);
    m.position.set(...c.p);
    finishes.add(m);
  }
  // Upper-storey skin (cladding panels + roof canopy) is parented to the upper MASSING itself, so
  // the open-top cutaway removes skin and volume together — no floating wood walls can ever cross
  // the master bedroom. Positions are local to the upper group (world − group origin).
  for (const c of [
    { s:[1.15,2.8,.08] as [number,number,number], p:[-5.18,1.4,2.49] as [number,number,number], mat:claddingMat },
    { s:[.08,2.8,2.25] as [number,number,number], p:[3.84,1.4,-1.52] as [number,number,number], mat:claddingMat },
  ]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...c.s), c.mat);
    m.position.set(...c.p);
    upper.group.add(m);
  }

  // glass
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x344347,
    roughness: 0.12,
    metalness: 0.28,
    transmission: 0.16,
    thickness: 0.12,
    ior: 1.5,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  glassMat.name = 'smoky-architectural-glass';
  // Glazed portal with a REAL door opening (x -1.15..0.05, height 2.4) — the walkthrough camera
  // enters through this gap, so no pane or mullion ever has to be hidden or clipped through.
  const doorGapMinX = -1.15;
  const doorGapMaxX = 0.05;
  const doorHeadY = 2.8;
  const paneLeft = new THREE.Mesh(new THREE.PlaneGeometry(doorGapMinX - -2.1, 5.9), glassMat);
  paneLeft.position.set((-2.1 + doorGapMinX) / 2, 3.35, 4.48);
  finishes.add(paneLeft);
  const paneRight = new THREE.Mesh(new THREE.PlaneGeometry(2.1 - doorGapMaxX, 5.9), glassMat);
  paneRight.position.set((doorGapMaxX + 2.1) / 2, 3.35, 4.48);
  finishes.add(paneRight);
  const paneHead = new THREE.Mesh(
    new THREE.PlaneGeometry(doorGapMaxX - doorGapMinX, 6.3 - doorHeadY),
    glassMat,
  );
  paneHead.position.set((doorGapMinX + doorGapMaxX) / 2, doorHeadY + (6.3 - doorHeadY) / 2, 4.48);
  finishes.add(paneHead);
  // The MAIN DOOR: a warm-wood pivot leaf filling the gap, hinged on the west jamb. The director
  // swings it open as the camera arrives, and the tour steps straight through into the hall.
  const doorWood = new THREE.MeshStandardMaterial({ color: 0x56351f, roughness: 0.42, metalness: 0.04 });
  const doorBrass = new THREE.MeshStandardMaterial({ color: 0xc6a15b, roughness: 0.22, metalness: 0.9 });
  const mainDoor = new THREE.Group();
  mainDoor.position.set(doorGapMinX, 0.42, 4.48);
  const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(doorGapMaxX - doorGapMinX - 0.02, doorHeadY - 0.46, 0.055), doorWood);
  doorLeaf.position.set((doorGapMaxX - doorGapMinX) / 2, (doorHeadY - 0.42) / 2, 0);
  mainDoor.add(doorLeaf);
  const doorHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.62, 10), doorBrass);
  doorHandle.position.set(doorGapMaxX - doorGapMinX - 0.14, 1.2, 0.06);
  mainDoor.add(doorHandle);
  finishes.add(mainDoor);

  // Architectural finish layer: double-height portal, balcony, overhang and restrained mullions.
  // The west-side vertical feature is completed below as part of `exteriorShell`, rather than as an
  // isolated blade that remains behind when the upper floor switches to its interior cutaway.
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x17191a, roughness: 0.26, metalness: 0.86 });
  const marbleMat = new THREE.MeshStandardMaterial({ color: 0xd2c9b9, roughness: 0.3, metalness: 0.02 });
  const detail = new THREE.Group();
  box(detail, [4.8, 0.22, 2.2], [2.5, 3.65, 4.85], marbleMat); // cantilever balcony
  // Mullions stay clear of the door gap; its edges get full-height jambs instead.
  for (const x of [-1.8, 0.78, 1.68]) box(detail, [0.045, 5.75, 0.08], [x, 3.35, 4.54], metalMat);
  for (const x of [doorGapMinX, doorGapMaxX]) box(detail, [0.06, 5.75, 0.1], [x, 3.35, 4.54], metalMat);
  box(detail, [doorGapMaxX - doorGapMinX + 0.12, 0.08, 0.1], [(doorGapMinX + doorGapMaxX) / 2, doorHeadY, 4.54], metalMat);
  // Two aligned transoms calm the tall glass composition without turning it into a repetitive grid.
  box(detail, [doorGapMinX - -2.1, .045, .08], [(-2.1 + doorGapMinX) / 2, 3.58, 4.54], metalMat);
  box(detail, [2.1 - doorGapMaxX, .045, .08], [(doorGapMaxX + 2.1) / 2, 3.58, 4.54], metalMat);
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
  // Every emissive pane sits ON an actual exterior wall face (walls: z±4.35 front/back panels,
  // x±6 sides) — never floating inside a room. Ground storey only; the upper storey is the open-top
  // cutaway during the interior tour.
  const winMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.7, 1.0), windowMat, 24);
  winMesh.frustumCulled = true;
  winMesh.visible = false; // appears with the cladding in Scene 4
  const wd = new THREE.Object3D();
  let wi = 0;
  const windowY = 1.75;
  // Front facade panels span x -6..-2.2 and 2.2..6 (the centre is the glazed portal).
  for (const x of [-5.1, -4.1, -3.1, 3.1, 4.1, 5.1]) {
    wd.position.set(x, windowY, 4.5);
    wd.rotation.set(0, 0, 0);
    wd.updateMatrix();
    winMesh.setMatrixAt(wi++, wd.matrix);
  }
  // Back wall spans the full width.
  for (const x of [-4.5, -2.25, 0, 2.25, 4.5]) {
    wd.position.set(x, windowY, -4.5);
    wd.rotation.set(0, Math.PI, 0);
    wd.updateMatrix();
    winMesh.setMatrixAt(wi++, wd.matrix);
  }
  // Side walls.
  for (const side of [-1, 1])
    for (const z of [-2.5, 0, 2.5]) {
      wd.position.set(side * 6.15, windowY, z);
      wd.rotation.set(0, side > 0 ? Math.PI / 2 : -Math.PI / 2, 0);
      wd.updateMatrix();
      winMesh.setMatrixAt(wi++, wd.matrix);
    }
  // Collapse the unused instance slots so nothing renders at the origin.
  wd.position.set(0, -50, 0);
  wd.scale.setScalar(0.0001);
  wd.updateMatrix();
  for (; wi < 24; wi += 1) winMesh.setMatrixAt(wi, wd.matrix);
  winMesh.instanceMatrix.needsUpdate = true;
  root.add(winMesh);

  // Exterior-only completion layer. It is visible for the completed approach, hidden for the
  // walk-through cutaway, then restored for Scene 13. Keeping it in one group makes that state
  // deterministic and prevents isolated facade/terrace pieces from leaking into interior shots.
  const exteriorShell = new THREE.Group();
  exteriorShell.name = 'villa-completed-exterior-shell';
  exteriorShell.visible = false;
  const exteriorGlow = new THREE.MeshStandardMaterial({
    color:0x2b1a0f, emissive:0xffb86a, emissiveIntensity:.78, roughness:.5,
  });
  const facadeStone = new THREE.MeshStandardMaterial({
    color:0xd8d1c4, roughness:.7, metalness:.015, envMapIntensity:.58,
  });
  facadeStone.name = 'upper-suite-warm-ivory-stone';
  const exteriorFabric = new THREE.MeshStandardMaterial({ color:0x777064, roughness:.9 });
  const exteriorGreen = new THREE.MeshStandardMaterial({ color:0x29432d, roughness:.96 });
  const upperLeftFacade = new THREE.Group();
  upperLeftFacade.name = 'upper-left-private-suite-facade';
  exteriorShell.add(upperLeftFacade);

  // A calm three-step arrival and strong datum line give the double-height pivot entrance weight.
  box(exteriorShell,[2.75,.11,.42],[-.55,.12,4.82],marbleMat);
  box(exteriorShell,[3.2,.10,.42],[-.55,.08,5.22],marbleMat);
  box(exteriorShell,[3.7,.08,.42],[-.55,.045,5.62],marbleMat);
  box(exteriorShell,[4.85,.18,.42],[-.55,6.22,4.48],metalMat);
  for (const x of [-2.22,2.02]) box(exteriorShell,[.12,6.0,.34],[x,3.32,4.48],metalMat);
  for (const x of [-1.92,1.72]) box(exteriorShell,[.12,.34,.18],[x,2.7,4.68],exteriorGlow);

  // WEST PRIVATE SUITE FACADE. The master interior remains in the scene for the walkthrough, but
  // this exterior-only assembly closes it with a deep, architecturally plausible envelope. The
  // smoky bedroom window is recessed behind stone returns, a real sill/head slab and timber privacy
  // fins, so no bed, internal door or cutaway wall reads from an exterior camera.
  box(upperLeftFacade,[4.24,.16,.5],[-3.65,3.68,2.62],facadeStone); // expressed upper slab edge
  box(upperLeftFacade,[4.24,.18,.5],[-3.65,6.24,2.62],facadeStone); // restrained projecting canopy
  box(upperLeftFacade,[.46,2.48,.58],[-5.51,4.96,2.42],facadeStone); // west masonry return
  box(upperLeftFacade,[.34,2.48,.58],[-1.76,4.96,2.42],facadeStone); // glass-volume transition return
  box(upperLeftFacade,[3.42,.38,.34],[-3.63,3.92,2.54],facadeStone); // solid stone spandrel
  box(upperLeftFacade,[3.42,.36,.34],[-3.63,5.99,2.54],facadeStone); // solid head / wall depth

  // A dark warm backing provides privacy and a controlled dusk glow; reflective glass stays the
  // outermost visible layer. Frames are kept to two bays plus an asymmetrical screened bay.
  box(upperLeftFacade,[3.34,1.72,.055],[-3.63,4.94,2.585],windowMat);
  box(upperLeftFacade,[3.36,1.74,.035],[-3.63,4.94,2.635],glassMat);
  for (const x of [-5.30,-4.16,-3.05,-1.96]) box(upperLeftFacade,[.055,1.86,.16],[x,4.94,2.69],metalMat);
  for (const y of [4.06,5.82]) box(upperLeftFacade,[3.42,.055,.16],[-3.63,y,2.69],metalMat);
  for (const x of [-5.12,-4.84,-4.56,-4.28]) {
    box(upperLeftFacade,[.095,2.05,.24],[x,4.94,2.81],claddingMat);
  }

  // The former isolated entrance blade becomes an L-shaped stone return with a narrow walnut batten
  // face. It physically bridges the set-back bedroom volume (z=2.45) to the double-height portal
  // (z=4.48), aligning cleanly with both slab and roof datums.
  box(upperLeftFacade,[.38,6.0,2.05],[-2.06,3.38,3.47],facadeStone);
  for (const x of [-2.21,-2.11,-2.01,-1.91]) box(upperLeftFacade,[.065,5.82,.11],[x,3.38,4.53],claddingMat);
  box(upperLeftFacade,[.04,4.9,.06],[-1.86,3.58,4.61],exteriorGlow); // warm grazing-light reveal

  // A low parapet and slim charcoal coping finish the silhouette instead of leaving a floating slab.
  box(upperLeftFacade,[4.28,.38,.22],[-3.64,6.72,2.67],facadeStone);
  box(upperLeftFacade,[.22,.38,6.62],[-5.76,6.72,-.56],facadeStone);
  box(upperLeftFacade,[4.42,.065,.3],[-3.64,6.94,2.67],metalMat);
  box(upperLeftFacade,[.30,.065,6.74],[-5.76,6.94,-.56],metalMat);

  // The recessed east volume remains secondary; its simplified framing complements the west suite.
  box(exteriorShell,[3.12,2.08,.035],[2.0,4.94,.875],windowMat);
  box(exteriorShell,[3.14,2.1,.028],[2.0,4.94,.905],glassMat);
  for (const x of [.48,1.5,2.5,3.52]) box(exteriorShell,[.035,2.18,.1],[x,4.94,.94],metalMat);

  // Side elevations terminate cleanly with framed openings, a stone base and restrained timber fins.
  for (const side of [-1,1]) box(exteriorShell,[.12,.24,8.65],[side*6.08,.55,0],marbleMat);
  for (const x of [-5.1,-4.1,-3.1,3.1,4.1,5.1]) {
    for (const y of [1.2,2.3]) box(exteriorShell,[.82,.045,.09],[x,y,4.54],metalMat);
    for (const frameX of [x-.4,x+.4]) box(exteriorShell,[.045,1.14,.09],[frameX,1.75,4.54],metalMat);
  }
  for (const side of [-1,1]) for (const z of [-2.5,0,2.5]) {
    for (const y of [1.2,2.3]) box(exteriorShell,[.09,.045,.82],[side*6.18,y,z],metalMat);
    for (const frameZ of [z-.4,z+.4]) box(exteriorShell,[.09,1.14,.045],[side*6.18,1.75,frameZ],metalMat);
  }
  // West return: replace the former full-height dark slab with a stone-framed smoky corner window.
  // The warm backing is inside the shell and the reflective pane is outside (negative X), so the
  // exterior reads as glass/privacy rather than a glowing flat rectangle.
  box(upperLeftFacade,[.035,1.34,2.18],[-5.82,4.95,-.35],windowMat);
  box(upperLeftFacade,[.035,1.36,2.2],[-5.88,4.95,-.35],glassMat);
  for (const y of [4.19,5.71]) box(upperLeftFacade,[.24,.18,2.48],[-5.91,y,-.35],facadeStone);
  for (const z of [-1.55,.85]) box(upperLeftFacade,[.24,1.7,.18],[-5.91,4.95,z],facadeStone);
  for (const z of [-1.22,-.92,-.62]) box(upperLeftFacade,[.2,1.86,.085],[-5.99,4.95,z],claddingMat);
  for (const z of [-1.15,-.35,.45]) box(upperLeftFacade,[.12,1.48,.045],[-5.94,4.95,z],metalMat);
  for (let i=0;i<7;i++) box(exteriorShell,[.09,2.55,.16],[3.9,4.9,1.25+i*.34],claddingMat);

  // Luxury terrace: floating canopy, slim charcoal frame, glass balustrade, lounge and planters.
  box(exteriorShell,[4.75,.05,1.78],[2.5,3.79,4.88],claddingMat);
  box(exteriorShell,[4.72,1.02,.035],[2.5,4.36,5.93],glassMat);
  box(exteriorShell,[.035,1.02,1.95],[4.87,4.36,4.96],glassMat);
  for (const x of [.16,1.33,2.5,3.67,4.84]) box(exteriorShell,[.045,1.06,.08],[x,4.36,5.95],metalMat);
  box(exteriorShell,[4.82,.06,.09],[2.5,4.9,5.95],metalMat);
  for (const x of [.2,4.8]) box(exteriorShell,[.1,2.5,.1],[x,5.02,4.52],metalMat);
  box(exteriorShell,[4.75,.12,.12],[2.5,6.25,4.52],metalMat);
  for (const z of [3.45,3.92,4.39,4.86,5.33,5.72]) box(exteriorShell,[4.68,.055,.13],[2.5,6.2,z],claddingMat);
  box(exteriorShell,[2.15,.52,.58],[2.05,4.12,5.32],exteriorFabric);
  box(exteriorShell,[2.05,.62,.14],[2.05,4.42,5.58],exteriorFabric);
  box(exteriorShell,[1.15,.09,.58],[2.05,4.08,4.54],marbleMat);
  for (const x of [1.58,2.52]) for (const z of [4.35,4.72]) box(exteriorShell,[.045,.28,.045],[x,3.93,z],metalMat);
  for (const x of [.58,4.45]) {
    cylinder(exteriorShell,.24,.42,[x,4.02,5.28],marbleMat);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(.4,1),exteriorGreen);
    crown.scale.set(.72,1.15,.72); crown.position.set(x,4.58,5.28); exteriorShell.add(crown);
  }
  for (const x of [-4.72,-3.38]) cylinder(upperLeftFacade,.055,.035,[x,6.12,2.83],exteriorGlow);
  for (const [x,y,z,intensity,distance] of [
    [-.55,2.65,4.72,.32,5.5],
    [.45,5.75,4.7,.32,5.5],
    [4.5,5.75,4.7,.32,5.5],
    [-3.55,5.2,2.95,.18,3.2],
  ] as [number,number,number,number,number][]) {
    const light = new THREE.PointLight(0xffb86a,intensity,distance,2);
    light.position.set(x,y,z); light.castShadow = false; exteriorShell.add(light);
  }
  root.add(exteriorShell);

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
  // Dim, neutral interior sheen — NOT a sky reflector. With metalness 1 + strong envMapIntensity
  // the bathroom mirrors bounced the HDRI sky and read as holes to outdoors.
  const mirrorPanel = new THREE.MeshPhysicalMaterial({
    // clearcoat must stay 0 — the clearcoat layer reflects the environment regardless of
    // envMapIntensity, which is exactly the sky-in-the-mirror defect. Soft gray glass, dim
    // neutral interior sheen: never the sky, never a black hole.
    color: 0x8b949c, roughness: .22, metalness: .15, clearcoat: 0, envMapIntensity: .15,
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

  // There is NO foyer room — the main door opens STRAIGHT into the living hall. A marble entry pad
  // runs from the door threshold into the hall, with pendant globes over it (hung from the landing
  // slab underside) and curtain panels flanking the glazed portal on the inside.
  // PREMIUM LIVING HALL U-SHAPE V8
  // Luxury U-shaped living composition with cleaner circulation
  // and a stronger architectural media wall.

  const living = new THREE.Group();
  living.name = 'premium-living-hall-u-shape-v8';

  const livingStone = new THREE.MeshStandardMaterial({
    color: 0xd4c9bb,
    roughness: .54,
    metalness: .015,
    envMapIntensity: .72,
  });

  const livingStone2 = new THREE.MeshStandardMaterial({
    color: 0xb9aa99,
    roughness: .6,
    metalness: .018,
    envMapIntensity: .66,
  });

  const livingWalnut = new THREE.MeshStandardMaterial({
    color: 0x472a1d,
    roughness: .46,
    metalness: .025,
    envMapIntensity: .76,
  });

  const livingDarkWood = new THREE.MeshStandardMaterial({
    color: 0x2f1d17,
    roughness: .43,
    metalness: .03,
    envMapIntensity: .78,
  });

  const livingCream = new THREE.MeshStandardMaterial({
    color: 0xd7cbbf,
    roughness: .9,
    metalness: 0,
    envMapIntensity: .38,
  });

  const livingTaupe = new THREE.MeshStandardMaterial({
    color: 0x988579,
    roughness: .86,
    metalness: 0,
    envMapIntensity: .38,
  });

  const livingCharcoal = new THREE.MeshStandardMaterial({
    color: 0x121416,
    roughness: .22,
    metalness: .28,
    envMapIntensity: 1.0,
  });

  const livingBronze = new THREE.MeshStandardMaterial({
    color: 0x947047,
    roughness: .32,
    metalness: .68,
    envMapIntensity: .96,
  });

  const livingRug = new THREE.MeshStandardMaterial({
    color: 0x77685c,
    roughness: .97,
    metalness: 0,
  });

  const livingGlow = new THREE.MeshStandardMaterial({
    color: 0xffd3a0,
    emissive: 0xffae62,
    emissiveIntensity: 1.22,
    roughness: .48,
  });

  const livingGreen = new THREE.MeshStandardMaterial({
    color: 0x294934,
    roughness: .94,
    metalness: 0,
  });

  roomShell(living,-3.65,.48,1.25,4.2,4.8,{backDoor:{center:-2.12,width:.90}});

  // ============================================================
  // FLOOR
  // ============================================================

  box(
    living,
    [4.12,.025,4.68],
    [-3.65,.535,1.25],
    floorMat
  );

  // ============================================================
  // PREMIUM TV FEATURE WALL
  // ============================================================

  // Large stone backdrop.
  box(
    living,
    [3.0,2.18,.11],
    [-3.95,1.72,-1.02],
    livingStone
  );

  // Dark walnut feature side.
  box(
    living,
    [.66,2.13,.08],
    [-5.16,1.72,-.94],
    livingDarkWood
  );

  // Vertical fluting.
  for (const x of [-5.39,-5.27,-5.15,-5.03,-4.91]) {
    box(
      living,
      [.035,1.98,.05],
      [x,1.72,-.88],
      livingWalnut
    );
  }

  // Horizontal bronze/stone accent.
  box(
    living,
    [2.34,.055,.05],
    [-3.86,2.38,-.90],
    livingBronze
  );

  // TV frame.
  box(
    living,
    [2.0,1.12,.04],
    [-3.88,1.72,-.88],
    livingBronze
  );

  box(
    living,
    [1.88,1.0,.025],
    [-3.88,1.72,-.845],
    livingCharcoal
  );

  // Floating console.
  box(
    living,
    [2.38,.28,.42],
    [-3.88,.78,-.71],
    livingDarkWood
  );

  box(
    living,
    [2.48,.05,.46],
    [-3.88,.96,-.71],
    livingStone2
  );

  // Under-console light.
  box(
    living,
    [2.0,.02,.022],
    [-3.88,.585,-.49],
    livingGlow
  );

  // Small decor.
  cylinder(
    living,
    .08,
    .21,
    [-4.65,1.12,-.62],
    livingBronze
  );

  const tvDecor = new THREE.Mesh(
    new THREE.SphereGeometry(.12,18,12),
    livingStone
  );

  tvDecor.position.set(-4.65,1.27,-.62);
  living.add(tvDecor);


  // ============================================================
  // U-SHAPED SECTIONAL SOFA
  //
  // TV is in front.
  // Back sofa forms main long section.
  // Left + right returns create proper U shape.
  // Center remains open for table and visual circulation.
  // ============================================================

  const sofaBaseY = .66;
  const sofaSeatY = .84;
  const sofaBackY = 1.20;


  // ------------------------------------------------------------
  // BACK / MAIN SOFA
  // ------------------------------------------------------------

  box(
    living,
    [3.05,.14,.78],
    [-4.05,sofaBaseY,2.28],
    livingDarkWood
  );

  box(
    living,
    [2.92,.22,.68],
    [-4.05,sofaSeatY,2.22],
    livingCream
  );

  box(
    living,
    [2.86,.48,.16],
    [-4.05,1.17,2.50],
    livingCream
  );


  // ------------------------------------------------------------
  // LEFT RETURN
  // ------------------------------------------------------------

  box(
    living,
    [.82,.14,1.72],
    [-5.28,sofaBaseY,1.45],
    livingDarkWood
  );

  box(
    living,
    [.72,.22,1.60],
    [-5.28,sofaSeatY,1.44],
    livingCream
  );

  box(
    living,
    [.15,.46,1.42],
    [-5.58,1.15,1.48],
    livingCream
  );


  // ------------------------------------------------------------
  // RIGHT RETURN
  // ------------------------------------------------------------

  box(
    living,
    [.82,.14,1.58],
    [-2.82,sofaBaseY,1.52],
    livingDarkWood
  );

  box(
    living,
    [.72,.22,1.46],
    [-2.82,sofaSeatY,1.52],
    livingCream
  );

  box(
    living,
    [.15,.46,1.30],
    [-2.52,1.15,1.56],
    livingCream
  );


  // ------------------------------------------------------------
  // END ARMS
  // ------------------------------------------------------------

  box(
    living,
    [.18,.50,.70],
    [-5.28,.99,.62],
    livingCream
  );

  box(
    living,
    [.18,.50,.70],
    [-2.82,.99,.74],
    livingCream
  );


  // ------------------------------------------------------------
  // SOFA BACK CUSHIONS
  // ------------------------------------------------------------

  for (const x of [-4.82,-4.05,-3.28]) {
    box(
      living,
      [.66,.42,.12],
      [x,1.25,2.39],
      livingCream
    );
  }

  for (const z of [.95,1.48,2.0]) {
    box(
      living,
      [.12,.42,.48],
      [-5.45,1.24,z],
      livingCream
    );
  }

  for (const z of [1.0,1.55,2.05]) {
    box(
      living,
      [.12,.42,.46],
      [-2.65,1.24,z],
      livingCream
    );
  }


  // ------------------------------------------------------------
  // SOFT THROW PILLOWS
  // ------------------------------------------------------------

  const addLivingPillow = (
    x:number,
    y:number,
    z:number,
    sx:number,
    sy:number,
    sz:number,
    mat:THREE.Material
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(.5,18,12),
      mat
    );

    mesh.scale.set(sx,sy,sz);
    mesh.position.set(x,y,z);
    mesh.castShadow = true;
    living.add(mesh);
  };

  addLivingPillow(-4.72,1.16,2.12,.38,.28,.14,livingTaupe);
  addLivingPillow(-3.48,1.16,2.12,.38,.28,.14,livingTaupe);
  addLivingPillow(-5.18,1.13,1.30,.35,.26,.13,livingTaupe);
  addLivingPillow(-2.90,1.13,1.38,.35,.26,.13,livingTaupe);


  // ============================================================
  // LARGE CENTRAL RUG
  // ============================================================

  box(
    living,
    [2.22,.025,1.88],
    [-4.05,.56,1.30],
    livingRug
  );


  // ============================================================
  // PREMIUM NESTED COFFEE TABLES
  // ============================================================

  const mainCoffee = new THREE.Mesh(
    new THREE.CylinderGeometry(.49,.49,.095,36),
    livingStone
  );

  mainCoffee.scale.set(1.28,1,.78);
  mainCoffee.position.set(-4.08,.74,1.28);
  mainCoffee.castShadow = true;
  mainCoffee.receiveShadow = true;

  living.add(mainCoffee);

  cylinder(
    living,
    .19,
    .25,
    [-4.08,.61,1.28],
    livingCharcoal
  );

  const smallCoffee = new THREE.Mesh(
    new THREE.CylinderGeometry(.29,.29,.07,32),
    livingWalnut
  );

  smallCoffee.position.set(-3.38,.72,1.02);
  smallCoffee.castShadow = true;
  living.add(smallCoffee);

  cylinder(
    living,
    .045,
    .28,
    [-3.38,.57,1.02],
    livingBronze
  );


  // ============================================================
  // SIDE TABLE + FLOOR LAMP
  // ============================================================

  const sideTable = new THREE.Mesh(
    new THREE.CylinderGeometry(.25,.25,.06,30),
    livingStone2
  );

  sideTable.position.set(-5.55,.77,2.55);
  sideTable.castShadow = true;
  living.add(sideTable);

  cylinder(
    living,
    .04,
    .32,
    [-5.55,.59,2.55],
    livingBronze
  );

  cylinder(
    living,
    .018,
    .98,
    [-5.72,1.12,2.62],
    livingBronze
  );

  const floorLampGlobe = new THREE.Mesh(
    new THREE.SphereGeometry(.09,18,12),
    livingGlow
  );

  floorLampGlobe.position.set(-5.72,1.64,2.62);
  living.add(floorLampGlobe);


  // ============================================================
  // PREMIUM PLANT
  // ============================================================

  cylinder(
    living,
    .18,
    .34,
    [-5.55,.72,-.36],
    livingStone2
  );

  cylinder(
    living,
    .018,
    .77,
    [-5.55,1.27,-.36],
    livingBronze
  );

  for (const [x,y,z,sx,sy,sz] of [
    [-5.70,1.57,-.37,.27,.48,.20],
    [-5.46,1.68,-.35,.31,.56,.22],
    [-5.60,1.87,-.36,.27,.50,.19],
    [-5.43,2.03,-.35,.21,.39,.16],
  ] as [number,number,number,number,number,number][]) {

    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(.5,16,12),
      livingGreen
    );

    leaf.scale.set(sx,sy,sz);
    leaf.position.set(x,y,z);
    living.add(leaf);
  }



  // ============================================================
  // PREMIUM RIGHT ENTRY WALL V9
  //
  // The main door enters directly into the living hall.
  // This right-side wall therefore works as a compact,
  // architectural arrival/storage feature ? not another living room.
  // ============================================================

  const foyerWood = new THREE.MeshStandardMaterial({
    color: 0x493023,
    roughness: .47,
    metalness: .025,
    envMapIntensity: .74,
  });

  const foyerWoodDark = new THREE.MeshStandardMaterial({
    color: 0x2e201a,
    roughness: .46,
    metalness: .025,
    envMapIntensity: .76,
  });

  const foyerStone = new THREE.MeshStandardMaterial({
    color: 0xc7b9a8,
    roughness: .61,
    metalness: .015,
    envMapIntensity: .66,
  });

  const foyerNiche = new THREE.MeshStandardMaterial({
    color: 0x776457,
    roughness: .66,
    metalness: .012,
    envMapIntensity: .57,
  });


  // ------------------------------------------------------------
  // FULL HEIGHT BUILT-IN CABINET
  // ------------------------------------------------------------

  // Main cabinet body.
  box(
    living,
    [2.18,2.18,.34],
    [1.42,1.63,-.31],
    foyerWoodDark
  );

  // Four vertical door panels.
  for (const x of [.67,1.17,1.67,2.17]) {

    box(
      living,
      [.43,1.91,.035],
      [x,1.67,-.115],
      foyerWood
    );

    // thin reveal between doors
    box(
      living,
      [.012,1.78,.016],
      [x+.225,1.67,-.09],
      foyerWoodDark
    );

  }


  // ------------------------------------------------------------
  // CENTRAL DISPLAY NICHE
  // ------------------------------------------------------------

  box(
    living,
    [.96,.80,.06],
    [1.42,1.75,-.065],
    foyerStone
  );

  box(
    living,
    [.82,.66,.032],
    [1.42,1.75,-.022],
    foyerNiche
  );

  // concealed warm LED
  box(
    living,
    [.70,.018,.022],
    [1.42,2.055,.015],
    livingGlow
  );


  // ------------------------------------------------------------
  // SMALL SCULPTURE / DECOR
  // ------------------------------------------------------------

  cylinder(
    living,
    .075,
    .18,
    [1.42,1.52,.025],
    livingBronze
  );

  const foyerSculpture = new THREE.Mesh(
    new THREE.SphereGeometry(.105,18,12),
    livingStone
  );

  foyerSculpture.scale.set(.72,1,.72);
  foyerSculpture.position.set(
    1.42,
    1.68,
    .025
  );

  living.add(foyerSculpture);


  // ------------------------------------------------------------
  // BRASS HANDLES
  // ------------------------------------------------------------

  for (const x of [.67,1.17,1.67,2.17]) {
    box(
      living,
      [.018,.28,.018],
      [x+.13,1.59,-.065],
      livingBronze
    );
  }


  // ------------------------------------------------------------
  // FLOATING BOTTOM STORAGE
  // ------------------------------------------------------------

  box(
    living,
    [1.94,.25,.36],
    [1.42,.69,-.22],
    foyerWood
  );

  box(
    living,
    [1.55,.018,.02],
    [1.42,.535,-.025],
    livingGlow
  );


  // ------------------------------------------------------------
  // ARCHITECTURAL FRAME
  // ------------------------------------------------------------

  box(
    living,
    [2.34,.085,.39],
    [1.42,2.77,-.30],
    livingDarkWood
  );

  // warm vertical edge light
  box(
    living,
    [.024,1.90,.024],
    [2.55,1.67,-.07],
    livingGlow
  );


  // ------------------------------------------------------------
  // ENTRY FLOOR INLAY
  //
  // Narrow stone strip only.
  // It does not become a giant raised tiled platform.
  // ------------------------------------------------------------

  const foyerFloorStone = new THREE.MeshStandardMaterial({
    color: 0xbcae9d,
    roughness: .69,
    metalness: .012,
    envMapIntensity: .61,
  });

  const foyerFloorJoint = new THREE.MeshStandardMaterial({
    color: 0x978a7d,
    roughness: .8,
    metalness: 0,
    envMapIntensity: .43,
  });

  box(
    living,
    [1.48,.026,2.70],
    [.98,.54,1.36],
    foyerFloorStone
  );

  // subtle large-format slab joints
  box(
    living,
    [.008,.003,2.58],
    [.98,.556,1.36],
    foyerFloorJoint
  );

  for (const z of [.70,1.55,2.40]) {
    box(
      living,
      [1.38,.003,.008],
      [.98,.556,z],
      foyerFloorJoint
    );
  }

  // slim brass transition
  box(
    living,
    [.025,.008,2.67],
    [.225,.558,1.36],
    livingBronze
  );


  // ------------------------------------------------------------
  // SMALL CORNER PLANT
  // ------------------------------------------------------------

  cylinder(
    living,
    .16,
    .30,
    [2.50,.69,2.42],
    livingStone2
  );

  cylinder(
    living,
    .015,
    .62,
    [2.50,1.15,2.42],
    livingBronze
  );

  for (const [x,y,z,sx,sy,sz] of [
    [2.36,1.43,2.40,.23,.40,.18],
    [2.58,1.52,2.43,.27,.48,.20],
    [2.45,1.68,2.40,.23,.42,.17],
  ] as [number,number,number,number,number,number][]) {

    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(.5,16,12),
      livingGreen
    );

    leaf.scale.set(sx,sy,sz);
    leaf.position.set(x,y,z);
    living.add(leaf);
  }


  // ============================================================
  // EXTRA LIVING-ROOM PREMIUM DETAILS
  // ============================================================

  // Soft panel behind the sofa on the blank left wall.
  box(
    living,
    [2.45,1.20,.045],
    [-4.25,1.82,3.54],
    livingStone2
  );

  // Three slim decorative wall battens.
  for (const x of [-4.95,-4.25,-3.55]) {
    box(
      living,
      [.035,1.05,.035],
      [x,1.82,3.49],
      livingBronze
    );
  }

  // Warm line light above the sofa.
  box(
    living,
    [2.20,.018,.020],
    [-4.25,2.46,3.47],
    livingGlow
  );



  // ============================================================


  // ============================================================
  // GROUND FLOOR GUEST SUITE V14
  //
  // TV-side open doorway -> premium bedroom -> attached washroom.
  // Uses the area freed by removing the old indoor staircase.
  // ============================================================

  const groundGuestSuite =
    new THREE.Group();

  groundGuestSuite.name =
    'ground-floor-guest-suite-v14';


  // ------------------------------------------------------------
  // MATERIALS
  // ------------------------------------------------------------

  const guestWall =
    new THREE.MeshStandardMaterial({
      color: 0xd4c8bb,
      roughness: .72,
      metalness: .01,
      envMapIntensity: .58,
    });


  const guestStone =
    new THREE.MeshStandardMaterial({
      color: 0xb8aa9a,
      roughness: .58,
      metalness: .015,
      envMapIntensity: .68,
    });


  const guestWood =
    new THREE.MeshStandardMaterial({
      color: 0x4b2e20,
      roughness: .46,
      metalness: .025,
      envMapIntensity: .76,
    });


  const guestDarkWood =
    new THREE.MeshStandardMaterial({
      color: 0x2d1c16,
      roughness: .44,
      metalness: .03,
      envMapIntensity: .78,
    });


  const guestFabric =
    new THREE.MeshStandardMaterial({
      color: 0xd6cbc0,
      roughness: .91,
      metalness: 0,
      envMapIntensity: .36,
    });


  const guestAccent =
    new THREE.MeshStandardMaterial({
      color: 0x8b776a,
      roughness: .87,
      metalness: 0,
      envMapIntensity: .38,
    });


  // Warm ivory bed linen — visually distinct from the plain `white` so the made bed reads as
  // bedding (duvet/pillows), never as a bare slab.
  const guestLinen =
    new THREE.MeshStandardMaterial({
      color: 0xe9dfcf,
      roughness: .88,
      metalness: 0,
      envMapIntensity: .42,
    });


  const guestBronze =
    new THREE.MeshStandardMaterial({
      color: 0x987044,
      roughness: .30,
      metalness: .70,
      envMapIntensity: .98,
    });


  const guestGlow =
    new THREE.MeshStandardMaterial({
      color: 0xffd4a2,
      emissive: 0xffad62,
      emissiveIntensity: 1.2,
      roughness: .46,
    });


  const guestTile =
    new THREE.MeshStandardMaterial({
      color: 0xc5b9ac,
      roughness: .68,
      metalness: .01,
      envMapIntensity: .60,
    });


  // ============================================================
  // PREMIUM GUEST BEDROOM ENVELOPE
  //
  // A large ground-floor guest suite filling the west-back quadrant:
  // interior x[-5.30,-0.66], z[-1.27,-4.05]. The living hall's back wall
  // (with the door opening at x=-2.12) is the suite's front, so a hinged
  // door — driven by the director — seals it from the hall until arrival.
  // The ensuite is carved into the NW corner so it stays fully inside the
  // villa footprint (no volume ever pokes past the exterior shell).
  // ============================================================

  // Marble entry threshold under the doorway.
  box(groundGuestSuite, [1.02, .06, .5], [-2.12, .50, -1.32], guestStone);

  // ------------------------------------------------------------
  // PERIMETER WALLS  (height 2.55, mid y 1.78, top ~3.05)
  // ------------------------------------------------------------
  box(groundGuestSuite, [.12, 2.55, 2.86], [-5.36, 1.78, -2.66], guestWall); // west
  box(groundGuestSuite, [.12, 2.55, 2.86], [-0.60, 1.78, -2.66], guestWall); // east
  box(groundGuestSuite, [4.82, 2.55, .12], [-2.98, 1.78, -4.11], guestWall); // north (behind bed)
  // Front-wall EAST sliver — the living hall wall already occludes x[-5.75,-1.55];
  // this seals the remaining strip east of it so the room is hidden with the door shut.
  box(groundGuestSuite, [.89, 2.55, .12], [-1.105, 1.78, -1.20], guestWall);
  // Hall-side walnut panelling over the sliver — replaces the raw speckled-concrete patch that
  // showed beside the hall/kitchen doorway (finished material, matches the palette).
  box(groundGuestSuite, [.89, 2.30, .03], [-1.105, 1.65, -1.13], guestWood);

  // ------------------------------------------------------------
  // PREMIUM DOOR FRAME (the hall-side opening, x[-2.57,-1.67])
  // ------------------------------------------------------------
  box(groundGuestSuite, [.10, 2.28, .14], [-2.63, 1.60, -1.20], guestDarkWood);
  box(groundGuestSuite, [.10, 2.28, .14], [-1.61, 1.60, -1.20], guestDarkWood);
  box(groundGuestSuite, [1.12, .12, .14], [-2.12, 2.70, -1.20], guestDarkWood);
  box(groundGuestSuite, [.022, 2.06, .022], [-2.57, 1.58, -1.12], guestBronze);
  box(groundGuestSuite, [.022, 2.06, .022], [-1.67, 1.58, -1.12], guestBronze);

  // ------------------------------------------------------------
  // BEDROOM DOOR  (LIVE PIVOT — hinged on the west jamb, CLOSED by default;
  // the director swings it open on approach and shut on exit.)
  // ------------------------------------------------------------
  const guestDoorPivot = new THREE.Group();
  guestDoorPivot.position.set(-2.57, .50, -1.20);
  guestDoorPivot.rotation.y = 0; // CLOSED — director animates
  const guestDoor = new THREE.Mesh(new THREE.BoxGeometry(.90, 2.05, .055), guestWood);
  guestDoor.position.set(.45, 1.025, 0);
  guestDoor.castShadow = true;
  guestDoor.receiveShadow = true;
  guestDoorPivot.add(guestDoor);
  // recessed panel + bronze pull
  box(guestDoorPivot, [.56, 1.5, .015], [.45, 1.03, .035], guestDarkWood);
  const guestDoorPull = new THREE.Mesh(new THREE.BoxGeometry(.025, .34, .025), guestBronze);
  guestDoorPull.position.set(.80, 1.02, .05);
  guestDoorPivot.add(guestDoorPull);
  groundGuestSuite.add(guestDoorPivot);

  // ============================================================
  // FLOOR + RUG
  // ============================================================
  box(groundGuestSuite, [4.70, .08, 2.86], [-2.98, .48, -2.66], floorMat);
  box(groundGuestSuite, [3.00, .025, 2.30], [-2.45, .545, -2.94], guestAccent); // large rug

  // ============================================================
  // QUEEN BED (centre x -2.35, head to the north wall) — a clearly MADE bed:
  // frame → mattress → full duvet with a white turned-down sheet → four pillows → folded throw.
  // Narrower than the old king so the nightstands flank OUTSIDE the bed footprint.
  // ============================================================
  box(groundGuestSuite, [1.80, .18, 1.98], [-2.35, .66, -3.00], guestDarkWood); // floating plinth
  box(groundGuestSuite, [1.72, .26, 1.90], [-2.35, .86, -2.98], guestFabric);    // upholstered base
  box(groundGuestSuite, [1.64, .20, 1.74], [-2.35, 1.08, -2.92], white);         // mattress
  box(groundGuestSuite, [1.70, .10, 1.16], [-2.35, 1.205, -2.72], guestLinen);   // duvet (covers 2/3)
  box(groundGuestSuite, [1.66, .045, .30], [-2.35, 1.26, -3.14], white);         // turned-down sheet
  box(groundGuestSuite, [1.58, .06, .48], [-2.35, 1.245, -2.36], guestAccent);   // folded throw at foot
  for (const x of [-2.73, -1.97]) box(groundGuestSuite, [.60, .20, .38], [x, 1.26, -3.44], guestLinen);  // back pillows
  for (const x of [-2.70, -2.00]) box(groundGuestSuite, [.50, .14, .30], [x, 1.24, -3.20], guestFabric); // front pillows

  // ============================================================
  // FEATURE WALL (north, behind the bed — the room's visual hero)
  // upholstered headboard + walnut slats + stone centre + bronze + LED cove
  // ============================================================
  box(groundGuestSuite, [2.86, 2.08, .06], [-2.35, 1.68, -3.99], guestDarkWood);   // walnut backing
  box(groundGuestSuite, [2.30, 1.20, .16], [-2.35, 1.64, -3.88], guestFabric);     // padded headboard
  for (const x of [-3.10, -2.78, -2.46, -2.14, -1.82, -1.50])                      // headboard channels
    box(groundGuestSuite, [.24, .96, .05], [x, 1.66, -3.83], guestFabric);
  box(groundGuestSuite, [1.24, 1.66, .04], [-2.35, 1.74, -3.95], guestStone);      // stone centre inset
  for (const x of [-3.60, -3.40, -3.20, -1.50, -1.30, -1.10])                      // walnut vertical slats
    box(groundGuestSuite, [.09, 1.98, .05], [x, 1.74, -3.96], guestWood);
  for (const x of [-3.70, -1.00]) box(groundGuestSuite, [.03, 1.94, .03], [x, 1.74, -3.94], guestBronze); // bronze trims
  box(groundGuestSuite, [2.66, .02, .02], [-2.35, 2.66, -3.90], guestGlow);        // concealed warm LED

  // ============================================================
  // NIGHTSTANDS + LAMPS — freestanding, FLANKING the bed (never on it):
  // bed now spans x[-3.25,-1.45]; stands sit clear at -3.62 / -1.08.
  // ============================================================
  for (const x of [-3.62, -1.08]) {
    box(groundGuestSuite, [.30, .04, .30], [x, .52, -3.62], guestDarkWood);   // plinth foot
    box(groundGuestSuite, [.42, .44, .40], [x, .74, -3.62], guestDarkWood);   // body
    box(groundGuestSuite, [.46, .05, .44], [x, .985, -3.62], guestWood);      // top
    box(groundGuestSuite, [.02, .26, .02], [x + .17, .82, -3.44], guestBronze); // drawer pull
    cylinder(groundGuestSuite, .035, .18, [x, 1.10, -3.62], guestBronze);     // lamp stem
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(.085, 16, 12), guestGlow);
    lamp.position.set(x, 1.27, -3.62);
    groundGuestSuite.add(lamp);
  }

  // ============================================================
  // WARDROBE (east wall) — walnut, bronze handles, one mirrored door
  // ============================================================
  box(groundGuestSuite, [.52, 2.30, .94], [-.94, 1.65, -2.87], guestDarkWood); // body (shorter — clears the nightstand)
  for (const z of [-3.10, -2.64])
    box(groundGuestSuite, [.03, 2.06, .40], [-.68, 1.65, z], guestWood);        // door faces
  box(groundGuestSuite, [.02, 1.92, .38], [-.665, 1.66, -2.64], mirrorPanel);   // one mirrored section (dim interior)
  for (const z of [-3.00, -2.54])
    box(groundGuestSuite, [.02, .34, .02], [-.64, 1.55, z], guestBronze);       // slim handles

  // Curtained window on the east wall (revealed by the shorter wardrobe).
  box(groundGuestSuite, [.04, 1.36, .84], [-.68, 1.72, -1.90], guestDarkWood);  // frame
  box(groundGuestSuite, [.03, 1.24, .72], [-.70, 1.72, -1.90], interiorGlass);  // pane
  box(groundGuestSuite, [.06, .10, 1.10], [-.74, 2.46, -1.90], guestDarkWood);  // pelmet
  for (const z of [-1.48, -2.32])
    box(groundGuestSuite, [.06, 1.78, .28], [-.74, 1.52, z], guestLinen);       // curtain panels

  // ============================================================
  // DRESSING NOOK + BENCH + PLANT + ART (west / south-west)
  // ============================================================
  // Foot-of-bed bench.
  box(groundGuestSuite, [1.30, .16, .44], [-2.35, .62, -1.92], guestFabric);
  for (const x of [-2.86, -1.84]) for (const z of [-2.06, -1.78]) box(groundGuestSuite, [.05, .40, .05], [x, .42, z], guestBronze);
  // Dressing console against the west wall.
  box(groundGuestSuite, [.44, .06, 1.10], [-5.06, .88, -1.95], guestWood);
  box(groundGuestSuite, [.06, .80, 1.00], [-5.24, .48, -1.95], guestDarkWood);
  box(groundGuestSuite, [.03, 1.50, .70], [-5.27, 1.36, -1.95], mirrorPanel);  // tall dressing mirror (dim interior)
  box(groundGuestSuite, [.40, .40, .40], [-4.74, .44, -2.00], guestFabric); // stool
  // Small, correctly-scaled potted plant in the SW corner — clear of the mirror and camera.
  cylinder(groundGuestSuite, .10, .18, [-5.05, .60, -1.38], guestDarkWood);
  const guestPlant = new THREE.Mesh(new THREE.SphereGeometry(.15, 12, 10), livingGreen);
  guestPlant.scale.set(1, 1.3, 1);
  guestPlant.position.set(-5.05, .88, -1.38);
  groundGuestSuite.add(guestPlant);
  // Framed art on the east front-wall sliver.
  box(groundGuestSuite, [.66, .92, .03], [-1.10, 1.72, -1.26], guestBronze);
  box(groundGuestSuite, [.58, .84, .02], [-1.10, 1.72, -1.24], art);

  // ============================================================
  // PREMIUM FALSE CEILING (recessed centre + warm cove + downlights)
  // ============================================================
  box(groundGuestSuite, [4.58, .05, 2.74], [-2.98, 3.03, -2.66], guestWall);   // ceiling slab
  box(groundGuestSuite, [3.40, .05, 1.90], [-2.60, 2.94, -2.90], guestStone);  // recessed centre tray
  box(groundGuestSuite, [3.30, .02, .02], [-2.60, 2.86, -1.98], guestGlow);    // cove LED (front)
  box(groundGuestSuite, [3.30, .02, .02], [-2.60, 2.86, -3.82], guestGlow);    // cove LED (back)
  box(groundGuestSuite, [.02, .02, 1.80], [-4.28, 2.86, -2.90], guestGlow);    // cove LED (west)
  box(groundGuestSuite, [.02, .02, 1.80], [-0.92, 2.86, -2.90], guestGlow);    // cove LED (east)
  ceilingLight(groundGuestSuite, -2.35, 2.96, -2.55, .13);
  ceilingLight(groundGuestSuite, -1.30, 2.96, -2.10, .11);
  ceilingLight(groundGuestSuite, -3.40, 2.96, -2.10, .11);

  // Warm bedroom fill light.
  const guestKey = new THREE.PointLight(0xffc38a, 1.15, 5.2, 2);
  guestKey.position.set(-2.4, 2.42, -2.7);
  guestKey.castShadow = false;
  groundGuestSuite.add(guestKey);

  // ============================================================
  // ATTACHED ENSUITE  (NW corner, x[-5.30,-3.80], z[-2.60,-4.05])
  // ============================================================
  const groundGuestBath = new THREE.Group();
  groundGuestBath.name = 'ground-floor-guest-ensuite-v15';

  // ENLARGED footprint: x[-5.30,-3.80] × z[-2.20,-4.05] (was a cramped 1.5×1.45 box with the WC
  // straight at the door). Entered through its own hinged door from INSIDE the bedroom.
  // Layout: vanity + mirror on the WEST wall (the hero straight ahead from the door), glass shower
  // in the NW corner, WC against the EAST wall behind a half-screen — never at/facing the entry.
  box(groundGuestBath, [.11, 2.55, 1.85], [-3.80, 1.78, -3.125], guestWall);     // east wall
  box(groundGuestBath, [.80, 2.55, .11], [-4.90, 1.78, -2.20], guestWall);       // south wall, west of door
  box(groundGuestBath, [.70, .70, .11], [-4.15, 2.62, -2.20], guestWall);        // header over door (opening h 2.32)

  // Tiled floor + tiled wall accents.
  box(groundGuestBath, [1.50, .06, 1.85], [-4.55, .505, -3.125], guestTile);
  box(groundGuestBath, [.03, 1.8, 1.80], [-5.28, 1.5, -3.125], guestTile);       // west wall tile
  box(groundGuestBath, [1.46, 1.8, .03], [-4.55, 1.5, -4.02], guestTile);        // north wall tile

  // ------------------------------------------------------------
  // ENSUITE DOOR (LIVE PIVOT — hinged on the east jamb, swings into the bath)
  // ------------------------------------------------------------
  const bathDoorPivot = new THREE.Group();
  bathDoorPivot.position.set(-3.80, .50, -2.20);
  bathDoorPivot.rotation.y = 0; // CLOSED — director animates
  const bathDoor = new THREE.Mesh(new THREE.BoxGeometry(.70, 2.02, .05), guestDarkWood);
  bathDoor.position.set(-.35, 1.01, 0);
  bathDoor.castShadow = true;
  bathDoorPivot.add(bathDoor);
  const bathDoorPull = new THREE.Mesh(new THREE.BoxGeometry(.022, .30, .022), guestBronze);
  bathDoorPull.position.set(-.62, 1.02, .04);
  bathDoorPivot.add(bathDoorPull);
  groundGuestBath.add(bathDoorPivot);

  // ------------------------------------------------------------
  // FLOATING VANITY + MIRROR (west wall — the hero view from the door)
  // ------------------------------------------------------------
  box(groundGuestBath, [.42, .34, .90], [-5.06, .84, -2.90], guestWood);
  box(groundGuestBath, [.48, .05, .96], [-5.05, 1.035, -2.90], white);
  box(groundGuestBath, [.46, .006, .90], [-5.05, 1.062, -2.90], dark);       // shadow line seats the basin
  const guestSink = new THREE.Mesh(new THREE.CylinderGeometry(.15, .12, .09, 20), white);
  guestSink.position.set(-5.04, 1.11, -2.90);
  groundGuestBath.add(guestSink);
  cylinder(groundGuestBath, .018, .16, [-5.14, 1.16, -2.90], guestBronze); // tap
  box(groundGuestBath, [.03, .80, .66], [-5.27, 1.55, -2.90], mirrorPanel); // dim interior mirror, correct height
  box(groundGuestBath, [.02, .02, .58], [-5.23, 2.00, -2.90], guestGlow);  // warm mirror light
  // Towel rail + small shelf on the south wall.
  box(groundGuestBath, [.40, .025, .025], [-4.90, 1.52, -2.30], guestBronze);
  box(groundGuestBath, [.40, .03, .16], [-4.90, 1.88, -2.32], guestWood);

  // ------------------------------------------------------------
  // TOILET (south-east, clear of the door swing)
  // ------------------------------------------------------------
  // WC against the EAST wall, behind a tiled half-screen — away from and never facing the door.
  box(groundGuestBath, [.42, 1.35, .06], [-4.02, 1.17, -3.06], guestWall);        // half-screen
  box(groundGuestBath, [.15, .42, .34], [-3.89, 1.02, -3.42], white);             // cistern on the wall
  box(groundGuestBath, [.34, .30, .42], [-4.06, .68, -3.42], white);              // bowl
  box(groundGuestBath, [.36, .035, .44], [-4.06, .855, -3.42], white);            // seat

  // ------------------------------------------------------------
  // GLASS SHOWER ENCLOSURE (north-west corner, slim bronze frame)
  // ------------------------------------------------------------
  box(groundGuestBath, [.80, .05, .72], [-4.90, .525, -3.66], guestTile);         // tray
  box(groundGuestBath, [.03, 1.95, .74], [-4.49, 1.50, -3.66], interiorGlass);    // glass side
  box(groundGuestBath, [.82, 1.95, .03], [-4.90, 1.50, -3.28], interiorGlass);    // glass front
  box(groundGuestBath, [.025, 1.95, .025], [-4.49, 1.50, -3.295], guestBronze);   // slim corner frame
  cylinder(groundGuestBath, .05, .05, [-5.06, 2.30, -3.80], guestBronze);         // rain head arm
  box(groundGuestBath, [.20, .04, .20], [-5.06, 2.24, -3.80], guestBronze);       // rain head
  box(groundGuestBath, [.04, .5, .04], [-5.20, 1.30, -3.80], guestBronze);        // riser rail

  // Ensuite ceiling + downlight + warm fill.
  box(groundGuestBath, [1.46, .05, 1.82], [-4.55, 3.00, -3.125], guestWall);
  ceilingLight(groundGuestBath, -4.55, 2.92, -3.05, .12);
  const guestBathLight = new THREE.PointLight(0xffc38a, .75, 3.5, 2);
  guestBathLight.position.set(-4.55, 2.5, -3.0);
  groundGuestBath.add(guestBathLight);

  groundGuestSuite.add(groundGuestBath);

  // The suite lives inside the living-hall group, so it inherits the interior-tour visibility and is
  // physically occluded by the hall wall + the (closed) bedroom door until the camera arrives.
  living.add(
    groundGuestSuite
  );

  // CEILING / COVE
  // ============================================================

  box(
    living,
    [3.05,.09,.18],
    [-3.98,3.00,-.81],
    livingDarkWood
  );

  box(
    living,
    [2.55,.02,.024],
    [-3.98,2.94,-.67],
    livingGlow
  );

  // Secondary ceiling strip over sofa zone.
  box(
    living,
    [2.9,.065,.12],
    [-4.05,3.02,2.23],
    livingDarkWood
  );

  box(
    living,
    [2.35,.018,.022],
    [-4.05,2.97,2.20],
    livingGlow
  );


  // ============================================================
  // LIGHTING
  // ============================================================

  ceilingLight(living,-4.7,2.92,.6,.16);
  ceilingLight(living,-3.45,2.92,.6,.16);
  ceilingLight(living,-4.65,2.92,2.1,.15);
  ceilingLight(living,-3.35,2.92,2.1,.15);

  const livingKey = new THREE.PointLight(
    0xffc38a,
    2.2,
    5.0,
    2
  );

  livingKey.position.set(-4.05,2.35,.7);
  livingKey.castShadow = false;

  const livingFill = new THREE.PointLight(
    0xffddb3,
    1.45,
    4.2,
    2
  );

  livingFill.position.set(-4.05,2.15,2.1);
  livingFill.castShadow = false;

  living.add(livingKey,livingFill);

  // ============================================================
  // PREMIUM OPEN PLAN DINING V11
  //
  // Dining and kitchen now visually behave as one open-plan zone.
  // The old narrow rear doorway has been expanded almost wall-to-wall.
  // ============================================================

  const diningWalnut = new THREE.MeshStandardMaterial({
    color: 0x442a20,
    roughness: .45,
    metalness: .025,
    envMapIntensity: .76,
  });

  const diningWalnutDark = new THREE.MeshStandardMaterial({
    color: 0x281a16,
    roughness: .43,
    metalness: .03,
    envMapIntensity: .78,
  });

  const diningStone = new THREE.MeshStandardMaterial({
    color: 0xd0c4b5,
    roughness: .54,
    metalness: .015,
    envMapIntensity: .7,
  });

  const diningFabric = new THREE.MeshStandardMaterial({
    color: 0xcac0b5,
    roughness: .9,
    metalness: 0,
    envMapIntensity: .36,
  });

  const diningFabricAccent = new THREE.MeshStandardMaterial({
    color: 0x817167,
    roughness: .88,
    metalness: 0,
    envMapIntensity: .38,
  });

  const diningBronze = new THREE.MeshStandardMaterial({
    color: 0x987246,
    roughness: .31,
    metalness: .7,
    envMapIntensity: .98,
  });

  const diningRug = new THREE.MeshStandardMaterial({
    color: 0x75685d,
    roughness: .98,
    metalness: 0,
  });

  const diningGlow = new THREE.MeshStandardMaterial({
    color: 0xffd3a2,
    emissive: 0xffae62,
    emissiveIntensity: 1.25,
    roughness: .48,
  });


  // Materials shared by the kitchen upgrade below.
  const kitchenWalnut = new THREE.MeshStandardMaterial({
    color: 0x503426,
    roughness: .44,
    metalness: .025,
    envMapIntensity: .78,
  });

  const kitchenWalnutDark = new THREE.MeshStandardMaterial({
    color: 0x2c1f1a,
    roughness: .42,
    metalness: .035,
    envMapIntensity: .8,
  });

  const kitchenTaupe = new THREE.MeshStandardMaterial({
    color: 0x706057,
    roughness: .56,
    metalness: .02,
    envMapIntensity: .66,
  });

  const kitchenQuartz = new THREE.MeshStandardMaterial({
    color: 0xd7cec2,
    roughness: .38,
    metalness: .015,
    envMapIntensity: .8,
  });

  const kitchenFloorStone = new THREE.MeshStandardMaterial({
    color: 0xaaa095,
    roughness: .72,
    metalness: .01,
    envMapIntensity: .56,
  });

  const kitchenSteel = new THREE.MeshStandardMaterial({
    color: 0x55585a,
    roughness: .29,
    metalness: .72,
    envMapIntensity: .88,
  });


  const dining = new THREE.Group();
  dining.name = 'premium-open-plan-dining-v11';


  // ------------------------------------------------------------
  // IMPORTANT ? REMOVE THE DINING/KITCHEN DIVIDER
  // ------------------------------------------------------------
  //
  // Old:
  // backDoor width = .8
  //
  // New:
  // backDoor width = 3.56 on a 3.8m wall.
  //
  // This leaves only tiny architectural side returns and a top beam,
  // instead of a full wall with a small doorway.
  // ------------------------------------------------------------

  roomShell(
    dining,
    3.5,
    .48,
    2.6,
    3.8,
    2.35,
    {
      leftDoor: {
        center: 2.6,
        width: 1.25
      },
      backDoor: {
        center: 3.5,
        width: 3.56
      }
    }
  );


  // ------------------------------------------------------------
  // PREMIUM DINING RUG
  // ------------------------------------------------------------

  box(
    dining,
    [2.95,.025,1.72],
    [3.5,.54,2.60],
    diningRug
  );


  // ------------------------------------------------------------
  // LARGE WALNUT DINING TABLE
  // ------------------------------------------------------------

  // Floating dark shadow/base.
  box(
    dining,
    [2.64,.09,1.10],
    [3.5,1.15,2.60],
    diningWalnutDark
  );

  // Main walnut top.
  box(
    dining,
    [2.58,.13,1.04],
    [3.5,1.24,2.60],
    diningWalnut
  );

  // Fine stone centre strip.
  box(
    dining,
    [.28,.145,1.00],
    [3.5,1.25,2.60],
    diningStone
  );

  // Two sculptural pedestal bases.
  box(
    dining,
    [.48,.62,.58],
    [2.85,.84,2.60],
    diningWalnutDark
  );

  box(
    dining,
    [.48,.62,.58],
    [4.15,.84,2.60],
    diningWalnutDark
  );

  // Bronze plinths beneath pedestals.
  box(
    dining,
    [.56,.055,.64],
    [2.85,.54,2.60],
    diningBronze
  );

  box(
    dining,
    [.56,.055,.64],
    [4.15,.54,2.60],
    diningBronze
  );


  // ------------------------------------------------------------
  // PREMIUM DINING CHAIRS
  // ------------------------------------------------------------

  const premiumDiningChair = (
    x: number,
    z: number,
    rotation: number
  ) => {

    const group = new THREE.Group();

    group.position.set(
      x,
      .48,
      z
    );

    group.rotation.y = rotation;


    // Slim upholstered seat.
    box(
      group,
      [.50,.12,.48],
      [0,.47,0],
      diningFabric
    );


    // Slim taller back.
    box(
      group,
      [.50,.58,.10],
      [0,.78,-.20],
      diningFabric
    );


    // Dark wooden lower frame.
    box(
      group,
      [.44,.07,.42],
      [0,.38,0],
      diningWalnutDark
    );


    // Four bronze legs.
    for (const lx of [-.18,.18]) {
      for (const lz of [-.16,.16]) {

        box(
          group,
          [.035,.40,.035],
          [lx,.19,lz],
          diningBronze
        );

      }
    }

    dining.add(group);
  };


  for (const x of [2.70,3.50,4.30]) {

    premiumDiningChair(
      x,
      1.82,
      0
    );

    premiumDiningChair(
      x,
      3.38,
      Math.PI
    );

  }


  // ------------------------------------------------------------
  // TABLE SETTING
  // ------------------------------------------------------------

  for (const x of [2.72,3.50,4.28]) {

    plate(
      dining,
      x,
      1.325,
      2.22
    );

    plate(
      dining,
      x,
      1.325,
      2.98
    );

  }


  // Low premium centrepiece.
  cylinder(
    dining,
    .24,
    .06,
    [3.5,1.34,2.60],
    diningBronze
  );

  const diningCentre = new THREE.Mesh(
    new THREE.SphereGeometry(.11,18,12),
    diningStone
  );

  diningCentre.scale.set(
    1.6,
    .55,
    1
  );

  diningCentre.position.set(
    3.5,
    1.42,
    2.60
  );

  dining.add(diningCentre);


  // ------------------------------------------------------------
  // THREE SMALL PENDANTS
  //
  // Better than one oversized central cone.
  // ------------------------------------------------------------

  for (const x of [2.88,3.50,4.12]) {

    cylinder(
      dining,
      .012,
      .60,
      [x,2.61,2.60],
      diningBronze
    );

    const shade = new THREE.Mesh(
      new THREE.CylinderGeometry(
        .10,
        .22,
        .19,
        20,
        1,
        true
      ),
      diningGlow
    );

    shade.position.set(
      x,
      2.27,
      2.60
    );

    dining.add(shade);

  }


  // Slim ceiling feature.
  box(
    dining,
    [2.50,.075,.16],
    [3.5,3.00,2.60],
    diningWalnutDark
  );

  box(
    dining,
    [2.10,.018,.020],
    [3.5,2.94,2.60],
    diningGlow
  );


  ceilingLight(
    dining,
    3.5,
    2.92,
    2.60,
    .20
  );

  const kitchen = new THREE.Group();
  roomShell(kitchen,3.55,.48,-1.15,4.1,3.7,{wet:true}); box(kitchen,[3.65,.88,.58],[3.55,.94,-2.7],kitchenWalnutDark);
  box(kitchen,[3.8,.11,.72],[3.55,1.43,-2.7],kitchenQuartz); box(kitchen,[2.45,.9,.9],[3.5,.95,-.75],kitchenTaupe);
  box(kitchen,[2.6,.12,1.02],[3.5,1.46,-.75],kitchenQuartz);
  for (const x of [2.15,2.85,3.55,4.25]) box(kitchen,[.62,.62,.4],[x,2.25,-2.83],kitchenWalnut);
  for (const x of [2.05,2.75,3.45,4.15]) { box(kitchen,[.58,.68,.025],[x,.95,-2.39],kitchenTaupe); box(kitchen,[.22,.025,.025],[x+.17,.96,-2.36],diningBronze); }
  box(kitchen,[.82,1.95,.68],[5.18,1.5,-2.25],kitchenSteel); box(kitchen,[.32,.025,.025],[5.02,1.52,-1.9],brass);
  box(kitchen,[.75,.04,.55],[3.2,1.52,-.72],dark); box(kitchen,[.75,.55,.08],[3.2,1.06,-.29],dark); // cooktop + oven
  const ovenGlass = box(kitchen,[.58,.32,.025],[3.2,1.08,-.24],mirror); ovenGlass.material = mirror;
  box(kitchen,[.9,.22,.58],[3.2,2.35,-.72],metalMat); box(kitchen,[.3,.68,.24],[3.2,2.68,-.72],metalMat); // hood + flue


  // ============================================================
  // PREMIUM OPEN PLAN KITCHEN V11
  // ============================================================


  // ------------------------------------------------------------
  // LARGE-FORMAT KITCHEN FLOOR
  // ------------------------------------------------------------

  box(
    kitchen,
    [4.00,.025,3.58],
    [3.55,.53,-1.15],
    kitchenFloorStone
  );


  // ------------------------------------------------------------
  // PREMIUM BACKSPLASH FACE
  // ------------------------------------------------------------

  box(
    kitchen,
    [3.58,.68,.035],
    [3.55,1.81,-2.935],
    kitchenQuartz
  );


  // Warm under-cabinet LED.
  box(
    kitchen,
    [3.25,.018,.020],
    [3.55,1.91,-2.89],
    diningGlow
  );


  // ------------------------------------------------------------
  // ISLAND WATERFALL SIDES
  // ------------------------------------------------------------

  box(
    kitchen,
    [.075,.94,1.00],
    [2.23,.99,-.75],
    kitchenQuartz
  );

  box(
    kitchen,
    [.075,.94,1.00],
    [4.77,.99,-.75],
    kitchenQuartz
  );


  // Bronze reveal on island front.
  box(
    kitchen,
    [2.20,.025,.025],
    [3.5,.98,-.275],
    diningBronze
  );


  // ------------------------------------------------------------
  // TWO ISLAND STOOLS
  // ------------------------------------------------------------

  const kitchenStool = (
    x: number
  ) => {

    const stool = new THREE.Group();

    stool.position.set(
      x,
      .48,
      -.03
    );


    const seat = new THREE.Mesh(
      new THREE.CylinderGeometry(
        .22,
        .22,
        .10,
        24
      ),
      diningFabricAccent
    );

    seat.position.y = .62;

    stool.add(seat);


    cylinder(
      stool,
      .035,
      .54,
      [0,.29,0],
      diningBronze
    );


    cylinder(
      stool,
      .16,
      .035,
      [0,.03,0],
      diningWalnutDark
    );

    kitchen.add(stool);

  };


  kitchenStool(2.92);
  kitchenStool(4.08);


  // ------------------------------------------------------------
  // THREE ISLAND PENDANTS
  // ------------------------------------------------------------

  for (const x of [2.85,3.50,4.15]) {

    cylinder(
      kitchen,
      .010,
      .63,
      [x,2.62,-.75],
      diningBronze
    );


    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(
        .095,
        18,
        12
      ),
      diningGlow
    );

    globe.position.set(
      x,
      2.28,
      -.75
    );

    kitchen.add(globe);

  }


  // ------------------------------------------------------------
  // OPEN DISPLAY SHELF
  // ------------------------------------------------------------

  box(
    kitchen,
    [1.42,.055,.25],
    [4.10,1.86,-2.78],
    kitchenWalnutDark
  );

  box(
    kitchen,
    [1.16,.018,.018],
    [4.10,1.80,-2.64],
    diningGlow
  );


  // Minimal shelf d?cor.
  cylinder(
    kitchen,
    .07,
    .18,
    [3.75,2.00,-2.70],
    diningBronze
  );

  const kitchenShelfDecor = new THREE.Mesh(
    new THREE.SphereGeometry(
      .09,
      16,
      12
    ),
    kitchenQuartz
  );

  kitchenShelfDecor.position.set(
    4.30,
    2.00,
    -2.70
  );

  kitchen.add(kitchenShelfDecor);


  // ------------------------------------------------------------
  // TALL PANTRY FRAME BESIDE FRIDGE
  // ------------------------------------------------------------

  box(
    kitchen,
    [.10,2.05,.74],
    [4.72,1.53,-2.25],
    kitchenWalnutDark
  );


  // ------------------------------------------------------------
  // LOCAL WARM KITCHEN LIGHT
  // ------------------------------------------------------------

  const premiumKitchenLight =
    new THREE.PointLight(
      0xffc98f,
      1.45,
      4.5,
      2
    );

  premiumKitchenLight.position.set(
    3.55,
    2.42,
    -1.15
  );

  premiumKitchenLight.castShadow = false;

  kitchen.add(
    premiumKitchenLight
  );

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
  box(kitchen,[3.5,.03,.06],[3.55,1.9,-2.6],lightMat); // under-cabinet warm light strip
  acUnit(kitchen,2.2,2.55,-2.86); ceilingLight(kitchen,3.5,2.92,-.7,.26);
  pendant(kitchen,3.05,2.9,-.75,.65); pendant(kitchen,3.95,2.9,-.75,.65);

  // No ground-floor bathroom exists — per the owner's plan, all wet rooms live upstairs with the
  // bedrooms (the master's attached washroom + the family bathroom).

  // ============================================================
  // EXTERIOR STAIRCASE V13
  //
  // NO indoor staircase.
  // First-floor access is from OUTSIDE on the right/east side.
  // ============================================================


  // ============================================================
  // PREMIUM EXTERIOR STAIRCASE V19
  //
  // Luxury right-side exterior staircase.
  // Existing circulation coordinates are preserved.
  // ============================================================

  const stairs =
    new THREE.Group();

  stairs.name =
    'premium-exterior-first-floor-staircase-v19';


  // ============================================================
  // MATERIALS
  // ============================================================

  const premiumStairStone =
    new THREE.MeshStandardMaterial({
      color: 0xb9aa98,
      roughness: .48,
      metalness: .015,
      envMapIntensity: .78,
    });


  const premiumStairStoneLight =
    new THREE.MeshStandardMaterial({
      color: 0xd8cdbc,
      roughness: .42,
      metalness: .01,
      envMapIntensity: .82,
    });


  const premiumStairWood =
    new THREE.MeshStandardMaterial({
      color: 0x5b3726,
      roughness: .38,
      metalness: .02,
      envMapIntensity: .76,
    });


  const premiumStairWoodDark =
    new THREE.MeshStandardMaterial({
      color: 0x281b17,
      roughness: .34,
      metalness: .06,
      envMapIntensity: .88,
    });


  const premiumStairBronze =
    new THREE.MeshStandardMaterial({
      color: 0x8e6840,
      roughness: .28,
      metalness: .76,
      envMapIntensity: 1.05,
    });


  const premiumStairBlack =
    new THREE.MeshStandardMaterial({
      color: 0x171717,
      roughness: .27,
      metalness: .54,
      envMapIntensity: .92,
    });


  const premiumStairGlow =
    new THREE.MeshStandardMaterial({
      color: 0xffd5a4,
      emissive: 0xff9b48,
      emissiveIntensity: 2.25,
      roughness: .30,
      metalness: .02,
    });


  const premiumStairGlass =
    new THREE.MeshPhysicalMaterial({
      color: 0xc9d0ce,
      roughness: .08,
      metalness: 0,
      transmission: .72,
      transparent: true,
      opacity: .32,
      thickness: .045,
      ior: 1.45,
      envMapIntensity: .90,
      depthWrite: false,
    });


  // ============================================================
  // LOCAL HELPER FOR ROTATED BEAMS
  // ============================================================

  const stairBeam = (
    size: [number, number, number],
    position: [number, number, number],
    material: THREE.Material,
    rotationZ = 0
  ) => {

    const mesh =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          size[0],
          size[1],
          size[2]
        ),
        material
      );

    mesh.position.set(
      position[0],
      position[1],
      position[2]
    );

    mesh.rotation.z =
      rotationZ;

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    stairs.add(
      mesh
    );

    return mesh;
  };


  // ============================================================
  // LOWER ARRIVAL LANDING
  // ============================================================

  // Main stone landing.
  box(
    stairs,
    [1.92,.15,1.42],
    [6.55,.55,-4.02],
    premiumStairStoneLight
  );


  // Dark floating shadow/plinth.
  box(
    stairs,
    [2.08,.20,1.54],
    [6.55,.39,-4.02],
    premiumStairWoodDark
  );


  // Warm timber inset.
  box(
    stairs,
    [1.68,.045,1.12],
    [6.55,.645,-4.02],
    premiumStairWood
  );


  // Bronze landing trim.
  box(
    stairs,
    [1.90,.025,.035],
    [6.55,.665,-4.70],
    premiumStairBronze
  );


  // ============================================================
  // MAIN STAIR FLIGHT
  // ============================================================

  const premiumStepCount =
    18;

  const premiumStartZ =
    -3.55;

  const premiumEndZ =
    3.76;

  const premiumStartY =
    .63;

  const premiumEndY =
    3.49;

  const premiumStairWidth =
    1.62;


  // ============================================================
  // STRUCTURAL SIDE STRINGERS
  // ============================================================

  const stairRun =
    premiumEndZ -
    premiumStartZ;

  const stairRise =
    premiumEndY -
    premiumStartY;

  const stairLength =
    Math.sqrt(
      stairRun * stairRun +
      stairRise * stairRise
    );

  const stairAngle =
    Math.atan2(
      stairRise,
      stairRun
    );


  // Left concealed structural stringer.
  const leftStringer =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        .11,
        .22,
        stairLength
      ),
      premiumStairBlack
    );

  leftStringer.position.set(
    5.83,
    (premiumStartY + premiumEndY) / 2 - .10,
    (premiumStartZ + premiumEndZ) / 2
  );

  leftStringer.rotation.x =
    -stairAngle;

  leftStringer.castShadow = true;

  stairs.add(
    leftStringer
  );


  // Right concealed structural stringer.
  const rightStringer =
    leftStringer.clone();

  rightStringer.position.x =
    7.27;

  stairs.add(
    rightStringer
  );


  // ============================================================
  // STEPS
  // ============================================================

  for (
    let i = 0;
    i < premiumStepCount;
    i++
  ) {

    const t =
      i /
      (premiumStepCount - 1);

    const y =
      THREE.MathUtils.lerp(
        premiumStartY,
        premiumEndY,
        t
      );

    const z =
      THREE.MathUtils.lerp(
        premiumStartZ,
        premiumEndZ,
        t
      );


    // ----------------------------------------------------------
    // PREMIUM STONE STEP BODY
    // ----------------------------------------------------------

    box(
      stairs,
      [
        premiumStairWidth,
        .095,
        .46
      ],
      [
        6.55,
        y,
        z
      ],
      premiumStairStoneLight
    );


    // ----------------------------------------------------------
    // WALNUT TREAD TOP
    //
    // Thin inset prevents the old "heavy concrete slab" look.
    // ----------------------------------------------------------

    box(
      stairs,
      [
        1.54,
        .040,
        .395
      ],
      [
        6.55,
        y + .068,
        z - .008
      ],
      premiumStairWood
    );


    // ----------------------------------------------------------
    // DARK SHADOW GAP / RISER
    // ----------------------------------------------------------

    box(
      stairs,
      [
        1.46,
        .10,
        .035
      ],
      [
        6.55,
        y - .065,
        z - .225
      ],
      premiumStairWoodDark
    );


    // ----------------------------------------------------------
    // CONCEALED UNDER-TREAD LED
    // ----------------------------------------------------------

    box(
      stairs,
      [
        1.34,
        .018,
        .025
      ],
      [
        6.55,
        y - .025,
        z - .245
      ],
      premiumStairGlow
    );


    // ----------------------------------------------------------
    // SMALL BRONZE NOSING
    // ----------------------------------------------------------

    box(
      stairs,
      [
        1.56,
        .018,
        .018
      ],
      [
        6.55,
        y + .082,
        z - .218
      ],
      premiumStairBronze
    );

  }


  // ============================================================
  // OUTER GLASS BALUSTRADE
  //
  // Large clean panels instead of many ugly posts.
  // ============================================================

  const glassPanelCount =
    6;

  for (
    let i = 0;
    i < glassPanelCount;
    i++
  ) {

    const t0 =
      i /
      glassPanelCount;

    const t1 =
      (i + 1) /
      glassPanelCount;

    const tm =
      (t0 + t1) / 2;

    const y =
      THREE.MathUtils.lerp(
        premiumStartY,
        premiumEndY,
        tm
      ) + .66;

    const z0 =
      THREE.MathUtils.lerp(
        premiumStartZ,
        premiumEndZ,
        t0
      );

    const z1 =
      THREE.MathUtils.lerp(
        premiumStartZ,
        premiumEndZ,
        t1
      );

    const z =
      (z0 + z1) / 2;

    const panelRun =
      Math.abs(
        z1 - z0
      ) + .06;


    const glass =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          .035,
          .86,
          panelRun
        ),
        premiumStairGlass
      );

    glass.position.set(
      7.35,
      y,
      z
    );

    glass.rotation.x =
      -stairAngle;

    glass.renderOrder = 3;

    stairs.add(
      glass
    );


    // Slim bronze vertical join.
    box(
      stairs,
      [
        .045,
        .98,
        .045
      ],
      [
        7.35,
        y,
        z0
      ],
      premiumStairBronze
    );

  }


  // Last glass post.
  box(
    stairs,
    [.045,.98,.045],
    [
      7.35,
      premiumEndY + .66,
      premiumEndZ
    ],
    premiumStairBronze
  );


  // ============================================================
  // CONTINUOUS OUTER HANDRAIL
  // ============================================================

  const outerRail =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        .075,
        .075,
        stairLength
      ),
      premiumStairWood
    );

  outerRail.position.set(
    7.35,
    (premiumStartY + premiumEndY) / 2 + 1.10,
    (premiumStartZ + premiumEndZ) / 2
  );

  outerRail.rotation.x =
    -stairAngle;

  outerRail.castShadow = true;

  stairs.add(
    outerRail
  );


  // Bronze line immediately below handrail.
  const outerRailAccent =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        .025,
        .025,
        stairLength - .05
      ),
      premiumStairBronze
    );

  outerRailAccent.position.set(
    7.31,
    (premiumStartY + premiumEndY) / 2 + 1.035,
    (premiumStartZ + premiumEndZ) / 2
  );

  outerRailAccent.rotation.x =
    -stairAngle;

  stairs.add(
    outerRailAccent
  );


  // ============================================================
  // INNER WALL HANDRAIL
  // ============================================================

  const innerRail =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        .060,
        .060,
        stairLength - .28
      ),
      premiumStairBronze
    );

  innerRail.position.set(
    5.78,
    (premiumStartY + premiumEndY) / 2 + .92,
    (premiumStartZ + premiumEndZ) / 2
  );

  innerRail.rotation.x =
    -stairAngle;

  stairs.add(
    innerRail
  );


  // ============================================================
  // ARCHITECTURAL WALL STEP LIGHTS
  // ============================================================

  for (
    const t of [.12,.31,.50,.69,.88]
  ) {

    const y =
      THREE.MathUtils.lerp(
        premiumStartY,
        premiumEndY,
        t
      ) + .28;

    const z =
      THREE.MathUtils.lerp(
        premiumStartZ,
        premiumEndZ,
        t
      );


    // Black/bronzish wall fixture.
    box(
      stairs,
      [.065,.20,.27],
      [5.77,y,z],
      premiumStairBlack
    );


    // Warm inner light.
    box(
      stairs,
      [.025,.095,.17],
      [5.735,y,z],
      premiumStairGlow
    );

  }


  // ============================================================
  // PREMIUM UPPER LANDING
  // ============================================================

  box(
    stairs,
    [1.96,.15,1.55],
    [6.55,3.60,4.18],
    premiumStairStoneLight
  );


  box(
    stairs,
    [2.08,.16,1.65],
    [6.55,3.45,4.18],
    premiumStairWoodDark
  );


  // Timber centre insert.
  box(
    stairs,
    [1.65,.045,1.22],
    [6.55,3.69,4.18],
    premiumStairWood
  );


  // Warm landing edge light.
  box(
    stairs,
    [1.64,.018,.025],
    [6.55,3.655,3.43],
    premiumStairGlow
  );


  // ============================================================
  // TOP LANDING GLASS SAFETY RAIL
  // ============================================================

  const topGlass =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        .035,
        .90,
        1.34
      ),
      premiumStairGlass
    );

  topGlass.position.set(
    7.35,
    4.12,
    4.18
  );

  topGlass.renderOrder = 3;

  stairs.add(
    topGlass
  );


  // Top rail.
  box(
    stairs,
    [.075,.075,1.45],
    [7.35,4.59,4.18],
    premiumStairWood
  );


  // End posts.
  for (
    const z of [3.52,4.84]
  ) {

    box(
      stairs,
      [.045,1.00,.045],
      [7.35,4.10,z],
      premiumStairBronze
    );

  }


  // ============================================================
  // UPPER FLOOR ENTRY DOOR
  // ============================================================

  box(
    stairs,
    [.07,2.05,1.06],
    [5.91,4.58,4.18],
    premiumStairWoodDark
  );


  // Warm wood inset.
  box(
    stairs,
    [.035,1.84,.88],
    [5.865,4.58,4.18],
    premiumStairWood
  );


  // Door-frame verticals.
  box(
    stairs,
    [.09,2.24,.055],
    [5.86,4.58,3.59],
    premiumStairBronze
  );

  box(
    stairs,
    [.09,2.24,.055],
    [5.86,4.58,4.77],
    premiumStairBronze
  );


  // Door-frame top.
  box(
    stairs,
    [.09,.08,1.27],
    [5.86,5.68,4.18],
    premiumStairBronze
  );


  // Premium vertical handle.
  box(
    stairs,
    [.075,.48,.035],
    [5.81,4.55,3.83],
    premiumStairBronze
  );


  // ============================================================
  // SUPPORTS UNDER TOP LANDING
  // ============================================================

  // Dark structural frame instead of two crude columns.
  box(
    stairs,
    [.12,3.0,.12],
    [7.15,2.05,3.58],
    premiumStairBlack
  );

  box(
    stairs,
    [.12,3.0,.12],
    [7.15,2.05,4.75],
    premiumStairBlack
  );

  box(
    stairs,
    [.12,.12,1.30],
    [7.15,3.48,4.18],
    premiumStairBlack
  );


  // ============================================================
  // LOWER LANDING PLANTER
  // ============================================================

  box(
    stairs,
    [.48,.42,.92],
    [7.62,.46,-4.05],
    premiumStairStone
  );


  const stairPlantStem =
    new THREE.Mesh(
      new THREE.CylinderGeometry(
        .025,
        .035,
        .72,
        10
      ),
      premiumStairWood
    );

  stairPlantStem.position.set(
    7.62,
    1.00,
    -4.05
  );

  stairs.add(
    stairPlantStem
  );


  for (
    const [x,y,z,sx,sy,sz] of [
      [7.55,1.23,-4.05,.22,.42,.18],
      [7.70,1.35,-4.02,.24,.48,.18],
      [7.61,1.54,-4.04,.19,.38,.16]
    ]
  ) {

    const leaf =
      new THREE.Mesh(
        new THREE.SphereGeometry(
          .5,
          14,
          10
        ),
        livingGreen
      );

    leaf.scale.set(
      sx,
      sy,
      sz
    );

    leaf.position.set(
      x,
      y,
      z
    );

    leaf.castShadow = true;

    stairs.add(
      leaf
    );

  }


  // ============================================================
  // PREMIUM LANDING LIGHT POSTS
  // ============================================================

  for (
    const z of [-4.55,3.55,4.78]
  ) {

    box(
      stairs,
      [.07,.50,.07],
      [7.72,.82,z],
      premiumStairBlack
    );

    const lightOrb =
      new THREE.Mesh(
        new THREE.SphereGeometry(
          .095,
          14,
          10
        ),
        premiumStairGlow
      );

    lightOrb.position.set(
      7.72,
      1.10,
      z
    );

    stairs.add(
      lightOrb
    );

  }



// Warm stair lighting so the climb reads clearly (tour-only: the lights live inside the stairs
  // group, cast no shadows, and cost nothing outside the tour).
  const stairSconceMat = new THREE.MeshStandardMaterial({ color: 0x2a2118, emissive: 0xffc98a, emissiveIntensity: 2.6, roughness: .6 });
  for (const [sy, sz] of [[2.15, -1.6], [3.0, .6], [3.85, 2.6]] as const) {
    box(stairs, [.05, .22, .1], [6.53, sy, sz], stairSconceMat);
  }
  const stairLightLower = new THREE.PointLight(0xffd9a0, .85, 7, 1.8);
  stairLightLower.position.set(6.95, 3.0, -.8);
  stairs.add(stairLightLower);
  const stairLightUpper = new THREE.PointLight(0xffd9a0, .8, 7, 1.8);
  stairLightUpper.position.set(6.75, 4.5, 3.1);
  stairs.add(stairLightUpper);

  const landing = new THREE.Group();
  roomShell(landing,0,3.55,-.25,2.1,4.9,{floor:false});
  const landingLight = new THREE.PointLight(0xffd9a0, .7, 6, 1.8);
  landingLight.position.set(.3, 5.25, -.2);
  landing.add(landingLight);
  box(landing,[1.5,.08,4.9],[.3,3.55,-.25],floorMat);
  box(landing,[.65,.08,.95],[-.725,3.55,-2.225],floorMat);
  box(landing,[.65,.08,1.05],[-.725,3.55,1.675],floorMat);
  box(landing,[1.15,.1,.3],[.25,4.29,-2.43],marbleMat);
  for (const x of [-.2,.7]) box(landing,[.06,.64,.06],[x,3.92,-2.43],brass);
  box(landing,[.95,.7,.04],[.25,4.85,-2.64],art); ceilingLight(landing,0,5.9,-.2,.18);
  for (const x of [-.95,-.58,-.2,.18]) box(landing,[.04,.9,.04],[x,4.05,1.25],brass);
  box(landing,[1.25,.06,.07],[-.39,4.5,1.25],brass);

  // Master bedroom — its back wall carries the ENSUITE door (center x -5.1), so the private bath is
  // physically attached and entered from inside the room.
  const master = new THREE.Group();
  roomShell(master,-3.7,3.55,.7,4.2,5.2,{backDoor:{center:-5.1,width:.8}}); box(master,[2.75,.34,2.15],[-3.75,3.76,.85],furnMat);
  box(master,[2.62,.28,2.02],[-3.75,4.04,.85],fabric); box(master,[2.45,.12,1.5],[-3.75,4.22,1.08],white);
  for (const x of [-4.38,-3.12]) box(master,[.52,.16,.35],[x,4.3,.12],fabric);
  box(master,[2.2,1.25,.18],[-3.4,4.48,-.25],furnMat);
  for (const x of [-5.35,-2.15]) { box(master,[.62,.48,.55],[x,3.85,.05],furnMat); tableLamp(master,x,4.09,.05); }
  box(master,[.58,2.2,2.35],[-5.45,4.72,1.95],furnMat); for (const z of [1.35,2.55]) box(master,[.025,1.75,.025],[-5.14,4.72,z],brass);
  box(master,[1.8,.045,1.25],[-3.75,3.59,2.5],art);
  acUnit(master,-5.5,5.35,-.1); ceilingLight(master,-3.7,5.92,1.2,.26);

  // Common/family bathroom — east side, grouped with the bedrooms (was mislabelled the master bath;
  // the master's real ensuite is attached to the master on the west, below).
  const commonBath = new THREE.Group();
  roomShell(commonBath,3.85,3.55,-1.55,3.35,2.75,{wet:true}); box(commonBath,[1.45,.78,.55],[3.25,4.0,-2.45],marbleMat);
  box(commonBath,[3.2,.04,2.6],[3.85,3.60,-1.55],marbleMat);
  box(commonBath,[3.2,2.55,.035],[3.85,4.85,-2.88],marbleMat);
  box(commonBath,[1.35,1.05,.04],[3.25,4.9,-2.74],mirrorPanel);
  box(commonBath,[1.4,.025,.025],[3.25,5.44,-2.71],bronze); box(commonBath,[1.4,.025,.025],[3.25,4.36,-2.71],bronze);
  box(commonBath,[.025,1.1,.025],[2.55,4.9,-2.71],bronze); box(commonBath,[.025,1.1,.025],[3.95,4.9,-2.71],bronze);
  for (const x of [2.9,3.6]) { const sink = new THREE.Mesh(new THREE.CylinderGeometry(.18,.15,.1,20),white); sink.position.set(x,4.44,-2.42); commonBath.add(sink); }
  box(commonBath,[1.48,.08,.58],[4.65,3.61,-1.7],white);
  box(commonBath,[1.65,.5,.1],[4.65,3.85,-2.04],white); box(commonBath,[1.65,.5,.1],[4.65,3.85,-1.36],white);
  box(commonBath,[.1,.5,.58],[3.87,3.85,-1.7],white); box(commonBath,[.1,.5,.58],[5.43,3.85,-1.7],white);
  box(commonBath,[1.4,.025,.48],[4.65,3.96,-1.7],mirror);
  box(commonBath,[.05,2.15,1.35],[2.38,4.67,-1.55],interiorGlass);
  box(commonBath,[.45,2.15,.05],[2.655,4.67,-.9],interiorGlass);
  box(commonBath,[.5,2.15,.05],[3.18,4.67,-.9],interiorGlass);
  box(commonBath,[.025,.28,.035],[2.96,4.72,-.86],bronze);
  box(commonBath,[1.05,.05,1.15],[2.8,3.63,-1.45],tile);
  box(commonBath,[.48,.42,.26],[4.7,4.02,-.38],white);
  const upperToilet = new THREE.Mesh(new THREE.CylinderGeometry(.2,.27,.32,20),white); upperToilet.scale.z=1.35; upperToilet.position.set(4.7,3.72,-.6); commonBath.add(upperToilet);
  const upperSeat = new THREE.Mesh(new THREE.TorusGeometry(.21,.028,8,20),white); upperSeat.rotation.x=Math.PI/2; upperSeat.scale.z=1.28; upperSeat.position.set(4.7,3.9,-.6); commonBath.add(upperSeat);
  box(commonBath,[.34,.035,.42],[4.7,3.915,-.65],white);
  for (const x of [2.9,3.6]) { cylinder(commonBath,.02,.34,[x,4.53,-2.38],bronze); box(commonBath,[.22,.025,.025],[x-.09,4.68,-2.38],bronze); }
  cylinder(commonBath,.018,1.15,[2.76,4.95,-1.88],bronze); const showerHead=box(commonBath,[.24,.025,.16],[2.76,5.48,-1.75],bronze); showerHead.rotation.x=.25;
  cylinder(commonBath,.02,.85,[5.15,4.045,-1.24],bronze); box(commonBath,[.025,.025,.28],[5.15,4.46,-1.37],bronze);
  box(commonBath,[.65,.025,.035],[4.55,4.75,-2.85],bronze);
  box(commonBath,[.035,.08,.035],[4.25,4.71,-2.82],bronze); box(commonBath,[.035,.08,.035],[4.85,4.71,-2.82],bronze);
  ceilingLight(commonBath,3.85,5.9,-1.5,.15);

  // Master ENSUITE — attached directly behind the master bedroom, entered through the framed door in
  // the master's back wall. Enclosed on all four sides: back+left from roomShell, a solid east
  // closure wall, and the master's own doored wall as the fourth side.
  const masterBath = new THREE.Group();
  roomShell(masterBath,-3.95,3.55,-2.95,3.2,2.1,{wet:true});
  box(masterBath,[.09,2.65,2.1],[-2.35,4.89,-2.95],wall); // east closure wall
  box(masterBath,[.035,2.55,2.0],[-5.5,4.85,-2.95],marbleMat); // marble feature wall
  box(masterBath,[1.4,.78,.5],[-4.6,3.96,-3.68],furnMat); // vanity on the back wall
  box(masterBath,[1.5,.055,.58],[-4.6,4.38,-3.66],marbleMat); // counter
  for (const x of [-4.95,-4.25]) { const enSink = new THREE.Mesh(new THREE.CylinderGeometry(.16,.13,.1,20),white); enSink.position.set(x,4.46,-3.64); masterBath.add(enSink); }
  box(masterBath,[1.3,.9,.04],[-4.6,5.0,-3.93],mirrorPanel);
  box(masterBath,[1.36,.025,.025],[-4.6,5.47,-3.9],bronze); box(masterBath,[1.36,.025,.025],[-4.6,4.53,-3.9],bronze);
  for (const x of [-5.29,-3.91]) box(masterBath,[.025,.96,.025],[x,5.0,-3.9],bronze);
  for (const x of [-4.95,-4.25]) { cylinder(masterBath,.02,.3,[x,4.55,-3.42],bronze); box(masterBath,[.18,.025,.025],[x-.07,4.68,-3.42],bronze); }
  box(masterBath,[.05,2.15,.95],[-3.35,4.7,-3.5],interiorGlass); // shower side glass
  box(masterBath,[.5,2.15,.05],[-3.12,4.7,-3.02],interiorGlass); // shower front glass + opening
  box(masterBath,[.025,.28,.035],[-2.9,4.75,-3.0],bronze);
  cylinder(masterBath,.018,1.05,[-2.7,4.95,-3.75],bronze);
  const enShower = box(masterBath,[.22,.025,.15],[-2.72,5.45,-3.63],bronze); enShower.rotation.x = .25;
  box(masterBath,[.9,.05,.9],[-2.85,3.62,-3.5],tile); // shower tray
  box(masterBath,[.26,.42,.48],[-5.36,4.09,-2.25],white); // WC cistern on the left wall
  const enToilet = new THREE.Mesh(new THREE.CylinderGeometry(.2,.27,.32,20),white); enToilet.scale.x=1.35; enToilet.position.set(-5.03,3.77,-2.25); masterBath.add(enToilet);
  const enSeat = new THREE.Mesh(new THREE.TorusGeometry(.21,.028,8,20),white); enSeat.rotation.x=Math.PI/2; enSeat.scale.x=1.28; enSeat.position.set(-5.03,3.945,-2.25); masterBath.add(enSeat);
  box(masterBath,[.42,.035,.34],[-5.08,3.96,-2.25],white);
  box(masterBath,[.025,.025,.6],[-2.41,4.55,-2.5],bronze); // towel rail beside the door
  // Own ceiling: the open-top interior cutaway otherwise exposes raw sky above the ensuite walls
  // (the "mirror shows the sky" defect was mostly this void). Lives inside the room group, so it
  // only exists during the tour and never blocks exterior shots.
  box(masterBath,[3.3,.07,2.2],[-3.95,5.66,-2.95],wall);
  box(masterBath,[1.45,.006,.55],[-4.6,4.412,-3.66],dark); // shadow line ON the counter seats the basins
  ceilingLight(masterBath,-3.95,5.6,-2.95,.15);

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
  box(circulation,[.4,.08,.9],[-1.35,.48,2.8],floorMat); // entry -> hall doorway floor
  box(circulation,[.4,.08,.6],[-1.35,.48,2.05],floorMat); // level threshold infill
  box(circulation,[.45,.08,.9],[1.375,.48,2.6],floorMat); // entry -> dining doorway floor
  box(circulation,[3.62,.08,.725],[3.5,.48,1.0625],floorMat); // OPEN-PLAN dining -> kitchen bridge
  box(circulation,[3.9,.08,.35],[3.5,.48,3.95],floorMat); // dining-front walking strip
  box(circulation,[3.05,.08,3.1],[-.025,.48,.2],floorMat); // central ground-floor hall
  // Removed old internal stair-hall circulation.
  // Removed old indoor stair approach.
  // Upper circulation belongs to the landing threshold so it never floats over ground-floor shots.
  box(landing,[.9,.08,6.3],[1.5,3.55,.65],floorMat);
  box(landing,[7.2,.08,.7],[1.98,3.55,4.29],floorMat);
  box(landing,[.9,.08,4.55],[6.02,3.55,2.1],floorMat);
  box(landing,[2.65,.08,1.74],[-.275,3.55,3.07],floorMat); // landing -> master connector
  box(landing,[.4,.08,.64],[-1.8,3.55,3.62],floorMat); // master-door corner infill
  box(landing,[.4,.08,.3],[5.7,3.55,4.5],floorMat); // east passage -> terrace connector
  
  
  
   // open at the stair arrival

  

  // ============================================================
  // ============================================================


  

  // ============================================================
  // ============================================================


  

  // ============================================================
  // FIRST FLOOR PROFESSIONAL GALLERY V23
  //
  // Sequence:
  //
  // EXTERIOR STAIRS
  //      ?
  // ARCHITECTURAL ARRIVAL PORTAL
  //      ?
  // ENCLOSED PREMIUM GALLERY
  //      ?
  // FEATURE WALL / CONSOLE
  //      ?
  // PRIVATE BEDROOM PORTAL
  //      ?
  // MASTER BEDROOM
  //
  // This replaces the previous random/open landing appearance.
  // ============================================================


  const floorV23Wall =
    new THREE.MeshStandardMaterial({
      color: 0xd5c9b9,
      roughness: .62,
      metalness: 0,
      envMapIntensity: .58
    });


  const floorV23Ivory =
    new THREE.MeshStandardMaterial({
      color: 0xe1d7ca,
      roughness: .55,
      metalness: .005,
      envMapIntensity: .66
    });


  const floorV23Stone =
    new THREE.MeshStandardMaterial({
      color: 0xb6a58e,
      roughness: .50,
      metalness: .015,
      envMapIntensity: .76
    });


  const floorV23StoneLight =
    new THREE.MeshStandardMaterial({
      color: 0xd2c4b1,
      roughness: .46,
      metalness: .01,
      envMapIntensity: .80
    });


  const floorV23Walnut =
    new THREE.MeshStandardMaterial({
      color: 0x472b20,
      roughness: .36,
      metalness: .025,
      envMapIntensity: .80
    });


  const floorV23WalnutDark =
    new THREE.MeshStandardMaterial({
      color: 0x211714,
      roughness: .30,
      metalness: .08,
      envMapIntensity: .88
    });


  const floorV23Bronze =
    new THREE.MeshStandardMaterial({
      color: 0x96704a,
      roughness: .27,
      metalness: .73,
      envMapIntensity: 1
    });


  const floorV23Glow =
    new THREE.MeshStandardMaterial({
      color: 0xffd2a0,
      emissive: 0xff9a4d,
      emissiveIntensity: .82,
      roughness: .40
    });


  const floorV23Glass =
    new THREE.MeshPhysicalMaterial({
      color: 0x929b99,
      roughness: .10,
      metalness: .01,

      transparent: true,
      opacity: .25,

      transmission: .66,
      thickness: .04,
      ior: 1.45,

      envMapIntensity: .88,

      depthWrite: false,
      side: THREE.DoubleSide
    });


  // ============================================================
  // 1. PROPER FIRST-FLOOR FLOOR
  //
  // One continuous premium circulation surface.
  // No random disconnected patches.
  // ============================================================

  box(
    landing,
    [6.72,.075,1.76],
    [2.20,3.60,4.22],
    floorV23StoneLight
  );


  // Dark floating perimeter underneath.
  box(
    landing,
    [6.86,.10,1.88],
    [2.20,3.515,4.22],
    floorV23WalnutDark
  );


  // Central walnut route strip.
  box(
    landing,
    [6.42,.025,.48],
    [2.12,3.655,4.22],
    floorV23Walnut
  );


  // Bronze route borders.
  box(
    landing,
    [6.45,.018,.018],
    [2.12,3.674,3.95],
    floorV23Bronze
  );

  box(
    landing,
    [6.45,.018,.018],
    [2.12,3.674,4.49],
    floorV23Bronze
  );


  // ============================================================
  // 2. SOLID INTERIOR SIDE WALL
  //
  // This is the missing architectural wall visible from the
  // staircase arrival.
  //
  // It turns the landing into a real house corridor.
  // ============================================================

  box(
    landing,
    [4.25,2.46,.14],
    [3.25,4.78,3.28],
    floorV23Wall
  );


  // Stone skirting.
  box(
    landing,
    [4.28,.18,.16],
    [3.25,3.69,3.29],
    floorV23Stone
  );


  // Walnut ceiling shadow line on wall.
  box(
    landing,
    [4.25,.075,.08],
    [3.25,5.97,3.37],
    floorV23WalnutDark
  );


  // ============================================================
  // 3. OUTER SIDE = FLOOR-TO-CEILING GLAZED WALL
  //
  // Not an open terrace edge anymore.
  //
  // You can still see exterior/landscape through it,
  // but visually it now reads as a premium enclosed gallery.
  // ============================================================

  for (
    const x of [
      -0.45,
       0.70,
       1.85,
       3.00,
       4.15
    ]
  ) {

    const glass =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          1.04,
          2.20,
          .035
        ),
        floorV23Glass
      );

    glass.position.set(
      x,
      4.78,
      5.64
    );

    glass.renderOrder = 4;

    landing.add(
      glass
    );

  }


  // Dark lower glass channel.
  box(
    landing,
    [5.85,.095,.075],
    [1.85,3.68,5.64],
    floorV23WalnutDark
  );


  // Dark upper glass channel.
  box(
    landing,
    [5.85,.095,.075],
    [1.85,5.89,5.64],
    floorV23WalnutDark
  );


  // Slim bronze mullions.
  for (
    const x of [
      -1.02,
       0.12,
       1.27,
       2.42,
       3.57,
       4.72
    ]
  ) {

    box(
      landing,
      [.040,2.28,.060],
      [x,4.78,5.62],
      floorV23Bronze
    );

  }


  // ============================================================
  // 4. PROPER CEILING / ROOF OVER CORRIDOR
  //
  // This makes the first floor read as a finished building
  // rather than an exposed platform.
  // ============================================================

  box(
    landing,
    [6.75,.13,2.48],
    [2.18,6.02,4.43],
    floorV23Ivory
  );


  // Central recessed walnut ceiling.
  box(
    landing,
    [5.92,.055,.88],
    [2.08,5.925,4.43],
    floorV23WalnutDark
  );


  // Two subtle cove light lines.
  box(
    landing,
    [5.82,.022,.025],
    [2.08,5.885,3.93],
    floorV23Glow
  );

  box(
    landing,
    [5.82,.022,.025],
    [2.08,5.885,4.93],
    floorV23Glow
  );


  // ============================================================
  // 5. STAIR ARRIVAL PORTAL
  //
  // Professional threshold immediately after exterior stairs.
  // ============================================================

  box(
    landing,
    [.13,2.44,.13],
    [5.35,4.78,3.43],
    floorV23Walnut
  );

  box(
    landing,
    [.13,2.44,.13],
    [5.35,4.78,5.18],
    floorV23Walnut
  );

  box(
    landing,
    [.13,.13,1.88],
    [5.35,5.96,4.30],
    floorV23Walnut
  );


  // Bronze inner portal trims.
  box(
    landing,
    [.035,2.20,.035],
    [5.27,4.78,3.53],
    floorV23Bronze
  );

  box(
    landing,
    [.035,2.20,.035],
    [5.27,4.78,5.08],
    floorV23Bronze
  );


  // ============================================================
  // 6. PROFESSIONAL FEATURE WALL ON CORRECT SIDE
  //
  // The previous random floating composition is replaced by
  // one coherent wall treatment.
  // ============================================================

  box(
    landing,
    [2.55,1.82,.055],
    [3.26,4.80,3.38],
    floorV23Walnut
  );


  // Stone centre panel.
  box(
    landing,
    [1.18,1.48,.035],
    [3.26,4.80,3.425],
    floorV23StoneLight
  );


  // Walnut vertical slats around centre panel.
  for (
    const x of [
      2.10,
      2.28,
      2.46,
      4.06,
      4.24,
      4.42
    ]
  ) {

    box(
      landing,
      [.075,1.62,.035],
      [x,4.80,3.44],
      floorV23WalnutDark
    );

  }


  // Thin bronze frame.
  box(
    landing,
    [1.34,.025,.025],
    [3.26,5.57,3.47],
    floorV23Bronze
  );

  box(
    landing,
    [1.34,.025,.025],
    [3.26,4.03,3.47],
    floorV23Bronze
  );


  // ============================================================
  // 7. FLOATING CONSOLE ? ATTACHED TO WALL
  //
  // No random furniture floating in circulation.
  // ============================================================

  box(
    landing,
    [1.62,.20,.32],
    [3.25,4.00,3.52],
    floorV23WalnutDark
  );


  // Stone console top.
  box(
    landing,
    [1.72,.045,.37],
    [3.25,4.13,3.53],
    floorV23StoneLight
  );


  // Warm under-console light.
  box(
    landing,
    [1.34,.018,.020],
    [3.25,3.88,3.69],
    floorV23Glow
  );


  // ============================================================
  // 8. MIRROR / ART PANEL
  // ============================================================

  const floorV23Mirror =
    new THREE.MeshPhysicalMaterial({
      color: 0x6f7776,
      roughness: .05,
      metalness: .88,
      clearcoat: 1,
      clearcoatRoughness: .03,
      envMapIntensity: .70
    });


  box(
    landing,
    [.78,1.04,.028],
    [3.25,4.87,3.48],
    floorV23Mirror
  );


  // Bronze mirror frame.
  box(
    landing,
    [.88,.030,.020],
    [3.25,5.40,3.50],
    floorV23Bronze
  );

  box(
    landing,
    [.88,.030,.020],
    [3.25,4.34,3.50],
    floorV23Bronze
  );


  // ============================================================
  // 9. REFINED DECOR
  // ============================================================

  const floorV23Vase =
    new THREE.Mesh(
      new THREE.CylinderGeometry(
        .075,
        .11,
        .26,
        18
      ),
      floorV23Bronze
    );

  floorV23Vase.position.set(
    2.82,
    4.29,
    3.53
  );

  landing.add(
    floorV23Vase
  );


  const floorV23Decor =
    new THREE.Mesh(
      new THREE.SphereGeometry(
        .09,
        16,
        12
      ),
      floorV23StoneLight
    );

  floorV23Decor.position.set(
    3.70,
    4.27,
    3.53
  );

  landing.add(
    floorV23Decor
  );


  // ============================================================
  // 10. WARM WALL LIGHTS
  // ============================================================

  for (
    const x of [
      1.35,
      4.85
    ]
  ) {

    box(
      landing,
      [.16,.32,.055],
      [x,4.82,3.43],
      floorV23WalnutDark
    );

    box(
      landing,
      [.085,.18,.025],
      [x,4.82,3.475],
      floorV23Glow
    );

  }


  // ============================================================
  // 11. CEILING DOWNLIGHTS
  // ============================================================

  for (
    const x of [
      4.72,
      3.55,
      2.38,
      1.21,
       .04
    ]
  ) {

    const light =
      new THREE.Mesh(
        new THREE.CylinderGeometry(
          .065,
          .065,
          .026,
          16
        ),
        floorV23Glow
      );

    light.position.set(
      x,
      5.86,
      4.42
    );

    landing.add(
      light
    );

  }


  // ============================================================
  // 12. END-OF-GALLERY PRIVATE PORTAL
  //
  // This makes the movement into the bedroom feel intentional.
  // ============================================================

  box(
    landing,
    [.14,2.42,.12],
    [-1.02,4.78,3.43],
    floorV23Walnut
  );

  box(
    landing,
    [.14,2.42,.12],
    [-1.02,4.78,5.04],
    floorV23Walnut
  );

  box(
    landing,
    [.14,.13,1.74],
    [-1.02,5.96,4.23],
    floorV23Walnut
  );


  // Bronze portal reveal.
  box(
    landing,
    [.035,2.18,.035],
    [-.94,4.78,3.54],
    floorV23Bronze
  );

  box(
    landing,
    [.035,2.18,.035],
    [-.94,4.78,4.93],
    floorV23Bronze
  );


  // ============================================================
  // 13. PRIVATE-AREA FLOOR TRANSITION
  // ============================================================

  box(
    landing,
    [1.20,.035,1.40],
    [-.45,3.65,4.22],
    floorV23Walnut
  );


  // Bronze threshold.
  box(
    landing,
    [.035,.035,1.45],
    [-1.00,3.68,4.22],
    floorV23Bronze
  );


  // ============================================================
  // 14. SMALL ARCHITECTURAL PLANTER
  //
  // Kept against wall ? not in camera path.
  // ============================================================

  box(
    landing,
    [.42,.40,.42],
    [4.66,3.84,3.62],
    floorV23Stone
  );


  const floorV23PlantStem =
    new THREE.Mesh(
      new THREE.CylinderGeometry(
        .020,
        .028,
        .60,
        10
      ),
      floorV23Bronze
    );

  floorV23PlantStem.position.set(
    4.66,
    4.34,
    3.62
  );

  landing.add(
    floorV23PlantStem
  );


  for (
    const data of [
      [4.57,4.55,3.62,.18,.31,.14],
      [4.73,4.66,3.62,.21,.39,.15],
      [4.65,4.84,3.62,.16,.29,.13]
    ]
  ) {

    const leaf =
      new THREE.Mesh(
        new THREE.SphereGeometry(
          .5,
          14,
          10
        ),
        livingGreen
      );

    leaf.position.set(
      data[0],
      data[1],
      data[2]
    );

    leaf.scale.set(
      data[3],
      data[4],
      data[5]
    );

    leaf.castShadow = true;

    landing.add(
      leaf
    );

  }


  // ============================================================
  // END FIRST FLOOR PROFESSIONAL GALLERY V23
  // ============================================================


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
      // Normalize indexed/non-indexed geometry before batching.
      // Box/Cylinder geometries are commonly indexed while the premium
      // rounded ExtrudeGeometry pieces are non-indexed. BufferGeometryUtils
      // requires every input in one merge batch to use the same index mode.
      const mergeInputs = geometries.map((source) =>
        source.index ? source.toNonIndexed() : source
      );

      const geometry = mergeGeometries(mergeInputs, false);

      // toNonIndexed() creates temporary geometry copies; dispose those
      // separately, then dispose the original source geometries as before.
      mergeInputs.forEach((normalized, index) => {
        if (normalized !== geometries[index]) normalized.dispose();
      });

      geometries.forEach((source) => source.dispose());
      if (!geometry) return;
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, material);
      const standard = material instanceof THREE.MeshStandardMaterial ? material : null;
      const shaded = !material.transparent && (standard?.emissiveIntensity ?? 0) === 0;
      mesh.castShadow = shaded;
      mesh.receiveShadow = shaded;
      room.add(mesh);
    });
  };
  // Keep the upper-left facade as a named runtime boundary for live diagnostics while still merging
  // its repeated stone/frame/fin meshes by material. Temporarily detach it so the outer-shell batch
  // cannot absorb the named group into anonymous parent geometry.
  // ============================================================
  // PREMIUM UPPER LEFT FEATURE V2
  // Converts the previously empty upper-left mass into a composed
  // luxury architectural feature: framed glazing, timber screen,
  // planter ledge, canopy and warm integrated lighting.
  // ============================================================

  const upperFeatureStone = new THREE.MeshStandardMaterial({
    color: 0xcfc3b2,
    roughness: .58,
    metalness: .02,
    envMapIntensity: .72,
  });

  const upperFeatureWalnut = new THREE.MeshStandardMaterial({
    color: 0x3b2116,
    roughness: .42,
    metalness: .035,
    envMapIntensity: .82,
  });

  const upperFeatureBronze = new THREE.MeshStandardMaterial({
    color: 0x967044,
    roughness: .3,
    metalness: .72,
    envMapIntensity: 1.0,
  });

  const upperFeatureCharcoal = new THREE.MeshStandardMaterial({
    color: 0x151719,
    roughness: .25,
    metalness: .28,
    envMapIntensity: .96,
  });

  const upperFeatureGlass = new THREE.MeshPhysicalMaterial({
    color: 0x435158,
    roughness: .12,
    metalness: .08,
    transparent: true,
    opacity: .68,
    depthWrite: false,
    clearcoat: 1,
    clearcoatRoughness: .08,
    envMapIntensity: .92,
    side: THREE.DoubleSide,
  });

  const upperFeatureGlow = new THREE.MeshStandardMaterial({
    color: 0xffd1a0,
    emissive: 0xffa957,
    emissiveIntensity: 1.15,
    roughness: .48,
  });

  const upperFeaturePlanter = new THREE.MeshStandardMaterial({
    color: 0x8c8175,
    roughness: .78,
    metalness: .02,
  });

  const upperFeatureGreen = new THREE.MeshStandardMaterial({
    color: 0x294a35,
    roughness: .94,
    metalness: 0,
  });

  // Read the existing facade's real bounds rather than hardcoding the
  // entire building position. This keeps the enhancement attached to
  // the already-authored upperLeftFacade even if earlier facade values move.
  upperLeftFacade.updateMatrixWorld(true);

  const upperLeftBounds = new THREE.Box3().setFromObject(upperLeftFacade);
  const upperLeftSize = new THREE.Vector3();
  const upperLeftCenter = new THREE.Vector3();

  upperLeftBounds.getSize(upperLeftSize);
  upperLeftBounds.getCenter(upperLeftCenter);

  // Feature occupies the central portion of the existing upper-left mass.
  // Keep breathing room around the original stone returns.
  const featureWidth = THREE.MathUtils.clamp(
    upperLeftSize.x * .52,
    1.65,
    2.45,
  );

  const featureHeight = THREE.MathUtils.clamp(
    upperLeftSize.y * .52,
    1.55,
    2.12,
  );

  const featureX = upperLeftCenter.x;
  const featureY =
    upperLeftBounds.min.y +
    upperLeftSize.y * .52;

  // Front-most exterior face.
  const featureZ = upperLeftBounds.max.z + .045;

  // ------------------------------------------------------------
  // DEEP ARCHITECTURAL RECESS / FRAME
  // ------------------------------------------------------------

  // Shadow reveal behind the whole composition.
  box(
    upperLeftFacade,
    [featureWidth + .28, featureHeight + .24, .09],
    [featureX, featureY, featureZ],
    upperFeatureCharcoal,
  );

  // Warm stone frame: top / bottom / sides.
  box(
    upperLeftFacade,
    [featureWidth + .42, .12, .18],
    [featureX, featureY + featureHeight / 2 + .12, featureZ + .04],
    upperFeatureStone,
  );

  box(
    upperLeftFacade,
    [featureWidth + .42, .12, .18],
    [featureX, featureY - featureHeight / 2 - .12, featureZ + .04],
    upperFeatureStone,
  );

  box(
    upperLeftFacade,
    [.12, featureHeight + .12, .18],
    [featureX - featureWidth / 2 - .15, featureY, featureZ + .04],
    upperFeatureStone,
  );

  box(
    upperLeftFacade,
    [.12, featureHeight + .12, .18],
    [featureX + featureWidth / 2 + .15, featureY, featureZ + .04],
    upperFeatureStone,
  );

  // ------------------------------------------------------------
  // SMOKY GLASS / WINDOW
  // ------------------------------------------------------------

  box(
    upperLeftFacade,
    [featureWidth * .66, featureHeight * .79, .035],
    [featureX + featureWidth * .13, featureY, featureZ + .105],
    upperFeatureGlass,
  );

  // Charcoal window surround.
  box(
    upperLeftFacade,
    [featureWidth * .7, .055, .055],
    [featureX + featureWidth * .13, featureY + featureHeight * .415, featureZ + .13],
    upperFeatureCharcoal,
  );

  box(
    upperLeftFacade,
    [featureWidth * .7, .055, .055],
    [featureX + featureWidth * .13, featureY - featureHeight * .415, featureZ + .13],
    upperFeatureCharcoal,
  );

  box(
    upperLeftFacade,
    [.055, featureHeight * .83, .055],
    [featureX - featureWidth * .22, featureY, featureZ + .13],
    upperFeatureCharcoal,
  );

  box(
    upperLeftFacade,
    [.055, featureHeight * .83, .055],
    [featureX + featureWidth * .48, featureY, featureZ + .13],
    upperFeatureCharcoal,
  );

  // Two slim mullions ? enough rhythm without making the window a cage.
  for (const offset of [-.08, .18]) {
    box(
      upperLeftFacade,
      [.035, featureHeight * .76, .04],
      [
        featureX + featureWidth * offset,
        featureY,
        featureZ + .145,
      ],
      upperFeatureCharcoal,
    );
  }

  // ------------------------------------------------------------
  // WALNUT PRIVACY SCREEN
  // ------------------------------------------------------------

  // Solid backing gives the fins depth.
  box(
    upperLeftFacade,
    [featureWidth * .24, featureHeight * .82, .075],
    [
      featureX - featureWidth * .37,
      featureY,
      featureZ + .09,
    ],
    upperFeatureWalnut,
  );

  for (let i = 0; i < 5; i++) {
    const x =
      featureX -
      featureWidth * .47 +
      i * (featureWidth * .05);

    box(
      upperLeftFacade,
      [.04, featureHeight * .88, .11],
      [x, featureY, featureZ + .17],
      i === 2 ? upperFeatureBronze : upperFeatureWalnut,
    );
  }

  // ------------------------------------------------------------
  // FLOATING CANOPY
  // ------------------------------------------------------------

  box(
    upperLeftFacade,
    [featureWidth + .72, .115, .58],
    [
      featureX,
      featureY + featureHeight / 2 + .28,
      featureZ + .22,
    ],
    upperFeatureWalnut,
  );

  // Dark underside gives depth.
  box(
    upperLeftFacade,
    [featureWidth + .56, .04, .48],
    [
      featureX,
      featureY + featureHeight / 2 + .205,
      featureZ + .23,
    ],
    upperFeatureCharcoal,
  );

  // Warm linear LED beneath canopy.
  box(
    upperLeftFacade,
    [featureWidth * .62, .022, .025],
    [
      featureX + featureWidth * .08,
      featureY + featureHeight / 2 + .18,
      featureZ + .49,
    ],
    upperFeatureGlow,
  );

  // ------------------------------------------------------------
  // FLOATING PLANTER LEDGE
  // ------------------------------------------------------------

  box(
    upperLeftFacade,
    [featureWidth + .44, .105, .42],
    [
      featureX,
      featureY - featureHeight / 2 - .25,
      featureZ + .22,
    ],
    upperFeatureStone,
  );

  // Warm shadow line below the ledge.
  box(
    upperLeftFacade,
    [featureWidth * .78, .025, .035],
    [
      featureX,
      featureY - featureHeight / 2 - .33,
      featureZ + .39,
    ],
    upperFeatureGlow,
  );

  // Two restrained planters.
  const planterY =
    featureY -
    featureHeight / 2 +
    .02;

  for (const px of [
    featureX - featureWidth * .25,
    featureX + featureWidth * .3,
  ]) {
    box(
      upperLeftFacade,
      [.32, .3, .3],
      [px, planterY, featureZ + .36],
      upperFeaturePlanter,
    );

    const crownA = new THREE.Mesh(
      new THREE.SphereGeometry(.21, 14, 10),
      upperFeatureGreen,
    );
    crownA.scale.set(.75, 1.25, .68);
    crownA.position.set(
      px - .06,
      planterY + .34,
      featureZ + .37,
    );
    upperLeftFacade.add(crownA);

    const crownB = new THREE.Mesh(
      new THREE.SphereGeometry(.18, 14, 10),
      upperFeatureGreen,
    );
    crownB.scale.set(.72, 1.05, .65);
    crownB.position.set(
      px + .1,
      planterY + .3,
      featureZ + .38,
    );
    upperLeftFacade.add(crownB);
  }

  // ------------------------------------------------------------
  // SMALL ARCHITECTURAL WALL LIGHT
  // ------------------------------------------------------------

  box(
    upperLeftFacade,
    [.085, .34, .075],
    [
      featureX + featureWidth * .4,
      featureY + featureHeight * .15,
      featureZ + .18,
    ],
    upperFeatureBronze,
  );

  box(
    upperLeftFacade,
    [.055, .23, .035],
    [
      featureX + featureWidth * .4,
      featureY + featureHeight * .15,
      featureZ + .225,
    ],
    upperFeatureGlow,
  );


  // ============================================================
  // PREMIUM COMPLETE ROOF SLAB V1
  // Gives the completed villa a believable RCC/lenter roof,
  // deep fascia, parapet and soffit instead of an open-box look.
  // The roof belongs to exteriorShell, so it disappears during
  // intentional interior cutaway states and restores with exterior.
  // ============================================================

  exteriorShell.updateMatrixWorld(true);

  const roofShellBounds = new THREE.Box3().setFromObject(exteriorShell);
  const roofShellSize = new THREE.Vector3();
  const roofShellCenterWorld = new THREE.Vector3();

  roofShellBounds.getSize(roofShellSize);
  roofShellBounds.getCenter(roofShellCenterWorld);

  const roofCenter = exteriorShell.worldToLocal(
    roofShellCenterWorld.clone()
  );

  const premiumRoofConcrete = new THREE.MeshStandardMaterial({
    color: 0xc9bbaa,
    roughness: .58,
    metalness: .015,
    envMapIntensity: .72,
  });

  const premiumRoofSoffit = new THREE.MeshStandardMaterial({
    color: 0xded4c6,
    roughness: .67,
    metalness: 0,
    envMapIntensity: .58,
  });

  const premiumRoofCharcoal = new THREE.MeshStandardMaterial({
    color: 0x161719,
    roughness: .3,
    metalness: .24,
    envMapIntensity: .9,
  });

  const premiumRoofBronze = new THREE.MeshStandardMaterial({
    color: 0x87643d,
    roughness: .34,
    metalness: .66,
    envMapIntensity: .95,
  });

  const premiumRoofGlow = new THREE.MeshStandardMaterial({
    color: 0xffd2a0,
    emissive: 0xffad60,
    emissiveIntensity: 1.15,
    roughness: .5,
  });

  // Keep the slab architectural rather than enormously covering
  // landscaping that may also be included in scene bounds.
  const roofWidth = THREE.MathUtils.clamp(
    roofShellSize.x * .82,
    7.0,
    10.4
  );

  const roofDepth = THREE.MathUtils.clamp(
    roofShellSize.z * .76,
    5.4,
    8.2
  );

  // Use the upper portion of the current exterior as the roof level.
  // Slight offset gives a visible, substantial slab thickness.
  const roofYWorld =
    roofShellBounds.max.y - .12;

  const roofPositionWorld = new THREE.Vector3(
    roofShellCenterWorld.x,
    roofYWorld,
    roofShellCenterWorld.z
  );

  const roofPosition =
    exteriorShell.worldToLocal(roofPositionWorld.clone());

  // ------------------------------------------------------------
  // MAIN RCC / LENTER SLAB
  // ------------------------------------------------------------

  box(
    exteriorShell,
    [roofWidth, .30, roofDepth],
    [
      roofPosition.x,
      roofPosition.y,
      roofPosition.z
    ],
    premiumRoofConcrete
  );

  // Bright soffit underneath makes the roof thickness readable.
  box(
    exteriorShell,
    [roofWidth - .24, .075, roofDepth - .24],
    [
      roofPosition.x,
      roofPosition.y - .19,
      roofPosition.z
    ],
    premiumRoofSoffit
  );

  // ------------------------------------------------------------
  // DEEP FRONT FASCIA
  // ------------------------------------------------------------

  box(
    exteriorShell,
    [roofWidth + .28, .38, .18],
    [
      roofPosition.x,
      roofPosition.y,
      roofPosition.z + roofDepth / 2 + .03
    ],
    premiumRoofConcrete
  );

  // Charcoal shadow line below front fascia.
  box(
    exteriorShell,
    [roofWidth - .4, .045, .10],
    [
      roofPosition.x,
      roofPosition.y - .19,
      roofPosition.z + roofDepth / 2 + .13
    ],
    premiumRoofCharcoal
  );

  // Warm concealed LED below fascia.
  box(
    exteriorShell,
    [roofWidth * .72, .022, .025],
    [
      roofPosition.x,
      roofPosition.y - .225,
      roofPosition.z + roofDepth / 2 + .19
    ],
    premiumRoofGlow
  );

  // ------------------------------------------------------------
  // SIDE FASCIAS
  // Makes the slab visible from the exact 3/4 angle in the screenshot.
  // ------------------------------------------------------------

  box(
    exteriorShell,
    [.18, .36, roofDepth],
    [
      roofPosition.x - roofWidth / 2 - .03,
      roofPosition.y,
      roofPosition.z
    ],
    premiumRoofConcrete
  );

  box(
    exteriorShell,
    [.18, .36, roofDepth],
    [
      roofPosition.x + roofWidth / 2 + .03,
      roofPosition.y,
      roofPosition.z
    ],
    premiumRoofConcrete
  );

  // ------------------------------------------------------------
  // PREMIUM PARAPET
  // Low enough to preserve the modern silhouette.
  // ------------------------------------------------------------

  const parapetY = roofPosition.y + .39;

  // Rear parapet
  box(
    exteriorShell,
    [roofWidth, .46, .14],
    [
      roofPosition.x,
      parapetY,
      roofPosition.z - roofDepth / 2 + .07
    ],
    premiumRoofConcrete
  );

  // Left parapet
  box(
    exteriorShell,
    [.14, .46, roofDepth - .15],
    [
      roofPosition.x - roofWidth / 2 + .07,
      parapetY,
      roofPosition.z
    ],
    premiumRoofConcrete
  );

  // Right parapet
  box(
    exteriorShell,
    [.14, .46, roofDepth - .15],
    [
      roofPosition.x + roofWidth / 2 - .07,
      parapetY,
      roofPosition.z
    ],
    premiumRoofConcrete
  );

  // Do NOT create a huge solid front parapet:
  // a lower front lip keeps the villa visually light.
  box(
    exteriorShell,
    [roofWidth * .58, .22, .13],
    [
      roofPosition.x + roofWidth * .08,
      roofPosition.y + .27,
      roofPosition.z + roofDepth / 2 - .065
    ],
    premiumRoofConcrete
  );

  // ------------------------------------------------------------
  // COPING / PREMIUM EDGE
  // ------------------------------------------------------------

  box(
    exteriorShell,
    [roofWidth + .06, .055, .19],
    [
      roofPosition.x,
      parapetY + .255,
      roofPosition.z - roofDepth / 2 + .07
    ],
    premiumRoofBronze
  );

  box(
    exteriorShell,
    [.19, .055, roofDepth],
    [
      roofPosition.x - roofWidth / 2 + .07,
      parapetY + .255,
      roofPosition.z
    ],
    premiumRoofBronze
  );

  box(
    exteriorShell,
    [.19, .055, roofDepth],
    [
      roofPosition.x + roofWidth / 2 - .07,
      parapetY + .255,
      roofPosition.z
    ],
    premiumRoofBronze
  );

  // ------------------------------------------------------------
  // FRONT FLOATING CANOPY
  // Adds premium depth above the balcony / upper glazing.
  // ------------------------------------------------------------

  const canopyWidth = roofWidth * .58;

  box(
    exteriorShell,
    [canopyWidth, .15, 1.05],
    [
      roofPosition.x - roofWidth * .12,
      roofPosition.y - .38,
      roofPosition.z + roofDepth / 2 + .20
    ],
    premiumRoofCharcoal
  );

  // Timber/bronze horizontal blades under the canopy.
  for (let i = 0; i < 5; i++) {
    box(
      exteriorShell,
      [canopyWidth - .16, .055, .085],
      [
        roofPosition.x - roofWidth * .12,
        roofPosition.y - .49,
        roofPosition.z + roofDepth / 2 -.15 + i * .18
      ],
      premiumRoofBronze
    );
  }




  // ============================================================
  // SCENE03 REAL STRUCTURAL LENTER V3
  // Ground-floor RCC roof / first-floor structural slab.
  //
  // This intentionally belongs to walls[] so Scene 03 controls
  // its visibility and build animation.
  // ============================================================

  const interStoreyLenter = new THREE.Group();
  interStoreyLenter.name = 'scene03-structural-interstorey-lenter';

  const scene03LenterConcrete = new THREE.MeshStandardMaterial({
    color: 0xb9aea0,
    roughness: 0.82,
    metalness: 0.01,
    envMapIntensity: 0.66,
    side: THREE.DoubleSide,
  });

  const scene03LenterEdge = new THREE.MeshStandardMaterial({
    color: 0x8b8175,
    roughness: 0.84,
    metalness: 0.015,
    envMapIntensity: 0.58,
    side: THREE.DoubleSide,
  });

  const scene03LenterSoffit = new THREE.MeshStandardMaterial({
    color: 0xd0c6b9,
    roughness: 0.88,
    metalness: 0,
    envMapIntensity: 0.56,
    side: THREE.DoubleSide,
  });


  // ------------------------------------------------------------
  // MAIN FLOOR PLATE
  //
  // Upper finished-floor surfaces in this villa begin at approx
  // y = 3.55.
  //
  // Therefore:
  //
  // slab centre = 3.38
  // thickness   = 0.30
  // slab top    = 3.53
  //
  // So the upper floor sits directly on this concrete lenter.
  // ------------------------------------------------------------

  // FRONT + CENTRAL LARGE FLOOR PLATE
  //
  // Covers the full visible front portion of the house.
  box(
    interStoreyLenter,
    [12.0, 0.30, 5.90],
    [0, 3.38, 1.25],
    scene03LenterConcrete,
  );


  // ------------------------------------------------------------
  // REAR FLOOR PLATES
  //
  // Split into left/right sections so the staircase retains
  // a genuine opening and the later walkthrough does not travel
  // through a solid concrete ceiling.
  // ------------------------------------------------------------

  box(
    interStoreyLenter,
    [3.30, 0.30, 2.60],
    [-4.35, 3.38, -3.00],
    scene03LenterConcrete,
  );

  box(
    interStoreyLenter,
    [6.90, 0.30, 2.60],
    [2.55, 3.38, -3.00],
    scene03LenterConcrete,
  );


  // ------------------------------------------------------------
  // THICK FRONT RCC DROP BEAM
  //
  // This is deliberately substantial because the Scene-03
  // front/three-quarter camera must CLEARLY see a horizontal
  // concrete band between ground floor and upper floor.
  // ------------------------------------------------------------

  box(
    interStoreyLenter,
    [12.25, 0.52, 0.34],
    [0, 3.27, 4.19],
    scene03LenterEdge,
  );


  // Light soffit under front beam.
  box(
    interStoreyLenter,
    [11.75, 0.055, 0.39],
    [0, 2.995, 4.17],
    scene03LenterSoffit,
  );


  // ------------------------------------------------------------
  // RIGHT-SIDE RCC BEAM
  //
  // Your screenshot strongly exposes this side of the building,
  // so this continuous member makes the lenter impossible to miss.
  // ------------------------------------------------------------

  box(
    interStoreyLenter,
    [0.34, 0.52, 8.45],
    [5.94, 3.27, 0],
    scene03LenterEdge,
  );


  // Right-side soffit.
  box(
    interStoreyLenter,
    [0.39, 0.055, 8.00],
    [5.92, 2.995, 0],
    scene03LenterSoffit,
  );


  // ------------------------------------------------------------
  // LEFT-SIDE RCC BEAM
  // ------------------------------------------------------------

  box(
    interStoreyLenter,
    [0.34, 0.52, 8.45],
    [-5.94, 3.27, 0],
    scene03LenterEdge,
  );


  // ------------------------------------------------------------
  // REAR RCC BEAM
  // ------------------------------------------------------------

  box(
    interStoreyLenter,
    [12.25, 0.46, 0.30],
    [0, 3.30, -4.22],
    scene03LenterEdge,
  );


  // ------------------------------------------------------------
  // STAIRCASE OPENING EDGE BEAMS
  //
  // Approximate stair opening:
  //
  // x = -2.70 .. -0.90
  // z = -4.30 .. -1.70
  // ------------------------------------------------------------

  box(
    interStoreyLenter,
    [0.24, 0.44, 2.62],
    [-2.64, 3.30, -3.00],
    scene03LenterEdge,
  );

  box(
    interStoreyLenter,
    [0.24, 0.44, 2.62],
    [-0.96, 3.30, -3.00],
    scene03LenterEdge,
  );

  box(
    interStoreyLenter,
    [1.92, 0.44, 0.24],
    [-1.80, 3.30, -1.72],
    scene03LenterEdge,
  );


  // ------------------------------------------------------------
  // STRUCTURAL CORNER THICKENING
  // ------------------------------------------------------------

  for (const [x, z] of [
    [-5.82, 4.04],
    [5.82, 4.04],
    [-5.82, -4.04],
    [5.82, -4.04],
  ] as [number, number][]) {
    box(
      interStoreyLenter,
      [0.42, 0.62, 0.42],
      [x, 3.20, z],
      scene03LenterEdge,
    );
  }


  // ------------------------------------------------------------
  // CRITICAL WIRING
  //
  // root.add() renders it in the villa world.
  //
  // walls.push() makes Scene 03 treat the slab as a structural
  // construction component rather than a decorative final facade.
  // ------------------------------------------------------------

  root.add(interStoreyLenter);
  walls.push(interStoreyLenter);

  batchRoom(upperLeftFacade);
  upperLeftFacade.removeFromParent();
  batchRoom(exteriorShell);
  exteriorShell.add(upperLeftFacade);
  // The two ground-suite doors must stay animatable, so lift their pivots out of `living` before the
  // static merge freezes every mesh at its current transform, then hang them back on as live objects.
  guestDoorPivot.removeFromParent();
  bathDoorPivot.removeFromParent();
  [living,dining,kitchen,stairs,landing,master,masterBath,commonBath,secondBedroom,terrace,circulation].forEach(batchRoom);
  living.add(guestDoorPivot, bathDoorPivot);

  furnitureGroup.add(circulation,living,dining,kitchen,stairs,landing,master,masterBath,commonBath,secondBedroom,terrace);
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
    exteriorShell,
    upperLeftFacade,
    mainDoor,
    groundBedroomDoor: guestDoorPivot,
    groundBathDoor: bathDoorPivot,
    rooms: { living, dining, kitchen, stairs, landing, master, masterBath, commonBath, secondBedroom, terrace },
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

  // Shadows: opaque architectural surfaces cast/receive; transparent glass and emissive fixtures do
  // neither. This keeps glass from reading as a dark wall and avoids wasted shadow draws.
  villa.root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      const materials = Array.isArray(m.material) ? m.material : [m.material];
      const shadowed = materials.every((material) => {
        const standard = material instanceof THREE.MeshStandardMaterial ? material : null;
        return !material.transparent && (standard?.emissiveIntensity ?? 0) === 0;
      });
      m.castShadow = shadowed;
      m.receiveShadow = shadowed;
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
      exteriorShell: villa.exteriorShell,
      upperLeftFacade: villa.upperLeftFacade,
      mainDoor: villa.mainDoor,
      groundBedroomDoor: villa.groundBedroomDoor,
      groundBathDoor: villa.groundBathDoor,
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
