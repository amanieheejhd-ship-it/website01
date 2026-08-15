const { chromium } = require('@playwright/test');
const fs = require('node:fs');

const baseUrl = process.env.CINEMATIC_VERIFY_URL || 'http://127.0.0.1:3005';
const sceneCount = 13;

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.mouse.move(180, 180);
  await page.mouse.click(180, 180);
  await page.mouse.wheel(0, 32);
  for (let attempt = 0; attempt < 24; attempt += 1) {
    if (await page.evaluate(() => typeof window.__fardeenSetCamera === 'function')) break;
    await page.mouse.move(180 + attempt, 180);
    await page.mouse.wheel(0, 12);
    await page.waitForTimeout(500);
  }
  await page.waitForFunction(() => typeof window.__fardeenSetCamera === 'function', null, { timeout: 60000 });
  await page.evaluate(() => {
    const spacer = document.querySelector('[data-cinematic-spacer]');
    window.scrollTo(0, spacer.offsetTop);
  });
  await page.waitForTimeout(900);
  const cinematic = page.locator('[data-cinematic-spacer] > div');
  await cinematic.scrollIntoViewIfNeeded();
  fs.mkdirSync('artifacts/upper-left-facade', { recursive: true });

  const seek = async (time) => {
    await page.evaluate((progress) => window.__fardeenSeek(progress), time / sceneCount);
    await page.waitForTimeout(500);
  };
  const camera = async (position, target, name) => {
    await page.evaluate(({ position, target }) => window.__fardeenSetCamera({ position, target }), { position, target });
    await page.waitForTimeout(350);
    await cinematic.screenshot({ path: `artifacts/upper-left-facade/${name}.png` });
    return page.evaluate(() => window.__fardeenCameraState());
  };

  await seek(4.8);
  const front = await camera(
    { x: 0, y: 4.45, z: 16.5 },
    { x: -1.15, y: 3.25, z: 1.5 },
    '01-completed-front',
  );
  const frontLeft = await camera(
    { x: -11.5, y: 5.15, z: 14.2 },
    { x: -2.25, y: 3.65, z: 1.15 },
    '02-completed-front-left',
  );
  const upperLeft = await camera(
    { x: -8.7, y: 5.35, z: 10.4 },
    { x: -3.35, y: 4.95, z: 2.45 },
    '03-upper-left-detail',
  );
  const approachState = await page.evaluate(() => window.__fardeenVisibilityState());

  await seek(8.8);
  await cinematic.screenshot({ path: 'artifacts/upper-left-facade/04-master-interior.png' });
  const masterState = await page.evaluate(() => window.__fardeenVisibilityState());

  await seek(12.8);
  await cinematic.screenshot({ path: 'artifacts/upper-left-facade/05-final-scene-13.png' });
  const finalState = await page.evaluate(() => window.__fardeenVisibilityState());

  await seek(8.8);
  await cinematic.screenshot({ path: 'artifacts/upper-left-facade/06-reverse-to-master.png' });
  const reverseState = await page.evaluate(() => window.__fardeenVisibilityState());

  const checks = {
    approachClosed: approachState.upper && approachState.roof && approachState.exteriorShell && !approachState.interior,
    masterCutaway: !masterState.upper && !masterState.roof && !masterState.exteriorShell && masterState.rooms.master,
    finalRestored: finalState.upper && finalState.roof && finalState.exteriorShell && !finalState.interior,
    reverseRestoredCutaway: !reverseState.upper && !reverseState.roof && !reverseState.exteriorShell && reverseState.rooms.master,
  };
  const result = { baseUrl, checks, camera: { front, frontLeft, upperLeft }, errors };
  fs.writeFileSync('artifacts/upper-left-facade/state.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  const failed = Object.values(checks).some((value) => !value) || errors.length;
  // SwiftShader can occasionally keep Chromium's GPU process alive after all pages close on
  // Windows CI. Cap teardown so a completed visual acceptance run cannot linger indefinitely.
  await Promise.race([browser.close(), new Promise((resolve) => setTimeout(resolve, 2500))]);
  process.exit(failed ? 2 : 0);
})().catch((error) => { console.error(error); process.exit(1); });
