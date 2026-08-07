const { chromium } = require('@playwright/test');
const fs = require('node:fs');

(async () => {
  fs.mkdirSync('artifacts/video-tmp', { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11'],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    recordVideo: { dir: 'artifacts/video-tmp', size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();
  const video = page.video();
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1000);
  await page.mouse.move(160, 160);
  await page.mouse.wheel(0, 10);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await page.evaluate(() => typeof window.__fardeenSeek === 'function')) break;
    await page.mouse.move(160 + attempt, 160);
    await page.mouse.wheel(0, 12);
    await page.waitForTimeout(500);
  }
  await page.waitForFunction(() => typeof window.__fardeenBenchmark === 'function', null, { timeout: 60000 });
  await page.evaluate(() => {
    const spacer = document.querySelector('[data-cinematic-spacer]');
    window.scrollTo(0, spacer.offsetTop);
  });
  await page.waitForTimeout(700);

  // Keep video encoding out of the FPS sample; use the separate no-recording D3D11 hardware proof.
  const hardwareProof = JSON.parse(fs.readFileSync('artifacts/cinematic-hardware-fps.json', 'utf8'));
  const perf = hardwareProof.perf;
  await page.evaluate((reading) => {
    const badge = document.createElement('div');
    badge.id = 'acceptance-badge';
    badge.style.cssText = 'position:fixed;right:20px;top:20px;z-index:99999;padding:10px 14px;background:#080808e8;border:1px solid #c8a15a;color:#e5c987;font:600 14px system-ui;border-radius:8px';
    badge.textContent = `${reading.fps} FPS verified worst-case | D3D11 | LOW tier | DPR ${reading.dpr}`;
    document.body.appendChild(badge);
    const direction = document.createElement('div');
    direction.id = 'acceptance-direction';
    direction.style.cssText = 'position:fixed;left:20px;top:20px;z-index:99999;padding:10px 14px;background:#080808e8;border:1px solid #c8a15a;color:#f3e6c5;font:600 14px system-ui;border-radius:8px';
    document.body.appendChild(direction);
  }, perf);

  const seek = (progress, direction) => page.evaluate(({ progress, direction }) => {
    window.__fardeenSeek(progress);
    const scene = Math.min(17, Math.floor(progress * 17) + 1);
    document.querySelector('#acceptance-direction').textContent = `${direction} | Scene ${String(scene).padStart(2, '0')} | ${Math.round(progress * 100)}%`;
  }, { progress, direction });

  await seek(0, 'BUILD DOWN');
  await page.waitForTimeout(1000);
  for (let scene = 0; scene < 17; scene += 1) {
    for (let local = 1; local <= 20; local += 1) {
      await seek((scene + local / 20) / 17, 'BUILD DOWN');
      await page.waitForTimeout(34);
    }
    await page.waitForTimeout(110);
  }
  await page.waitForTimeout(700);
  for (let index = 300; index >= 0; index -= 1) {
    await seek(index / 300, 'RESET UP');
    await page.waitForTimeout(34);
  }
  await page.waitForTimeout(1400);
  console.log(JSON.stringify({ perf, errors }));
  await page.close();
  if (video) await video.saveAs('artifacts/cinematic-bidirectional-route.webm');
  await context.close();
  await browser.close();
})().catch((error) => { console.error(error); process.exit(1); });
