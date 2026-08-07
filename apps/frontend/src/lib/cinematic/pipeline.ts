import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';

/**
 * Photoreal post-processing pipeline + adaptive quality (weak-machine safe).
 *
 * RenderPass (linear HDR) -> SSAO (contact occlusion) -> UnrealBloom (window glow) -> Vignette ->
 * OutputPass (ACES filmic tone map + sRGB). The renderer's toneMapping is ACES, applied
 * by OutputPass in the composer path and by the renderer directly in the degraded path.
 *
 * ADAPTIVE: on sustained low FPS it steps down a quality tier rather than freezing —
 *   tier 0 full · tier 1 drop SSAO · tier 2 drop post + shadows + DPR->1.
 * It never oscillates (degrade-only) so scrubbing stays smooth.
 */
export interface Pipeline {
  render: () => void;
  setSize: (w: number, h: number) => void;
  adapt: (fps: number) => void;
  tier: () => number;
  dispose: () => void;
}

export function createPipeline(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  invalidate: () => void,
): Pipeline {
  const size = renderer.getSize(new THREE.Vector2());

  const target = new THREE.WebGLRenderTarget(size.x, size.y, {
    type: THREE.HalfFloatType, // HDR range so bloom reads true highlights
    samples: 2, // cheap MSAA on the HDR target
  });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));

  const ssao = new SSAOPass(scene, camera, size.x, size.y);
  ssao.kernelRadius = 0.5;
  ssao.minDistance = 0.0015;
  ssao.maxDistance = 0.06;
  composer.addPass(ssao);

  const bloom = new UnrealBloomPass(size.clone(), 0.18, 0.25, 1.25); // restrained fixture/window highlights only
  composer.addPass(bloom);

  const dof = new BokehPass(scene, camera, {
    focus: 14,
    aperture: 0.000012,
    maxblur: 0.003,
  });
  composer.addPass(dof);

  const vignette = new ShaderPass(VignetteShader);
  vignette.uniforms.offset.value = 0.95;
  vignette.uniforms.darkness.value = 1.15;
  composer.addPass(vignette);
  // OutputPass stays last: one ACES filmic transform + one linear-to-sRGB conversion for the
  // composer path. The LOW-tier direct path uses the renderer's same ACES configuration once.
  composer.addPass(new OutputPass());

  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency || 8;
  const gpu = renderer.getContext().getParameter(renderer.getContext().RENDERER) as string;
  const softwareGpu = /swiftshader|llvmpipe|software/i.test(gpu);
  let tier = softwareGpu || memory <= 4 || cores <= 4 ? 2 : memory <= 6 || cores <= 6 ? 1 : 0;
  let usePost = true;
  let lowStreak = 0;
  const baseDpr = renderer.getPixelRatio();

  const applyTier = (): void => {
    ssao.enabled = tier < 1;
    dof.enabled = tier < 1;
    usePost = tier < 2;
    renderer.shadowMap.enabled = tier < 2;
    if (tier >= 2 && renderer.getPixelRatio() !== 1) {
      renderer.setPixelRatio(1);
      const s = renderer.getSize(new THREE.Vector2());
      composer.setSize(s.x, s.y);
    }
    renderer.shadowMap.needsUpdate = true;
    invalidate();
  };
  applyTier();

  return {
    render: () => {
      if (usePost) composer.render();
      else renderer.render(scene, camera);
    },
    setSize: (w, h) => {
      composer.setSize(w, h);
      ssao.setSize(w, h);
      bloom.setSize(w, h);
    },
    adapt: (fps) => {
      if (fps > 0 && fps < 26) {
        lowStreak += 1;
        if (lowStreak >= 3 && tier < 2) {
          tier += 1;
          lowStreak = 0;
          applyTier();
        }
      } else {
        lowStreak = 0;
      }
    },
    tier: () => tier,
    dispose: () => {
      renderer.setPixelRatio(baseDpr);
      target.dispose();
      composer.dispose();
    },
  };
}
