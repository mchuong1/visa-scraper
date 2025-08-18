// Helper utility functions

import { Page } from 'puppeteer';

/**
 * Wait for user input from the terminal
 */
export const waitForUserInput = (): Promise<void> => {
  return new Promise((resolve) => {
    process.stdin.once('data', () => {
      resolve();
    });
  });
};

/**
 * Get user choice from terminal input
 */
export const getUserChoice = (): Promise<string> => {
  return new Promise((resolve) => {
    process.stdin.once('data', (data) => {
      const input = data.toString().trim().toLowerCase();
      resolve(input);
    });
  });
};

/**
 * Clear browser data (cookies, localStorage, sessionStorage)
 */
export const clearBrowserData = async (page: Page): Promise<void> => {
  try {
    // Clear cookies
    const cookies = await page.cookies();
    await page.deleteCookie(...cookies);
    
    // Clear local storage and session storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    console.log('✅ Browser data cleared');
  } catch (error) {
    console.log('⚠️ Could not clear all browser data:', error);
  }
};

/**
 * Debug page content for inspection
 */
export const debugPageContent = async (page: Page): Promise<void> => {
  console.log('🔍 DEBUG: Inspecting page content...');
  
  try {
    const url = page.url();
    const title = await page.title();
    console.log(`📄 Current URL: ${url}`);
    console.log(`📋 Page Title: ${title}`);
    
    // Check for any iframes
    const iframes = await page.$$('iframe');
    console.log(`🖼️  Found ${iframes.length} iframes`);
    
    for (let i = 0; i < iframes.length; i++) {
      const src = await iframes[i].evaluate(el => el.src).catch(() => 'no src');
      console.log(`   iframe ${i + 1}: ${src}`);
    }
    
    // Check for common form elements
    const forms = await page.$$('form');
    console.log(`📝 Found ${forms.length} forms`);
    
    // Check for buttons with common CAPTCHA text
    const buttons = await page.$$eval('button, input[type="button"], input[type="submit"]', 
      buttons => buttons.map(btn => btn.textContent?.trim() || btn.value || 'no text'));
    console.log(`🔘 Buttons found: ${buttons.join(', ')}`);
    
  } catch (error) {
    console.log('❌ Debug inspection failed:', error);
  }
};
