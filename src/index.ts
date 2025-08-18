// Main application entry point
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

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

// Validate environment and initialize
validateEnvironment();

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
  
  // Try with proxy first, then without if it fails
  const launchOptions = {
    headless: false,
    args: [
      `--proxy-server=${PROXY_HOST}`,
      '--no-sandbox',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions-file-access-check',
      '--disable-extensions',
      '--disable-plugins-discovery',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
      '--user-agent=' + sessionInfo.userAgent
    ],
    defaultViewport: null,
    devtools: false,
    ignoreDefaultArgs: ['--enable-automation'],
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

  // Enhanced stealth measures against Cloudflare detection
  await page.evaluateOnNewDocument(() => {
    // Remove webdriver property
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });

    // Mock plugins and languages
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });

    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });

    // Mock chrome runtime
    (window as any).chrome = {
      runtime: {},
    };

    // Mock permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters: PermissionDescriptor) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ 
          state: Notification.permission,
          name: parameters.name,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false
        } as PermissionStatus) :
        originalQuery(parameters)
    );
  });

  // Set additional headers to appear more human-like
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Upgrade-Insecure-Requests': '1'
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

  // Intercept network requests
  await page.setRequestInterception(true);
  
  // Simple request handler to continue all requests
  page.on('request', (request) => {
    request.continue();
  });

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