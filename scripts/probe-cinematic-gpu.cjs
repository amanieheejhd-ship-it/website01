const { chromium } = require('@playwright/test');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.mouse.move(180, 180);
  await page.mouse.click(180, 180);
  await page.mouse.wheel(0, 20);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await page.evaluate(() => typeof window.__fardeenBenchmark === 'function')) break;
    await page.mouse.wheel(0, 12);
    await page.waitForTimeout(400);
  }
  await page.waitForFunction(() => typeof window.__fardeenBenchmark === 'function', null, { timeout: 60000 });
  await page.evaluate(() => {
    const spacer = document.querySelector('[data-cinematic-spacer]');
    window.scrollTo(0, spacer.offsetTop);
  });
  await page.waitForTimeout(1200);
  const renderer = await page.evaluate(() => {
    const canvas = document.querySelector('[data-cinematic-spacer] canvas');
    const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl?.getParameter(gl.RENDERER);
  });
  const samples = [];
  for (const sample of [
    { label: 'ground-floor', progress: .58 },
    { label: 'upper-floor', progress: .82 },
    { label: 'terrace/full-build', progress: .94 },
  ]) {
    await page.evaluate((progress) => window.__fardeenSeek(progress), sample.progress);
    await page.waitForTimeout(700);
    const perf = await page.evaluate(() => window.__fardeenBenchmark(2500));
    samples.push({ ...sample, ...perf });
  }
  const perf = samples.reduce((worst, sample) => sample.fps < worst.fps ? sample : worst);
  await page.evaluate(({ reading, samples }) => {
    const badge = document.createElement('div');
    badge.textContent = `${reading.fps} FPS worst-case | D3D11 | tier ${reading.tier} | ${reading.drawCalls} draws | ${reading.label}`;
    badge.style.cssText = 'position:fixed;right:22px;top:86px;z-index:99999;padding:11px 15px;background:#080808e8;border:1px solid #c8a15a;color:#e5c987;font:600 14px system-ui;border-radius:8px';
    badge.title = JSON.stringify(samples);
    document.body.appendChild(badge);
  }, { reading: perf, samples });
  await page.evaluate((progress) => window.__fardeenSeek(progress), perf.progress);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'artifacts/cinematic-hardware-fps.png' });
  const result = { renderer, perf, samples };
  fs.writeFileSync('artifacts/cinematic-hardware-fps.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  await browser.close();
})().catch((error) => { console.error(error); process.exit(1); });
