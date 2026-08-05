import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

/**
 * Asset loaders for the cinematic layer (all lazy — nothing here runs at SSR or before the canvas is
 * activated). Real CC0 assets (Poly Haven) live under /public/cinematic and are fetched same-origin.
 * Every loader rejects on failure so callers can fall back to the procedural look — a scene never
 * breaks because an asset is missing.
 */

export const CINEMATIC_BASE = '/cinematic';

const texLoader = new THREE.TextureLoader();

export function loadTexture(
  path: string,
  opts: { srgb?: boolean; repeat?: number; aniso?: number } = {},
): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    texLoader.load(
      path,
      (tex) => {
        tex.colorSpace = opts.srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        if (opts.repeat) tex.repeat.set(opts.repeat, opts.repeat);
        tex.anisotropy = opts.aniso ?? 4;
        resolve(tex);
      },
      undefined,
      () => reject(new Error(`texture failed: ${path}`)),
    );
  });
}

export interface PbrMaps {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap?: THREE.Texture;
  metalnessMap?: THREE.Texture;
}

/** Load a Poly Haven-style PBR set: diff (sRGB) + nor_gl + arm (AO/Rough/Metal packed; G=rough, B=metal). */
export async function loadPbr(folder: string, repeat = 1): Promise<PbrMaps> {
  const dir = `${CINEMATIC_BASE}/textures/${folder}`;
  const [map, normalMap] = await Promise.all([
    loadTexture(`${dir}/diff.jpg`, { srgb: true, repeat }),
    loadTexture(`${dir}/nor.jpg`, { repeat }),
  ]);
  // arm is the packed AO+Rough+Metal map; if a source lacked it the downloader saved plain rough.
  const arm = await loadTexture(`${dir}/arm.jpg`, { repeat }).catch(() => null);
  const rough = arm ? null : await loadTexture(`${dir}/rough.jpg`, { repeat }).catch(() => null);
  return {
    map,
    normalMap,
    roughnessMap: arm ?? rough ?? undefined,
    metalnessMap: arm ?? undefined,
  };
}

/** Load an equirectangular HDRI and pre-filter it with PMREM into an environment map (IBL + reflections). */
export function loadEnvironment(renderer: THREE.WebGLRenderer, file: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    new RGBELoader().load(
      `${CINEMATIC_BASE}/hdri/${file}`,
      (hdr) => {
        const pmrem = new THREE.PMREMGenerator(renderer);
        pmrem.compileEquirectangularShader();
        const env = pmrem.fromEquirectangular(hdr).texture;
        hdr.dispose();
        pmrem.dispose();
        resolve(env);
      },
      undefined,
      () => reject(new Error(`hdri failed: ${file}`)),
    );
  });
}

/**
 * GLTF/GLB loader wired for compressed assets: DRACO geometry, KTX2 (Basis) textures, and meshopt.
 * Decoders are served from /public (copied from three at build time — see scripts/copy-three-decoders).
 * This is the loader SEAM: drop a real (or purchased) villa/furniture GLB under /public/cinematic/models
 * and load it here; on any failure the caller keeps the procedural geometry.
 */
export function createModelLoader(renderer: THREE.WebGLRenderer): GLTFLoader {
  const draco = new DRACOLoader().setDecoderPath('/draco/');
  const ktx2 = new KTX2Loader().setTranscoderPath('/basis/').detectSupport(renderer);
  return new GLTFLoader().setDRACOLoader(draco).setKTX2Loader(ktx2).setMeshoptDecoder(MeshoptDecoder);
}

export function loadModel(loader: GLTFLoader, file: string): Promise<GLTF> {
  return new Promise((resolve, reject) => {
    loader.load(
      `${CINEMATIC_BASE}/models/${file}`,
      (gltf) => resolve(gltf),
      undefined,
      () => reject(new Error(`model failed: ${file}`)),
    );
  });
}
