// Main application entry point
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

// Import modules
import { SessionInfo } from './types';
import { 
  validateEnvironment, 
  getRandomUserAgent, 
  PROXY_HOST, 
  PROXY_USERNAME, 
  PROXY_PASSWORD 
} from './config';
import { checkIPHealth, promptUserDecision } from './ipHealthCheck';
import { scrapeTLSContact } from './scraper';

/**
 * Find the path to the real Chrome browser
 */
const findChromePath = (): string | undefined => {
  const possiblePaths = [
    // macOS paths
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    
    // Windows paths
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    
    // Linux paths
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium'
  ];

  for (const path of possiblePaths) {
    try {
      if (fs.existsSync(path)) {
        console.log(`✅ Found Chrome at: ${path}`);
        return path;
      }
    } catch (error) {
      // Continue checking other paths
    }
  }

  console.log('⚠️ Could not find Chrome installation, using bundled Chromium');
  return undefined; // Will use bundled Chromium
};

// Validate environment and initialize (require proxy for main index)
validateEnvironment(true);

// Session tracking
const sessionInfo: SessionInfo = {
  startTime: new Date().toISOString(),
  userAgent: getRandomUserAgent(),
  proxyUsed: false,
  captchaSolved: 0,
  errors: 0
};

console.log(`🌐 Selected User Agent: ${sessionInfo.userAgent}`);

(async () => {
  // Launch the browser and open a new blank page
  puppeteer.use(StealthPlugin());
  
  // Get Chrome path for real browser usage
  const chromePath = findChromePath();
  
  // Try with proxy first, then without if it fails
  const launchOptions = {
    headless: false,
    defaultViewport: null, // Use actual window size instead of virtual viewport
    executablePath: chromePath, // Use real Chrome if found, otherwise bundled Chromium
    userDataDir: '/tmp/puppeteer-proxy-run', // Use temporary profile for proxy run
    args: [
      `--proxy-server=${PROXY_HOST}`,
      '--start-maximized', // Start maximized like a normal user would
      '--no-first-run', // Skip first run setup
      '--no-default-browser-check' // Skip default browser check
    ]
  };

  let browser;
  try {
    console.log('🚀 Launching browser with proxy...');
    browser = await puppeteer.launch(launchOptions);
    sessionInfo.proxyUsed = true;
  } catch (error) {
    console.log('⚠️ Proxy launch failed, trying without proxy...');
    launchOptions.args = launchOptions.args.filter(arg => !arg.includes('proxy-server'));
    browser = await puppeteer.launch(launchOptions);
  }

  const [page] = await browser.pages();

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

  // Authenticate with the proxy if needed (only if using proxy)
  if (launchOptions.args.some(arg => arg.includes('proxy-server'))) {
    try {
      await page.authenticate({
        username: PROXY_USERNAME,
        password: PROXY_PASSWORD
      });
      console.log('✅ Proxy authentication successful');
    } catch (error) {
      console.log('⚠️ Proxy authentication failed, continuing without auth...');
    }
  }

  // Run IP health check
  const ipHealthResult = await checkIPHealth();
  const proceedWithProxy = await promptUserDecision(ipHealthResult);

  if (!proceedWithProxy) {
    console.log('🛑 Stopping automation due to IP health check results.');
    await browser.close();
    return;
  }

  // Start scraping
  await scrapeTLSContact(page, sessionInfo);

  // Session summary
  console.log('\n🏁 Session Summary:');
  console.log(`⏰ Started: ${sessionInfo.startTime}`);
  console.log(`🌐 User Agent: ${sessionInfo.userAgent}`);
  console.log(`🔗 Proxy Used: ${sessionInfo.proxyUsed ? '✅' : '❌'}`);
  console.log(`🤖 CAPTCHAs Handled: ${sessionInfo.captchaSolved}`);
  console.log(`❌ Errors Encountered: ${sessionInfo.errors}`);
  console.log(`✅ Session completed successfully!`);

  await browser.close();
})();