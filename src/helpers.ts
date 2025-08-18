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

/**
 * Enable click tracking on the page to capture selector information
 */
export const enableClickTracking = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    // Remove any existing click listeners to avoid duplicates
    if ((window as any).clickTracker) {
      document.removeEventListener('click', (window as any).clickTracker);
    }
    
    // Create a click tracker function
    (window as any).clickTracker = (event: MouseEvent) => {
      const element = event.target as HTMLElement;
      if (!element) return;
      
      // Generate multiple possible selectors for the clicked element
      const selectors = [];
      
      // ID selector (highest priority)
      if (element.id) {
        selectors.push(`#${element.id}`);
      }
      
      // Class selector
      if (element.className && typeof element.className === 'string') {
        const classes = element.className.trim().split(/\s+/);
        if (classes.length > 0) {
          selectors.push(`.${classes.join('.')}`);
          // Also add individual class selectors
          classes.forEach(cls => selectors.push(`.${cls}`));
        }
      }
      
      // Attribute selectors
      const name = element.getAttribute('name');
      const type = element.getAttribute('type');
      const href = element.getAttribute('href');
      
      if (name) selectors.push(`[name="${name}"]`);
      if (type) selectors.push(`[type="${type}"]`);
      if (href) selectors.push(`[href="${href}"]`);
      
      // Tag with attributes
      const tag = element.tagName.toLowerCase();
      selectors.push(tag);
      
      // Text content selector (for buttons/links)
      const text = element.textContent?.trim();
      if (text && text.length < 50) {
        selectors.push(`${tag}:contains("${text}")`);
      }
      
      // Placeholder selector for inputs
      const placeholder = element.getAttribute('placeholder');
      if (placeholder) {
        selectors.push(`[placeholder="${placeholder}"]`);
      }
      
      // Store the click information
      (window as any).lastClickedElement = {
        tagName: element.tagName,
        id: element.id,
        className: element.className,
        name: name,
        type: type,
        textContent: text,
        placeholder: placeholder,
        href: href,
        selectors: selectors,
        timestamp: new Date().toISOString()
      };
      
      console.log('🖱️ Element clicked:', (window as any).lastClickedElement);
    };
    
    // Add the click listener
    document.addEventListener('click', (window as any).clickTracker, true);
    console.log('✅ Click tracking enabled');
  });
};

/**
 * Get information about the last clicked element
 */
export const getLastClickedElement = async (page: Page): Promise<any> => {
  return await page.evaluate(() => {
    return (window as any).lastClickedElement || null;
  });
};

/**
 * Disable click tracking on the page
 */
export const disableClickTracking = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    if ((window as any).clickTracker) {
      document.removeEventListener('click', (window as any).clickTracker);
      delete (window as any).clickTracker;
      delete (window as any).lastClickedElement;
      console.log('✅ Click tracking disabled');
    }
  });
};

/**
 * Wait for user input and capture any clicked elements during that time
 */
export const waitForUserInputWithTracking = async (page: Page): Promise<any> => {
  console.log('🖱️ Click tracking enabled. Any elements you click will be recorded.');
  await enableClickTracking(page);
  
  await waitForUserInput();
  
  const clickedElement = await getLastClickedElement(page);
  if (clickedElement) {
    console.log('📋 Captured clicked element information:');
    console.log('   Tag:', clickedElement.tagName);
    console.log('   ID:', clickedElement.id || 'none');
    console.log('   Classes:', clickedElement.className || 'none');
    console.log('   Name:', clickedElement.name || 'none');
    console.log('   Type:', clickedElement.type || 'none');
    console.log('   Text:', clickedElement.textContent || 'none');
    console.log('   Placeholder:', clickedElement.placeholder || 'none');
    console.log('   Href:', clickedElement.href || 'none');
    console.log('   Suggested selectors:');
    clickedElement.selectors.forEach((selector: string, index: number) => {
      console.log(`     ${index + 1}. ${selector}`);
    });
  } else {
    console.log('ℹ️ No element clicks were captured.');
  }
  
  await disableClickTracking(page);
  return clickedElement;
};
