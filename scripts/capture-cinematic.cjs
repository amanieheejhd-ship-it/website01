const { chromium } = require('@playwright/test');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('http://127.0.0.1:3005', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.mouse.move(200, 200);
  await page.mouse.wheel(0, 40);
  await page.keyboard.press('ArrowDown');
  await page.waitForFunction(() => typeof window.__fardeenSeek === 'function', null, { timeout: 30000 });
  const cdp = await page.context().newCDPSession(page);
  await page.evaluate(() => {
    const spacer = document.querySelector('[data-cinematic-spacer]');
    window.scrollTo(0, spacer.offsetTop);
  });
  await page.waitForTimeout(300);
  const capture = async (file) => {
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
  };
  const seek = async (progress, file) => {
    await page.evaluate((p) => window.__fardeenSeek(p), progress);
    await page.waitForTimeout(700);
    await capture(file);
  };
  await seek(0.27, 'artifacts/cinematic-before-shell.png');
  await seek(0.965, 'artifacts/cinematic-after-villa.png');
  await seek(0.545, 'artifacts/cinematic-interior-living.png');
  const perf = await page.evaluate(() => window.__fardeenBenchmark(600));
  await page.evaluate((reading) => {
    const badge = document.createElement('div');
    badge.id = 'fps-proof';
    badge.textContent = `${reading.fps} FPS · DPR ${reading.dpr} · tier ${reading.tier} · ${reading.drawCalls} draws`;
    badge.style.cssText = 'position:fixed;right:24px;top:24px;z-index:99999;padding:12px 16px;background:#080808dd;border:1px solid #c8a15a;color:#e5c987;font:600 15px system-ui;border-radius:8px';
    document.body.appendChild(badge);
  }, perf);
  console.log(JSON.stringify(perf));
  await capture('artifacts/cinematic-fps.png');
  await browser.close();
})().catch((error) => { console.error(error); process.exit(1); });
