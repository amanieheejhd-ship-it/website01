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
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.mouse.move(180, 180);
  await page.mouse.click(180, 180);
  await page.mouse.wheel(0, 24);
  await page.keyboard.press('ArrowDown');
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await page.evaluate(() => typeof window.__fardeenSeek === 'function')) break;
    await page.mouse.move(180 + attempt, 180);
    await page.mouse.wheel(0, 12);
    await page.waitForTimeout(500);
  }
  if (!(await page.evaluate(() => typeof window.__fardeenSeek === 'function'))) {
    const diagnostic = await page.evaluate(() => ({
      spacer: Boolean(document.querySelector('[data-cinematic-spacer]')),
      staticTour: Boolean(document.querySelector('[aria-label="Villa interior rooms"]')),
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      desktop: matchMedia('(min-width: 1024px)').matches,
      webgl: Boolean(document.createElement('canvas').getContext('webgl')),
      body: document.body.innerText.slice(0, 300),
    }));
    throw new Error(`cinematic did not activate: ${JSON.stringify({ diagnostic, errors })}`);
  }
  await page.waitForFunction(() => typeof window.__fardeenSeek === 'function', null, { timeout: 60000 });
  await page.evaluate(() => {
    const spacer = document.querySelector('[data-cinematic-spacer]');
    window.scrollTo(0, spacer.offsetTop);
  });
  await page.waitForTimeout(900);
  fs.mkdirSync('artifacts/cinematic-final', { recursive: true });

  const sample = async (time, name) => {
    const cinematic = page.locator('[data-cinematic-spacer] > div');
    await cinematic.scrollIntoViewIfNeeded();
    await page.evaluate((progress) => window.__fardeenSeek(progress), time / sceneCount);
    await page.waitForTimeout(450);
    const state = await page.evaluate(() => window.__fardeenVisibilityState());
    if (process.env.CINEMATIC_SCREENSHOTS !== '0') {
      await cinematic.screenshot({ path: `artifacts/cinematic-final/${name}.png` });
    }
    return state;
  };

  if (process.env.CINEMATIC_FINAL_ONLY === '1') {
    const final = await sample(12.8, 'final-closed');
    const perf = process.env.CINEMATIC_PERF === '1'
      ? await page.evaluate(() => window.__fardeenBenchmark(900))
      : undefined;
    console.log(JSON.stringify({ final, perf, errors }));
    await browser.close();
    return;
  }

  const approach = await sample(4.8, 'approach-closed');
  const interior = await sample(5.5, 'interior-cutaway');
  const terrace = await sample(11.8, 'terrace-cutaway');
  const final = await sample(12.8, 'final-closed');
  const reverseInterior = await sample(11.8, 'reverse-interior');
  const reverseApproach = await sample(4.8, 'reverse-approach');
  const top = await sample(0, 'reverse-top-empty');

  const roomsHidden = (state) => Object.values(state.rooms).every((visible) => visible === false);
  const checks = {
    approachClosed: approach.upper && approach.roof && approach.exteriorShell && !approach.interior,
    interiorCutaway: !interior.upper && !interior.roof && !interior.exteriorShell && interior.interior,
    terraceCutaway: !terrace.upper && !terrace.roof && !terrace.exteriorShell && terrace.rooms.terrace,
    finalClosed: final.upper && final.roof && final.exteriorShell && !final.interior && !final.furniture && roomsHidden(final),
    reverseInteriorRestored: !reverseInterior.upper && !reverseInterior.roof && !reverseInterior.exteriorShell && reverseInterior.interior,
    reverseApproachRestored: reverseApproach.upper && reverseApproach.roof && reverseApproach.exteriorShell && !reverseApproach.interior,
    reverseTopClear: !top.slab && !top.upper && !top.roof && !top.exteriorShell && !top.interior && roomsHidden(top),
  };
  const result = { baseUrl, checks, states: { approach, interior, terrace, final, reverseInterior, reverseApproach, top }, errors };
  fs.writeFileSync('artifacts/cinematic-final/state.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  await browser.close();
  if (Object.values(checks).some((value) => !value) || errors.length) process.exitCode = 2;
})().catch((error) => { console.error(error); process.exit(1); });
