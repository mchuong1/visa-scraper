// Clean run without proxy - with rate limiting
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Import modules
import { SessionInfo } from './types';
import { 
  validateEnvironment, 
  getRandomUserAgent,
  tlsURL
} from './config';
import { scrapeTLSContact } from './scraper';
import { checkRateLimit, updateRateLimit, displayRateLimitInfo } from './rateLimiter';
import { checkIPHealth, promptUserDecision } from './ipHealthCheck';

// Validate environment (no proxy required for clean runs)
validateEnvironment(false);

// Session tracking
const sessionInfo: SessionInfo = {
  startTime: new Date().toISOString(),
  userAgent: getRandomUserAgent(),
  proxyUsed: false,
  captchaSolved: 0,
  errors: 0
};

console.log('🧹 Clean Run Mode - No Proxy, With IP Health Check');
console.log('⚡ Direct website access with your actual IP analysis');
console.log(`🌐 Target URL: ${tlsURL}`);
console.log(`🖥️ User Agent: ${sessionInfo.userAgent}`);

(async () => {
  // Check rate limit first
  const rateLimitResult = checkRateLimit();
  displayRateLimitInfo(rateLimitResult);
  
  if (!rateLimitResult.canRun) {
    console.log('\n🛑 Exiting due to rate limit. Please wait before running again.');
    console.log('💡 This helps prevent being flagged as a bot by the website.');
    process.exit(1);
  }

  console.log('\n🚀 Starting clean run...');
  
  // Update rate limit timestamp
  updateRateLimit();

  // Run IP health check (even in clean mode)
  console.log('\n🔍 Running IP health check for your actual IP...');
  const ipHealthResult = await checkIPHealth();
  const proceedWithAutomation = await promptUserDecision(ipHealthResult);

  if (!proceedWithAutomation) {
    console.log('🛑 Stopping clean run due to IP health check results.');
    console.log('💡 Consider using a different network or the standard proxy mode.');
    process.exit(1);
  }

  console.log('\n✅ IP health check passed - proceeding with clean run...');

  // Launch the browser
  puppeteer.use(StealthPlugin());
  
  const launchOptions = {
    headless: false,
    defaultViewport: null, // Use actual window size instead of virtual viewport
    args: [
      '--start-maximized' // Start maximized like a normal user would
    ]
  };

  console.log('🚀 Launching browser without proxy...');
  const browser = await puppeteer.launch(launchOptions);
  const [page] = await browser.pages();

  // Set a natural user agent
  await page.setUserAgent(sessionInfo.userAgent);

  // Minimal stealth - only remove the most obvious automation indicators
  await page.evaluateOnNewDocument(() => {
    // Remove webdriver property (this is the main giveaway)
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
  });

  // Set natural headers like a real browser
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8'
  });

  console.log('✅ Browser launched successfully (clean mode)');
  console.log('⚡ Proceeding to scraping after IP health check passed...');

  try {
    // Start scraping
    await scrapeTLSContact(page, sessionInfo);

    // Session summary
    console.log('\n🏁 Clean Run Session Summary:');
    console.log(`⏰ Started: ${sessionInfo.startTime}`);
    console.log(`🌐 User Agent: ${sessionInfo.userAgent}`);
    console.log(`🔗 Proxy Used: ❌ (Clean Mode)`);
    console.log(`🤖 CAPTCHAs Handled: ${sessionInfo.captchaSolved}`);
    console.log(`❌ Errors Encountered: ${sessionInfo.errors}`);
    console.log(`✅ Clean run completed successfully!`);
    
  } catch (error) {
    console.error('❌ Clean run failed:', error);
    sessionInfo.errors++;
  } finally {
    await browser.close();
    console.log('📊 Browser closed. Rate limit active until next allowed run.');
  }
})().catch(error => {
  console.error('💥 Fatal error in clean run:', error);
  process.exit(1);
});
