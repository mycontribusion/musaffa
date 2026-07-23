const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capture console logs
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[useMusaffa]') || text.includes('[RecitationCheck]') || text.includes('[PartnerSession]')) {
      logs.push(text);
      console.log('[CONSOLE]', text);
    }
  });
  
  // Navigate to the app
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(2000);
  
  // Click on a surah to start
  console.log('Page title:', await page.title());
  
  // Take a screenshot to see the current state
  await page.screenshot({ path: 'screenshot_initial.png' });
  
  // Try to find and click the first surah
  const surahLinks = await page.locator('.surah-item, .surah-card, a[href*="surah"]').all();
  console.log('Found surah links:', surahLinks.length);
  
  if (surahLinks.length > 0) {
    await surahLinks[0].click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshot_surah_selected.png' });
  }
  
  // Look for a "Partner" or "Musaffa" button
  const partnerButtons = await page.locator('button:has-text("Partner"), button:has-text("Musaffa"), a:has-text("Partner"), a:has-text("Musaffa")').all();
  console.log('Found partner/musaffa buttons:', partnerButtons.length);
  
  if (partnerButtons.length > 0) {
    await partnerButtons[0].click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshot_partner.png' });
  }
  
  // Look for a "Start" button in the config view
  const startButtons = await page.locator('button:has-text("Start"), button:has-text("Start Session"), button:has-text("Begin")').all();
  console.log('Found start buttons:', startButtons.length);
  
  if (startButtons.length > 0) {
    // Click the start button
    await startButtons[0].click();
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'screenshot_session_started.png' });
  }
  
  // Wait a bit more to see if any audio plays
  await page.waitForTimeout(10000);
  
  // Print all captured logs
  console.log('\n=== CAPTURED LOGS ===');
  logs.forEach(log => console.log(log));
  
  await browser.close();
})();
