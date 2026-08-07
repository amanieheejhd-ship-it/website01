const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await desktop.newPage();
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('http://127.0.0.1:3000/contact', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-particle-field]');
  await page.screenshot({ path: 'artifacts/particle-field-idle.png' });
  await page.mouse.move(720, 420, { steps: 20 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'artifacts/particle-field-interactive.png' });
  const desktopState = await page.locator('[data-particle-field]').evaluate((canvas) => ({
    mode: canvas.dataset.particleMode,
    count: Number(canvas.dataset.particleCount),
    pointerEvents: getComputedStyle(canvas).pointerEvents,
    nativeCursor: getComputedStyle(document.documentElement).cursor,
  }));
  await desktop.close();

  const reduced = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const reducedPage = await reduced.newPage();
  await reducedPage.emulateMedia({ reducedMotion: 'reduce' });
  await reducedPage.goto('http://127.0.0.1:3000/contact', { waitUntil: 'domcontentloaded' });
  const reducedCanvas = reducedPage.locator('[data-particle-field]');
  const reducedState = await reducedCanvas.evaluate((canvas) => ({ mode: canvas.dataset.particleMode, first: canvas.toDataURL() }));
  await reducedPage.waitForTimeout(400);
  reducedState.unchanged = reducedState.first === await reducedCanvas.evaluate((canvas) => canvas.toDataURL());
  delete reducedState.first;
  await reduced.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto('http://127.0.0.1:3000/contact', { waitUntil: 'domcontentloaded' });
  const mobileState = await mobilePage.locator('[data-particle-field]').evaluate((canvas) => ({
    mode: canvas.dataset.particleMode,
    count: Number(canvas.dataset.particleCount),
  }));
  await mobile.close();
  await browser.close();
  console.log(JSON.stringify({ desktopState, reducedState, mobileState, errors }));
})().catch((error) => { console.error(error); process.exit(1); });
