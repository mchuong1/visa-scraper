// Browser lifecycle management with session persistence and memory monitoring
import puppeteer from 'puppeteer-extra';
import { Browser, Page } from 'puppeteer';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

import { SessionInfo } from './types';
import { 
  getRandomUserAgent, 
  PROXY_HOST, 
  PROXY_USERNAME, 
  PROXY_PASSWORD 
} from './config';

const execAsync = promisify(exec);

// Use stealth plugin
puppeteer.use(StealthPlugin());

interface BrowserSession {
  browser: Browser;
  page: Page;
  sessionInfo: SessionInfo;
  startTime: number;
  memoryUsage: number;
  restartCount: number;
}

interface SessionData {
  cookies: any[];
  localStorage: any;
  sessionStorage: any;
  userAgent: string;
  timestamp: number;
}

export class BrowserManager {
  private session: BrowserSession | null = null;
  private sessionDataPath: string;
  private maxSessionDuration: number = 45 * 60 * 1000; // 45 minutes in ms
  private memoryThreshold: number = 1024 * 1024 * 1024 * 5; // 1GB in bytes
  private watchdogInterval: NodeJS.Timeout | null = null;
  private memoryCheckInterval: NodeJS.Timeout | null = null;

  constructor(sessionDataPath: string = './session-data.json') {
    this.sessionDataPath = path.resolve(sessionDataPath);
  }

  /**
   * Launch a new browser session
   */
  async launchBrowser(useProxy: boolean = true): Promise<BrowserSession> {
    console.log('🚀 Launching new browser session...');

    // Load saved session data if exists
    const savedSession = await this.loadSessionData();

    const launchOptions: any = {
      headless: false,
      devtools: false,
      defaultViewport: null,
      ignoreDefaultArgs: ['--enable-automation'],
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-blink-features=AutomationControlled',
        '--user-data-dir=/tmp/chrome-session', // Persist user data
      ]
    };

    // Add proxy if enabled
    if (useProxy && PROXY_HOST) {
      launchOptions.args.push(`--proxy-server=http://${PROXY_HOST}`);
      console.log(`🔗 Using proxy: ${PROXY_HOST}`);
    }

    // Find Chrome path
    const chromePath = this.findChromePath();
    if (chromePath) {
      launchOptions.executablePath = chromePath;
    }

    let browser: Browser;
    try {
      browser = await puppeteer.launch(launchOptions);
      console.log('✅ Browser launched successfully');
    } catch (error) {
      console.log('❌ Browser launch failed:', error);        // Fallback without proxy
        if (useProxy) {
          console.log('🔄 Retrying without proxy...');
          launchOptions.args = launchOptions.args.filter((arg: string) => !arg.includes('proxy-server'));
          browser = await puppeteer.launch(launchOptions);
        } else {
          throw error;
        }
    }

    const [page] = await browser.pages();

    // Set user agent (use saved one or generate new)
    const userAgent = savedSession?.userAgent || getRandomUserAgent();
    await page.setUserAgent(userAgent);

    // Set natural headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8'
    });

    // Remove automation indicators
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });

    // Authenticate with proxy if needed
    if (useProxy && PROXY_USERNAME && PROXY_PASSWORD) {
      try {
        await page.authenticate({
          username: PROXY_USERNAME,
          password: PROXY_PASSWORD
        });
        console.log('✅ Proxy authentication successful');
      } catch (error) {
        console.log('⚠️ Proxy authentication failed:', error);
      }
    }

    // Restore session data if available
    if (savedSession) {
      await this.restoreSessionData(page, savedSession);
    }

    const sessionInfo: SessionInfo = {
      startTime: new Date().toISOString(),
      userAgent,
      proxyUsed: useProxy && !!PROXY_HOST,
      captchaSolved: 0,
      errors: 0
    };

    const session: BrowserSession = {
      browser,
      page,
      sessionInfo,
      startTime: Date.now(),
      memoryUsage: 0,
      restartCount: this.session?.restartCount || 0
    };

    this.session = session;
    
    // Start monitoring
    this.startWatchdog();
    this.startMemoryMonitoring();

    console.log(`🎯 Browser session #${session.restartCount + 1} ready`);
    return session;
  }

  /**
   * Check if browser needs restart
   */
  shouldRestart(): boolean {
    if (!this.session) return true;

    const sessionAge = Date.now() - this.session.startTime;
    const memoryExceeded = this.session.memoryUsage > this.memoryThreshold;

    if (sessionAge > this.maxSessionDuration) {
      console.log(`⏰ Session age exceeded: ${Math.round(sessionAge / 60000)}min > ${Math.round(this.maxSessionDuration / 60000)}min`);
      return true;
    }

    if (memoryExceeded) {
      console.log(`🧠 Memory threshold exceeded: ${Math.round(this.session.memoryUsage / 1024 / 1024)}MB > ${Math.round(this.memoryThreshold / 1024 / 1024)}MB`);
      return true;
    }

    return false;
  }

  /**
   * Restart browser session with session persistence
   */
  async restartBrowser(): Promise<BrowserSession> {
    console.log('🔄 Restarting browser session...');

    if (this.session) {
      // Save session data before closing
      await this.saveSessionData();
      
      // Close current session
      await this.closeSession();
    }

    // Launch new session
    const newSession = await this.launchBrowser(this.session?.sessionInfo.proxyUsed);
    newSession.restartCount = (this.session?.restartCount || 0) + 1;
    
    console.log(`✅ Browser restarted (restart #${newSession.restartCount})`);
    return newSession;
  }

  /**
   * Save current session data (cookies, storage, etc.)
   */
  async saveSessionData(): Promise<void> {
    if (!this.session) return;

    try {
      console.log('💾 Saving session data...');

      const cookies = await this.session.page.cookies();
      
      const [localStorage, sessionStorage] = await this.session.page.evaluate((): [string, string] => {
        return [
          JSON.stringify(localStorage),
          JSON.stringify(sessionStorage)
        ];
      });

      const sessionData: SessionData = {
        cookies,
        localStorage: JSON.parse(localStorage),
        sessionStorage: JSON.parse(sessionStorage),
        userAgent: this.session.sessionInfo.userAgent,
        timestamp: Date.now()
      };

      await fs.writeFile(this.sessionDataPath, JSON.stringify(sessionData, null, 2));
      console.log('✅ Session data saved');
    } catch (error) {
      console.log('⚠️ Failed to save session data:', error);
    }
  }

  /**
   * Load saved session data
   */
  async loadSessionData(): Promise<SessionData | null> {
    try {
      const data = await fs.readFile(this.sessionDataPath, 'utf8');
      const sessionData = JSON.parse(data) as SessionData;
      
      // Check if session data is not too old (max 24 hours)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (Date.now() - sessionData.timestamp > maxAge) {
        console.log('⏰ Session data is too old, ignoring...');
        return null;
      }

      console.log('📚 Loaded saved session data');
      return sessionData;
    } catch (error) {
      console.log('ℹ️ No saved session data found');
      return null;
    }
  }

  /**
   * Restore session data to page
   */
  async restoreSessionData(page: Page, sessionData: SessionData): Promise<void> {
    try {
      console.log('🔄 Restoring session data...');

      // Set cookies
      if (sessionData.cookies.length > 0) {
        await page.setCookie(...sessionData.cookies);
        console.log(`🍪 Restored ${sessionData.cookies.length} cookies`);
      }

      // Restore localStorage and sessionStorage
      await page.evaluateOnNewDocument((data: SessionData) => {
        if (data.localStorage) {
          Object.keys(data.localStorage).forEach(key => {
            localStorage.setItem(key, data.localStorage[key]);
          });
        }
        if (data.sessionStorage) {
          Object.keys(data.sessionStorage).forEach(key => {
            sessionStorage.setItem(key, data.sessionStorage[key]);
          });
        }
      }, sessionData);

      console.log('✅ Session data restored');
    } catch (error) {
      console.log('⚠️ Failed to restore session data:', error);
    }
  }

  /**
   * Start watchdog process
   */
  startWatchdog(): void {
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
    }

    this.watchdogInterval = setInterval(async () => {
      try {
        if (this.shouldRestart()) {
          console.log('🐕 Watchdog triggered browser restart');
          await this.restartBrowser();
        }
      } catch (error) {
        console.log('⚠️ Error in watchdog process:', error);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    console.log('🐕 Watchdog started (checking every 5 minutes)');
  }

  /**
   * Start memory monitoring
   */
  startMemoryMonitoring(): void {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
    }

    this.memoryCheckInterval = setInterval(async () => {
      if (this.session) {
        try {
          const memoryUsage = await this.getBrowserMemoryUsage();
          
          // Double-check session still exists (race condition protection)
          if (this.session) {
            this.session.memoryUsage = memoryUsage;
            
            const memoryMB = Math.round(memoryUsage / 1024 / 1024);
            const thresholdMB = Math.round(this.memoryThreshold / 1024 / 1024);
            
            if (memoryMB > thresholdMB * 0.8) { // Warn at 80% threshold
              console.log(`⚠️ High memory usage: ${memoryMB}MB (threshold: ${thresholdMB}MB)`);
            }
          }
        } catch (error) {
          console.log('⚠️ Error during memory monitoring:', error);
        }
      }
    }, 60 * 1000); // Check every minute

    console.log('🧠 Memory monitoring started (checking every minute)');
  }

  /**
   * Get browser memory usage
   */
  async getBrowserMemoryUsage(): Promise<number> {
    try {
      // Get all Chrome processes
      const { stdout } = await execAsync('ps aux | grep -i chrome | grep -v grep');
      const processes = stdout.split('\n').filter(line => line.trim());
      
      let totalMemory = 0;
      for (const process of processes) {
        const parts = process.trim().split(/\s+/);
        if (parts.length >= 6) {
          const memoryKB = parseInt(parts[5]) || 0;
          totalMemory += memoryKB * 1024; // Convert to bytes
        }
      }
      
      return totalMemory;
    } catch (error) {
      console.log('⚠️ Failed to get memory usage:', error);
      return 0;
    }
  }

  /**
   * Find Chrome executable path
   */
  findChromePath(): string | undefined {
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

    for (const chromePath of possiblePaths) {
      try {
        require('fs').accessSync(chromePath);
        console.log(`✅ Found Chrome at: ${chromePath}`);
        return chromePath;
      } catch {
        continue;
      }
    }

    console.log('⚠️ Chrome not found, using default');
    return undefined;
  }

  /**
   * Close current session
   */
  async closeSession(): Promise<void> {
    if (this.session) {
      try {
        await this.session.browser.close();
        console.log('✅ Browser session closed');
      } catch (error) {
        console.log('⚠️ Error closing browser:', error);
      }
      this.session = null;
    }

    // Clear intervals
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
      this.watchdogInterval = null;
    }
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
  }

  /**
   * Get current session
   */
  getCurrentSession(): BrowserSession | null {
    return this.session;
  }

  /**
   * Clean up and exit
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up browser manager...');
    
    if (this.session) {
      await this.saveSessionData();
      await this.closeSession();
    }

    console.log('✅ Cleanup complete');
  }
}

// Export the interfaces for use in other modules
export { BrowserSession, SessionData };
