// Render diagram HTML -> PNG @2x (untuk embed sebagai sub-elemen di PDF)
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const jobs = [
    ['/home/z/my-project/audit/diag_saat_ini.html', '/home/z/my-project/audit/assets/diag_saat_ini.png', 900],
    ['/home/z/my-project/audit/diag_v2.html', '/home/z/my-project/audit/assets/diag_v2.png', 900],
  ];
  const browser = await chromium.launch();
  for (const [src, out, w] of jobs) {
    const page = await browser.newPage({ viewport: { width: w, height: 700 }, deviceScaleFactor: 2 });
    await page.goto('file://' + src);
    await page.waitForTimeout(500);
    const height = await page.evaluate(() => document.body.scrollHeight);
    await page.setViewportSize({ width: w, height });
    await page.waitForTimeout(200);
    await page.screenshot({ path: out, fullPage: true });
    await page.close();
    console.log('render:', out, w + 'x' + height);
  }
  await browser.close();
})();
