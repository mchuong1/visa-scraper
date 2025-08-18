// TLS Contact scraping functionality

import { Page } from 'puppeteer';
import { SessionInfo } from './types';
import { tlsURL, vfsURL } from './config';
import { waitForUserInput, debugPageContent, waitForUserInputWithTracking } from './helpers';
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
  
  // Go to Login
  console.log('Waiting for login button...');
  
  // Debug: Let's check what login links are available
  const loginLinks = await page.$$eval('a', links => 
    links
      .filter(link => 
        link.textContent?.toLowerCase().includes('login') || 
        link.getAttribute('href')?.includes('login')
      )
      .map(link => ({
        text: link.textContent?.trim(),
        href: link.getAttribute('href'),
        visible: link.offsetParent !== null
      }))
  );
  console.log('Available login links:', loginLinks);
  
  // Try multiple possible selectors for the login button
  let loginButton;
  const selectors = [
    'a[href*="login"]', // Contains "login" anywhere in href
    'a[href="/en-us/login"]', // With leading slash
    'a[href$="/en-us/login"]', // Ends with this path
    'a:contains("Login")', // Contains "Login" text (note: this might not work in all browsers)
    'a[class*="login"]', // Has "login" in class name
  ];
  
  for (const selector of selectors) {
    try {
      console.log(`Trying selector: ${selector}`);
      loginButton = await page.waitForSelector(selector, { visible: true, timeout: 3000 });
      if (loginButton) {
        console.log(`✅ Found login button with selector: ${selector}`);
        break;
      }
    } catch (error) {
      console.log(`❌ Selector failed: ${selector}`);
    }
  }
  
  if (!loginButton) {
    console.log('🛑 Could not find login button automatically. Please click it manually.');
    const clickedElement = await waitForUserInputWithTracking(page);
    if (clickedElement) {
      console.log('💾 Save this selector for future use:', clickedElement.selectors[0]);
    }
  } else {
    await loginButton.click();
    await page.waitForNavigation();
  }

  // Login
  console.log('Waiting for username and password inputs...');
  
  // Debug: Check available input fields
  const inputFields = await page.$$eval('input', inputs => 
    inputs.map(input => ({
      type: input.type,
      id: input.id,
      name: input.name,
      className: input.className,
      placeholder: input.placeholder,
      visible: input.offsetParent !== null
    }))
  );
  console.log('Available input fields:', inputFields);
  
  // Try multiple selectors for username input
  let usernameInput;
  const usernameSelectors = [
    '#username',
    'input[name="username"]',
    'input[type="text"]',
    'input[type="email"]',
    'input[placeholder*="username" i]',
    'input[placeholder*="email" i]',
    'input[id*="user" i]',
    'input[name*="user" i]'
  ];
  
  for (const selector of usernameSelectors) {
    try {
      console.log(`Trying username selector: ${selector}`);
      usernameInput = await page.waitForSelector(selector, { visible: true, timeout: 3000 });
      if (usernameInput) {
        console.log(`✅ Found username input with selector: ${selector}`);
        break;
      }
    } catch (error) {
      console.log(`❌ Username selector failed: ${selector}`);
    }
  }
  
  if (!usernameInput) {
    console.log('🛑 Could not find username input automatically. Please enter it manually.');
    console.log('⏳ Click on the username field, enter your username, then press ENTER...');
    const clickedElement = await waitForUserInputWithTracking(page);
    if (clickedElement) {
      console.log('💾 Save this username selector for future use:', clickedElement.selectors[0]);
    }
  } else {
    await usernameInput.click();
    await usernameInput.type(`${process.env.TLS_USERNAME}`);
  }

  // Try multiple selectors for password input
  let passwordInput;
  const passwordSelectors = [
    '#password',
    'input[name="password"]',
    'input[type="password"]',
    'input[placeholder*="password" i]',
    'input[id*="pass" i]',
    'input[name*="pass" i]'
  ];
  
  for (const selector of passwordSelectors) {
    try {
      console.log(`Trying password selector: ${selector}`);
      passwordInput = await page.waitForSelector(selector, { visible: true, timeout: 3000 });
      if (passwordInput) {
        console.log(`✅ Found password input with selector: ${selector}`);
        break;
      }
    } catch (error) {
      console.log(`❌ Password selector failed: ${selector}`);
    }
  }
  
  if (!passwordInput) {
    console.log('🛑 Could not find password input automatically. Please enter it manually.');
    console.log('⏳ Click on the password field, enter your password, then press ENTER...');
    const clickedElement = await waitForUserInputWithTracking(page);
    if (clickedElement) {
      console.log('💾 Save this password selector for future use:', clickedElement.selectors[0]);
    }
  } else {
    await passwordInput.click();
    await passwordInput.type(`${process.env.TLS_PASSWORD}`);
  }

  // Debug: Check available buttons
  const buttons = await page.$$eval('button, input[type="submit"]', buttons => 
    buttons.map(button => ({
      type: button.type,
      textContent: button.textContent?.trim(),
      value: button.value,
      id: button.id,
      className: button.className,
      visible: button.offsetParent !== null
    }))
  );
  console.log('Available buttons:', buttons);

  // Try multiple selectors for submit button
  let submitButton;
  const submitSelectors = [
    'button[type="submit"]',
    'input[type="submit"]',
    'button:contains("Login")',
    'button:contains("Sign in")',
    'button:contains("Submit")',
    'button[class*="login" i]',
    'button[class*="submit" i]',
    'button[id*="login" i]',
    'button[id*="submit" i]'
  ];
  
  for (const selector of submitSelectors) {
    try {
      console.log(`Trying submit selector: ${selector}`);
      submitButton = await page.waitForSelector(selector, { visible: true, timeout: 3000 });
      if (submitButton) {
        console.log(`✅ Found submit button with selector: ${selector}`);
        break;
      }
    } catch (error) {
      console.log(`❌ Submit selector failed: ${selector}`);
    }
  }
  
  if (!submitButton) {
    console.log('🛑 Could not find submit button automatically. Please click it manually.');
    console.log('⏳ Click the login/submit button, then press ENTER...');
    const clickedElement = await waitForUserInputWithTracking(page);
    if (clickedElement) {
      console.log('💾 Save this submit button selector for future use:', clickedElement.selectors[0]);
    }
  } else {
    await submitButton.click();
    await page.waitForNavigation();
  }
  
  console.log('Logged in successfully!');

  // Wait for page to load after login
  console.log('🔄 Waiting for the page to load after login...');
  await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for page to stabilize

  // Find and click the Select button (group selection)
  console.log('Looking for Select button...');
  
  // Debug: Check available buttons after login
  const postLoginButtons = await page.$$eval('button', buttons => 
    buttons.map(button => ({
      type: button.type,
      textContent: button.textContent?.trim(),
      value: button.value,
      id: button.id,
      className: button.className,
      testId: button.getAttribute('data-testid'),
      name: button.name,
      visible: button.offsetParent !== null
    }))
  );
  console.log('Available buttons after login:', postLoginButtons);

  // Try multiple selectors for the Select button
  let selectButton;
  const selectSelectors = [
    'button[data-testid="btn-select-group"]', // Most specific - data-testid
    'button[name="formGroupId"]', // Name attribute
    'button[value="3447323"]', // Specific value (might change)
    'button[type="submit"]:contains("Select")', // Submit button with Select text
    'button.TlsButton_primary__sPypD:contains("Select")', // TLS button class with Select text
    'button:contains("Select")', // Any button containing "Select"
    'button[class*="TlsButton_tls-button"]', // TLS button class pattern
  ];
  
  for (const selector of selectSelectors) {
    try {
      console.log(`Trying select selector: ${selector}`);
      selectButton = await page.waitForSelector(selector, { visible: true, timeout: 3000 });
      if (selectButton) {
        console.log(`✅ Found select button with selector: ${selector}`);
        break;
      }
    } catch (error) {
      console.log(`❌ Select selector failed: ${selector}`);
    }
  }
  
  if (!selectButton) {
    console.log('🛑 Could not find Select button automatically. Please click it manually.');
    console.log('⏳ Click the "Select" button, then press ENTER...');
    const clickedElement = await waitForUserInputWithTracking(page);
    if (clickedElement) {
      console.log('💾 Save this select button selector for future use:', clickedElement.selectors[0]);
    }
  } else {
    await selectButton.click();
    console.log('✅ Select button clicked successfully!');
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {
      console.log('ℹ️ No navigation detected after clicking Select button');
    });
  }

  console.log('🔄 Waiting for next step...');
  await waitForUserInput();
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
