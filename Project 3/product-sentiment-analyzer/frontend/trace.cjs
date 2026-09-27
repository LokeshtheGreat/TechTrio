const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  // Intercept console messages
  page.on('console', msg => {
    if (msg.text().includes('[TRACE]')) {
      console.log(msg.text());
    }
  });

  await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });

  // 1. Click BUSINESS perspective toggle
  console.log("--- Clicking Business Perspective ---");
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const busBtn = buttons.find(b => b.innerText.includes('BUSINESS'));
    if (busBtn) busBtn.click();
  });
  
  await new Promise(r => setTimeout(r, 1000));

  // 2. Hover Product A (iPhone)
  console.log("--- Hovering iPhone ---");
  await page.hover('.product-card-inner:nth-child(1)');
  await new Promise(r => setTimeout(r, 15000));

  // 3. Hover Product B (Samsung)
  console.log("--- Hovering Samsung ---");
  await page.hover('.product-card-inner:nth-child(2)');
  await new Promise(r => setTimeout(r, 3000));

  await browser.close();
})();
