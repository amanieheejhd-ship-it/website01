const { chromium } = require('@playwright/test');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
  });
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.mouse.move(180, 180);
  await page.mouse.click(180, 180);
  await page.mouse.wheel(0, 20);
  await page.keyboard.press('ArrowDown');
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await page.evaluate(() => typeof window.__fardeenSeek === 'function')) break;
    await page.mouse.move(180 + attempt, 180);
    await page.mouse.wheel(0, 12);
    await page.waitForTimeout(500);
  }
  if (!(await page.evaluate(() => typeof window.__fardeenSeek === 'function'))) {
    console.log(JSON.stringify(await page.evaluate(() => ({
      spacer: Boolean(document.querySelector('[data-cinematic-spacer]')),
      staticTour: Boolean(document.querySelector('[aria-label="Villa interior rooms"]')),
      reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
      webgl: Boolean(document.createElement('canvas').getContext('webgl')),
    })), errors));
    await browser.close();
    process.exit(2);
  }
  await page.waitForFunction(() => typeof window.__fardeenSeek === 'function', null, { timeout: 60000 });
  await page.evaluate(() => {
    const spacer = document.querySelector('[data-cinematic-spacer]');
    window.scrollTo(0, spacer.offsetTop);
  });
  await page.waitForFunction(() => {
    const label = [...document.querySelectorAll('span')].find((node) => node.textContent.toLowerCase().includes('preparing the estate'));
    return Boolean(label?.parentElement?.classList.contains('opacity-0'));
  }, null, { timeout: 30000 });
  await page.waitForTimeout(1000);
  const cdp = await page.context().newCDPSession(page);
  fs.mkdirSync('artifacts/sections', { recursive: true });
  const capture = async (progress, file) => {
    await page.evaluate((value) => window.__fardeenSeek(value), progress);
    await page.waitForTimeout(500);
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
  };
  const sceneKeys = ['empty-land','foundation','structure','villa-transformation','approach-gate','living-hall','kitchen-dining','staircase','master-bedroom','attached-washroom','second-bedroom','terrace','final-reveal'];
  const sectionProof = [];
  for (let index = 0; index < sceneKeys.length; index += 1) {
    const file = `artifacts/sections/${String(index + 1).padStart(2, '0')}-${sceneKeys[index]}.png`;
    await capture((index + .8) / sceneKeys.length, file);
    const visibleCaption = await page.evaluate(() => [...document.querySelectorAll('[data-scene-copy]')]
      .filter((element) => Number(getComputedStyle(element).opacity) > .5)
      .map((element) => element.textContent.trim().replace(/\s+/g, ' ')));
    sectionProof.push({ key: sceneKeys[index], visibleCaption, file });
  }
  fs.copyFileSync('artifacts/sections/07-kitchen-dining.png', 'artifacts/interior-kitchen.png');
  fs.copyFileSync('artifacts/sections/09-master-bedroom.png', 'artifacts/interior-master.png');
  fs.copyFileSync('artifacts/sections/10-attached-washroom.png', 'artifacts/interior-bathroom.png');

  const readVisibility = (progress) => page.evaluate((value) => {
    window.__fardeenSeek(value);
    return window.__fardeenVisibilityState();
  }, progress);
  const tracked = (state) => ({
    upper: state.upper,
    roof: state.roof,
    exteriorShell: state.exteriorShell,
    interior: state.interior,
    furniture: state.furniture,
    ...Object.fromEntries(Object.entries(state.rooms).map(([name, visible]) => [`room:${name}`, visible])),
  });
  const topInitial = await readVisibility(0);
  const approach = await readVisibility(4.8 / sceneKeys.length);
  const interiorTransition = await readVisibility(5.5 / sceneKeys.length);
  const terrace = await readVisibility(11.8 / sceneKeys.length);
  const finalExterior = await readVisibility(12.8 / sceneKeys.length);
  const reverseInterior = await readVisibility(11.8 / sceneKeys.length);
  const reverseApproach = await readVisibility(4.8 / sceneKeys.length);
  const topAfterReverse = await readVisibility(0);
  await capture(0, 'artifacts/top-empty-after-reverse.png');
  const topClear = (state) => Object.entries(state)
    .filter(([name]) => name !== 'rooms')
    .every(([, visible]) => visible === false)
    && Object.values(state.rooms).every((visible) => visible === false);
  const visibility = {
    topInitial,
    approach: tracked(approach),
    interiorTransition: tracked(interiorTransition),
    terrace: tracked(terrace),
    finalExterior: tracked(finalExterior),
    reverseInterior: tracked(reverseInterior),
    reverseApproach: tracked(reverseApproach),
    topAfterReverse,
    topInitialClear: topClear(topInitial),
    topAfterReverseClear: topClear(topAfterReverse),
    approachClosed: approach.upper && approach.roof && approach.exteriorShell && !approach.interior,
    interiorCutaway: !interiorTransition.upper && !interiorTransition.roof && !interiorTransition.exteriorShell && interiorTransition.interior,
    terraceCutaway: !terrace.upper && !terrace.roof && !terrace.exteriorShell && terrace.rooms.terrace,
    finalClosed: finalExterior.upper && finalExterior.roof && finalExterior.exteriorShell
      && !finalExterior.interior && !finalExterior.furniture
      && Object.values(finalExterior.rooms).every((visible) => visible === false),
    reverseRestoresTour: !reverseInterior.upper && !reverseInterior.roof && !reverseInterior.exteriorShell
      && reverseInterior.interior && reverseInterior.rooms.terrace,
    reverseRestoresApproach: reverseApproach.upper && reverseApproach.roof && reverseApproach.exteriorShell
      && !reverseApproach.interior,
  };
  await capture(12.8 / sceneKeys.length, 'artifacts/estate-finished-exterior.png');
  const perf = await page.evaluate(() => window.__fardeenBenchmark(650));
  const runtime = await page.evaluate(() => ({
    scrollSeek: typeof window.__fardeenSeek === 'function',
    loadingComplete: document.querySelector('[data-cinematic-spacer] canvas') !== null,
  }));

  const reduced = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const reducedPage = await reduced.newPage();
  await reducedPage.emulateMedia({ reducedMotion: 'reduce' });
  await reducedPage.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded' });
  const reducedFallback = await reducedPage.evaluate(() => ({
    cinematicMounted: Boolean(document.querySelector('[data-cinematic-spacer]')),
    staticMain: Boolean(document.querySelector('#main-content')),
  }));
  await reduced.close();
  await browser.close();
  console.log(JSON.stringify({ perf, runtime, visibility, sectionProof, reducedFallback, errors }));
})().catch((error) => { console.error(error); process.exit(1); });
