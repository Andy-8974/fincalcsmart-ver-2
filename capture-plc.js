const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const outDir = 'C:\\Users\\andre\\AppData\\Local\\Temp\\';
  const vp = { width: 1280, height: 900 };

  // Screenshot 1 — plc-default.png
  {
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    await page.goto('http://localhost:3000/personal-loan-calculator', { waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollTo(0, 480));
    await page.waitForTimeout(300);
    await page.screenshot({ path: outDir + 'plc-default.png', fullPage: false });
    await ctx.close();
    console.log('Screenshot 1 done: plc-default.png');
  }

  // Screenshot 2 — plc-watch.png
  {
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    await page.goto('http://localhost:3000/personal-loan-calculator', { waitUntil: 'networkidle' });
    const rateInput = page.locator('input').nth(2);
    await rateInput.click({ clickCount: 3 });
    await rateInput.pressSequentially('13');
    await rateInput.press('Tab');
    await page.waitForTimeout(600);
    await page.evaluate(() => window.scrollTo(0, 680));
    await page.waitForTimeout(300);
    await page.screenshot({ path: outDir + 'plc-watch.png', fullPage: false });
    await ctx.close();
    console.log('Screenshot 2 done: plc-watch.png');
  }

  // Screenshot 3 — plc-caution.png
  {
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    await page.goto('http://localhost:3000/personal-loan-calculator', { waitUntil: 'networkidle' });
    const rateInput = page.locator('input').nth(2);
    await rateInput.click({ clickCount: 3 });
    await rateInput.pressSequentially('22');
    await rateInput.press('Tab');
    await page.waitForTimeout(600);
    await page.evaluate(() => window.scrollTo(0, 680));
    await page.waitForTimeout(300);
    await page.screenshot({ path: outDir + 'plc-caution.png', fullPage: false });
    await ctx.close();
    console.log('Screenshot 3 done: plc-caution.png');
  }

  // Screenshot 4 — plc-5yr.png
  {
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    await page.goto('http://localhost:3000/personal-loan-calculator', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: '5 yr' }).click();
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollTo(0, 680));
    await page.waitForTimeout(300);
    await page.screenshot({ path: outDir + 'plc-5yr.png', fullPage: false });
    await ctx.close();
    console.log('Screenshot 4 done: plc-5yr.png');
  }

  await browser.close();
  console.log('All screenshots complete.');
})().catch(e => {
  console.error(e);
  process.exit(1);
});
