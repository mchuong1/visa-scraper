// TLS Contact scraping functionality

import { Page } from 'puppeteer';
import { SessionInfo } from './types';
import { tlsURL, vfsURL } from './config';
import { waitForUserInput, debugPageContent } from './helpers';
import { handleCaptchaLoop, detectCaptcha } from './captcha';

/**
 * Main TLS Contact scraping function
 */
export const scrapeTLSContact = async (page: Page, sessionInfo: SessionInfo): Promise<void> => {
  const maxRetries = 3;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      attempt++;
      console.log(`🔄 Attempt ${attempt}/${maxRetries} - Navigating to TLS Contact at ${tlsURL}`);
      
      await page.goto(tlsURL, {
        timeout: 30000, // Reduced timeout
        waitUntil: 'domcontentloaded' // Less strict wait condition
      });
      
      console.log('✅ Page loaded successfully!');
      break; // If we get here, navigation was successful
      
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed:`, (error as Error).message);
      
      if (attempt === maxRetries) {
        console.log('🛑 All attempts failed. Starting manual mode...');
        console.log('🔧 Please manually navigate to the URL in the browser window.');
        console.log(`📋 URL: ${tlsURL}`);
        console.log('⏳ Press ENTER when the page has loaded and you\'re ready to continue...');
        await waitForUserInput();
        break;
      } else {
        console.log(`⏳ Waiting 5 seconds before retry ${attempt + 1}...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  // Check for CAPTCHA and handle it
  await debugPageContent(page); // Debug what's on the page
  await handleCaptchaLoop(page, sessionInfo);

  // Manual intervention point - pause for manual interaction
  console.log('🔍 You can now manually interact with the browser if needed.');
  console.log('Press ENTER in the terminal when you want to continue with automation...');
  await waitForUserInput();
  console.log('Continuing with automation...');
  
  // Go to Login
  console.log('Waiting for login button...');
  const loginButton = await page.waitForSelector('a[class="tls-button-link"]', { visible: false });
  await loginButton?.click();
  await page.waitForNavigation();

  // Login
  console.log('Waiting for username and password inputs...');
  const usernameInput = await page.waitForSelector('#username', { visible: true });
  await usernameInput?.click();
  await usernameInput?.type(`${process.env.TLS_USERNAME}`);

  const passwordInput = await page.waitForSelector('#password', { visible: true });
  await passwordInput?.click();
  await passwordInput?.type(`${process.env.TLS_PASSWORD}`);

  const submitButton = await page.waitForSelector('button[type="submit"]', { visible: true });
  await submitButton?.click();
  await page.waitForNavigation();
  console.log('Logged in successfully!');
};

/**
 * VFS Global scraping function (placeholder for future implementation)
 */
export const scrapeVFSGlobal = async (page: Page): Promise<void> => {
  // Navigate the page to a URL
  await page.goto(vfsURL);

  // Look for iframes likely tied to CAPTCHA providers (Cloudflare, hCaptcha, Turnstile, etc.)
  const captchaStatus = await detectCaptcha(page);
  
  if (captchaStatus.hasCaptcha) {
    console.log(`CAPTCHA detected - Type: ${captchaStatus.type}`);
    // Implement your captcha handling strategy:
    // 1. Wait for manual solving
    // 2. Use anti-captcha service
    // 3. Retry with different proxy
    // 4. Skip the request
  }
};
