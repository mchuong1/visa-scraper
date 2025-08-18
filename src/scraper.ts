// TLS Contact scraping functionality

import { Page } from 'puppeteer';
import { SessionInfo } from './types';
import { tlsURL, vfsURL } from './config';
import { waitForUserInput, debugPageContent, waitForUserInputWithTracking } from './helpers';
import { handleCaptchaLoop, detectCaptcha } from './captcha';

/**
 * Perform human-like movements on the page to avoid detection
 */
const performHumanLikeMovements = async (page: Page): Promise<void> => {
  console.log('🤖 Performing human-like movements...');
  
  try {
    // Get page dimensions
    const dimensions = await page.evaluate(() => {
      return {
        width: window.innerWidth,
        height: window.innerHeight
      };
    });
    
    // Perform 3-5 random movements
    const movements = Math.floor(Math.random() * 3) + 3;
    
    for (let i = 0; i < movements; i++) {
      // Random coordinates within the page
      const x = Math.floor(Math.random() * dimensions.width);
      const y = Math.floor(Math.random() * dimensions.height);
      
      // Move mouse to random position with human-like speed
      await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 5) + 3 });
      
      // Random small delay between movements
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    }
    
    // Occasionally scroll a bit
    if (Math.random() > 0.5) {
      const scrollAmount = Math.floor(Math.random() * 300) + 100;
      await page.evaluate((amount) => {
        window.scrollBy(0, amount);
      }, scrollAmount);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Scroll back
      await page.evaluate((amount) => {
        window.scrollBy(0, -amount);
      }, scrollAmount);
    }
    
    // Random final delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
    
    console.log('✅ Human-like movements completed');
    
  } catch (error) {
    console.log('⚠️ Error during human-like movements:', error);
  }
};

/**
 * Check for appointment availability on the current page only (single check)
 */
const checkAppointmentAvailability = async (page: Page): Promise<boolean> => {
  console.log('🔍 Checking for appointment availability on current page...');
  
  try {
    const slotElements = await page.$$('slot');
    console.log(`🎰 Found ${slotElements.length} <slot> elements`);
    
    // Check if slots have content (indicating available appointments)
    let hasAvailableSlots = false;
    for (const slot of slotElements) {
      const slotContent = await slot.evaluate(el => {
        // Check if slot has any content or child elements
        return {
          hasContent: el.innerHTML.trim().length > 0,
          hasChildren: el.children.length > 0,
          textContent: el.textContent?.trim() || '',
          innerHTML: el.innerHTML.trim().substring(0, 200)
        };
      });
      
      if (slotContent.hasContent || slotContent.hasChildren) {
        hasAvailableSlots = true;
        console.log(`🎯 Found slot with content: "${slotContent.innerHTML.substring(0, 100)}..."`);
        break;
      } else {
        console.log(`🔍 Empty slot found`);
      }
    }
    
    if (hasAvailableSlots) {
      console.log('🎉 APPOINTMENTS AVAILABLE! Found slots with content.');
      console.log('✅ Stopping search - appointments detected!');
      return true; // Return true when appointments are found
    } else if (slotElements.length > 0) {
      console.log('📅 Found slot elements but they appear to be empty - no appointments available.');
      return false;
    } else {
      // No slot elements found - might be a different page structure or loading issue
      console.log('⚠️ No <slot> elements found on this page.');
      return false;
    }
    
  } catch (error) {
    console.log('Error checking for slot elements:', error);
    return false;
  }
};

/**
 * Navigate to the next month if available
 */
const navigateToNextMonth = async (page: Page): Promise<boolean> => {
  console.log('🔄 Attempting to navigate to next month...');
  
  // Check if we've reached the unavailable month first
  try {
    const unavailableMonth = await page.$('a[data-testid="btn-next-month-unavailable"], p[data-testid="btn-next-month-unavailable"]');
    if (unavailableMonth !== null) {
      const monthText = await unavailableMonth.evaluate((el: Element) => el.textContent?.trim());
      console.log(`🛑 Reached unavailable month: ${monthText}`);
      console.log('❌ No more future months available.');
      return false;
    }
  } catch (error) {
    console.log('No unavailable month button found, continuing...');
  }
  
  // Look for the next month button
  console.log('Looking for next month button...');
  
  let nextMonthButton;
  
  // Try to find the actual next month button (not current/active month)
  try {
    // First, try the most specific selector for next month
    nextMonthButton = await page.$('a[data-testid="btn-next-month-available"]');
    if (nextMonthButton) {
      const monthText = await nextMonthButton.evaluate((el: Element) => el.textContent?.trim());
      console.log(`✅ Found next month button: ${monthText}`);
    } else {
      console.log('❌ No btn-next-month-available found');
    }
  } catch (error) {
    console.log('Error finding next month button:', error);
  }
  
  if (!nextMonthButton) {
    console.log('🛑 Could not find next month button. Checking available month buttons...');
    
    // Check if there are any month selectors available at all
    const allMonthButtons = await page.$$('a[class*="MonthSelector_month-selector_button"], p[class*="MonthSelector_month-selector_button"]');
    const monthInfo = [];
    
    for (const button of allMonthButtons) {
      const text = await button.evaluate((el: Element) => el.textContent?.trim());
      const className = await button.evaluate((el: Element) => el.className);
      const isDisabled = className.includes('--disabled') || await button.evaluate((el: Element) => el.tagName === 'P');
      const testId = await button.evaluate((el: Element) => el.getAttribute('data-testid'));
      monthInfo.push({ text, isDisabled, testId, className });
    }
    
    console.log('Available month buttons:', monthInfo);
    
    if (monthInfo.some(m => m.isDisabled || m.testId === 'btn-next-month-unavailable')) {
      console.log('📅 Reached end of available months.');
      return false;
    } else {
      console.log('🛑 Unable to navigate to next month automatically.');
      return false;
    }
  } else {
    // Click the next month button
    const monthText = await nextMonthButton.evaluate((el: Element) => el.textContent?.trim());
    console.log(`🔄 Clicking next month button: ${monthText}`);
    
    await nextMonthButton.click();
    
    // Wait for the page to update
    console.log('⏳ Waiting for month to change...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Wait for any navigation or content updates
    try {
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 5000 });
    } catch (error) {
      console.log('ℹ️ No navigation detected after clicking next month');
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Additional stabilization time
    console.log('✅ Successfully navigated to next month');
    return true;
  }
};

/**
 * Continuously monitor for appointment availability
 */
const monitorAppointments = async (page: Page): Promise<void> => {
  console.log('🔄 Starting appointment monitoring...');
  
  while (true) {
    // Check for appointments on current page
    const appointmentsFound = await checkAppointmentAvailability(page);
    
    if (appointmentsFound) {
      console.log('🎉 APPOINTMENTS FOUND! Stopping monitoring.');
      await waitForUserInput(); // Wait for user to proceed with booking
      break;
    }
    
    console.log('📅 No appointments available on current page.');
    
    // Give user options for what to do next
    console.log('\n🤔 What would you like to do next?');
    console.log('   1. Press ENTER to refresh current page and check again');
    console.log('   2. Type "next" to try navigating to next month');
    console.log('   3. Type "stop" to stop monitoring');
    console.log('   4. Type "manual" to manually navigate to a different month');
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const choice = await new Promise<string>((resolve) => {
      rl.question('⏳ Your choice: ', (answer: string) => {
        rl.close();
        resolve(answer.trim().toLowerCase());
      });
    });

    if (choice === 'stop') {
      console.log('🛑 Stopping monitoring as requested...');
      break;
    } else if (choice === 'next') {
      console.log('🔄 Attempting to navigate to next month...');
      const navigated = await navigateToNextMonth(page);
      if (!navigated) {
        console.log('❌ Could not navigate to next month. Please try manual navigation.');
        continue;
      }
      // Wait for page to stabilize after navigation
      await new Promise(resolve => setTimeout(resolve, 3000));
    } else if (choice === 'manual') {
      console.log('🔧 Manual navigation mode:');
      console.log('⏳ Please manually navigate to the month you want to check, then press ENTER...');
      await waitForUserInput();
    } else {
      // Default: refresh current page
      console.log('🔄 Refreshing current page...');
      await page.reload({ waitUntil: 'domcontentloaded' });
      
      // Wait for page to stabilize after refresh
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Perform human-like movements before next check
    await performHumanLikeMovements(page);
  }
};

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
    console.log('🛑 Could not find login button automatically. Checking if already logged in...');
    
    // Look for "My application" div which indicates user is already logged in
    const myApplicationSelectors = [
      'div#my-application',
      'div[class*="cursor-pointer"]:contains("My application")',
      'div:contains("My application")'
    ];
    
    let myApplicationDiv;
    for (const selector of myApplicationSelectors) {
      try {
        console.log(`Trying My application selector: ${selector}`);
        myApplicationDiv = await page.$(selector);
        if (myApplicationDiv) {
          console.log(`✅ Found "My application" with selector: ${selector}`);
          break;
        }
      } catch (error) {
        console.log(`❌ My application selector failed: ${selector}`);
      }
    }
    if (myApplicationDiv) {
      console.log('✅ Found "My application" - user appears to be already logged in!');
      console.log('🔄 Clicking "My application" to proceed...');
      await myApplicationDiv.click();
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {
        console.log('ℹ️ No navigation detected after clicking My application');
      });
      // Skip the entire login process and go straight to the Select button logic
    } else {
      console.log('🛑 Login button not found and not already logged in. Please login manually.');
      const clickedElement = await waitForUserInputWithTracking(page);
      if (clickedElement) {
        console.log('💾 Save this selector for future use:', clickedElement.selectors[0]);
      }
    }
  } else {
    await loginButton.click();
    await page.waitForNavigation();

    // Login form processing - only if we clicked the login button
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
  }

  // Wait for page to load after login (or after clicking My application)
  console.log('🔄 Waiting for the page to load...');
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

  // Wait for page to load after select button click
  console.log('🔄 Waiting for page to load after select button click...');
  await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for page to stabilize

  // Find and ensure the checkbox is checked
  // console.log('Looking for the PTA/GBLON2DE-GBP checkbox...');
  
  // let checkbox;
  // const checkboxSelectors = [
  //   'input[data-testid="checkbox-mobile-view-PTA/GBLON2DE-GBP"]', // Most specific - data-testid
  //   'input[id="checkbox-mobile-view-PTA/GBLON2DE-GBP"]', // ID selector
  //   'input[value="PTA/GBLON2DE-GBP"]', // Value selector
  //   'input[type="checkbox"][class*="TlsCheckbox_tls-checkbox_input"]', // Class pattern
  // ];
  
  // for (const selector of checkboxSelectors) {
  //   try {
  //     console.log(`Trying checkbox selector: ${selector}`);
  //     checkbox = await page.waitForSelector(selector, { visible: true, timeout: 5000 });
  //     if (checkbox) {
  //       console.log(`✅ Found checkbox with selector: ${selector}`);
  //       break;
  //     }
  //   } catch (error) {
  //     console.log(`❌ Checkbox selector failed: ${selector}`);
  //   }
  // }
  
  // if (!checkbox) {
  //   console.log('🛑 Could not find checkbox automatically. Please check it manually.');
  //   console.log('⏳ Please check the PTA/GBLON2DE-GBP checkbox, then press ENTER...');
  //   const clickedElement = await waitForUserInputWithTracking(page);
  //   if (clickedElement) {
  //     console.log('💾 Save this checkbox selector for future use:', clickedElement.selectors[0]);
  //   }
  // } else {
  //   // Check if the checkbox is already checked
  //   const isChecked = await checkbox.evaluate(el => (el as HTMLInputElement).checked);
  //   console.log(`📋 Checkbox current state: ${isChecked ? 'checked' : 'unchecked'}`);
    
  //   if (isChecked) {
  //     await checkbox.click();
  //     console.log('✅ Checkbox unchecked successfully!');
  //   } else {
  //     console.log('✅ Checkbox is already unchecked!');
  //   }
  // }

  // Find and click the Continue button
  console.log('Looking for Continue button...');
  
  let continueButton;
  const continueSelectors = [
    'a[data-testid="btn-book-appointment"]', // Most specific - data-testid
    'a[id="book-appointment-btn"]', // ID selector
    'a[href*="appointment-booking"]', // Href pattern
    'a[class*="bg-white"][class*="text-primary-500"]:contains("Continue")', // Class and text pattern
    'a:contains("Continue")', // Any link containing "Continue"
  ];
  
  for (const selector of continueSelectors) {
    try {
      console.log(`Trying continue selector: ${selector}`);
      continueButton = await page.waitForSelector(selector, { visible: true, timeout: 5000 });
      if (continueButton) {
        console.log(`✅ Found continue button with selector: ${selector}`);
        break;
      }
    } catch (error) {
      console.log(`❌ Continue selector failed: ${selector}`);
    }
  }
  
  if (!continueButton) {
    console.log('🛑 Could not find Continue button automatically. Please click it manually.');
    console.log('⏳ Click the "Continue" button, then press ENTER...');
    const clickedElement = await waitForUserInputWithTracking(page);
    if (clickedElement) {
      console.log('💾 Save this continue button selector for future use:', clickedElement.selectors[0]);
    }
  } else {
    await continueButton.click();
    console.log('✅ Continue button clicked successfully!');
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {
      console.log('ℹ️ No navigation detected after clicking Continue button');
    });
  }

  // Wait for page to load after continue button click
  console.log('🔄 Waiting for page to load after continue button click...');
  await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for page to stabilize

  // Start continuous appointment monitoring
  await monitorAppointments(page);
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
