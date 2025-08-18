// CAPTCHA detection and handling functionality

import { Page } from 'puppeteer';
import { CaptchaDetectionResult, SessionInfo, AutomatedCaptchaResult } from './types';
import { getUserChoice, waitForUserInput, clearBrowserData } from './helpers';
import { userAgentList, tlsURL, TWOCAPTCHA_API_KEY, ANTICAPTCHA_API_KEY, PREFERRED_CAPTCHA_SERVICE } from './config';
import { CaptchaService } from './captchaService';

/**
 * Handle CAPTCHA loops with multiple strategies including automated solving
 */
export const handleCaptchaLoop = async (page: Page, sessionInfo: SessionInfo): Promise<void> => {
  const maxCaptchaAttempts = 5;
  let captchaAttempt = 0;
  
  // Initialize CAPTCHA service if API keys are available
  let captchaService: CaptchaService | null = null;
  if (TWOCAPTCHA_API_KEY || ANTICAPTCHA_API_KEY) {
    captchaService = new CaptchaService({
      twoCaptchaApiKey: TWOCAPTCHA_API_KEY,
      antiCaptchaApiKey: ANTICAPTCHA_API_KEY,
      preferredService: PREFERRED_CAPTCHA_SERVICE,
      maxSolveTime: 120000,
      retryAttempts: 2
    });
    
    // Check service balance
    console.log('💰 Checking CAPTCHA service balance...');
    await captchaService.checkBalance();
  }
  
  while (captchaAttempt < maxCaptchaAttempts) {
    const captchaStatus = await detectCaptcha(page);
    
    if (!captchaStatus.hasCaptcha) {
      console.log('✅ No CAPTCHA detected, proceeding...');
      break;
    }
    
    captchaAttempt++;
    sessionInfo.captchaSolved++;
    console.log(`🤖 CAPTCHA detected (Type: ${captchaStatus.type}) - Attempt ${captchaAttempt}/${maxCaptchaAttempts}`);
    
    // Try automated solving first if service is available
    if (captchaService) {
      console.log('🚀 Attempting automated CAPTCHA solving...');
      const automatedResult = await attemptAutomatedSolving(page, captchaService);
      
      if (automatedResult.solved) {
        console.log(`✅ CAPTCHA solved automatically using ${automatedResult.service} in ${automatedResult.timeSpent}ms`);
        
        // Wait for page to update after CAPTCHA solving
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if CAPTCHA is actually cleared
        const postSolveStatus = await detectCaptcha(page);
        if (!postSolveStatus.hasCaptcha) {
          console.log('✅ CAPTCHA cleared! Continuing...');
          break;
        } else {
          console.log('⚠️ CAPTCHA still detected after automated solving, falling back to manual mode...');
        }
      } else {
        console.log(`❌ Automated solving failed: ${automatedResult.error}`);
        console.log('🔄 Falling back to checkbox clicking and manual solving...');
      }
    }
    
    // Try clicking Cloudflare checkbox if it's a simple challenge
    if (captchaStatus.type.includes('cloudflare')) {
      console.log('🔘 Attempting to click Cloudflare checkbox...');
      const checkboxClicked = await clickCloudflareCheckbox(page);
      if (checkboxClicked) {
        console.log('✅ Cloudflare checkbox challenge resolved!');
        break;
      } else {
        console.log('❌ Cloudflare checkbox click failed, continuing to manual options...');
      }
    }
    
    // Give user options for handling CAPTCHA (manual fallback)
    console.log('🔧 CAPTCHA Options:');
    console.log('   1. Solve manually and press ENTER to continue');
    console.log('   2. Type "skip" and press ENTER to skip CAPTCHA detection');
    console.log('   3. Type "refresh" and press ENTER to refresh the page');
    console.log('   4. Type "wait" and press ENTER to wait 2 minutes (helps with rate limiting)');
    console.log('   5. Type "cookies" and press ENTER to clear cookies and try again');
    console.log('   6. Type "stealth" and press ENTER to try stealth reload');
    console.log('   7. Type "human" and press ENTER for human-like browsing simulation');
    console.log('   8. Type "checkbox" and press ENTER to try clicking Cloudflare checkbox');
    if (captchaService) {
      console.log('   9. Type "auto" and press ENTER to retry automated solving');
    }
    console.log('⏳ Your choice:');
    
    const userChoice = await getUserChoice();
    
    if (userChoice === 'skip') {
      console.log('⏭️ Skipping CAPTCHA detection and continuing...');
      break;
    } else if (userChoice === 'refresh') {
      console.log('🔄 Refreshing page...');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await new Promise(resolve => setTimeout(resolve, 3000));
      continue;
    } else if (userChoice === 'wait') {
      console.log('⏱️ Waiting 2 minutes to reset anti-bot measures...');
      console.log('💡 This helps the website "forget" about automation activity');
      await new Promise(resolve => setTimeout(resolve, 120000)); // 2 minutes
      console.log('✅ Wait complete, checking CAPTCHA status...');
      continue;
    } else if (userChoice === 'cookies') {
      console.log('🍪 Clearing cookies and cache...');
      await clearBrowserData(page);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await new Promise(resolve => setTimeout(resolve, 3000));
      continue;
    } else if (userChoice === 'stealth') {
      console.log('🥷 Attempting stealth reload...');
      await stealthReload(page);
      continue;
    } else if (userChoice === 'human') {
      console.log('👤 Simulating human browsing behavior...');
      await simulateHumanBehavior(page);
      continue;
    } else if (userChoice === 'checkbox') {
      console.log('🔘 Attempting to click Cloudflare checkbox...');
      const checkboxClicked = await clickCloudflareCheckbox(page);
      if (checkboxClicked) {
        console.log('✅ Cloudflare checkbox challenge resolved!');
        break;
      } else {
        console.log('❌ Cloudflare checkbox click failed, continuing...');
      }
      continue;
    } else if (userChoice === 'auto' && captchaService) {
      console.log('🤖 Retrying automated CAPTCHA solving...');
      const automatedResult = await attemptAutomatedSolving(page, captchaService);
      
      if (automatedResult.solved) {
        console.log(`✅ CAPTCHA solved automatically using ${automatedResult.service}`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const postSolveStatus = await detectCaptcha(page);
        if (!postSolveStatus.hasCaptcha) {
          console.log('✅ CAPTCHA cleared! Continuing...');
          break;
        }
      } else {
        console.log(`❌ Automated solving failed again: ${automatedResult.error}`);
      }
      continue;
    } else {
      // Default behavior - wait for manual solving
      console.log('🔧 Please solve the CAPTCHA manually in the browser window.');
      console.log('⏳ Press ENTER after you have solved the CAPTCHA...');
      await waitForUserInput();
      
      // Wait a bit longer before checking again (sometimes CAPTCHAs take time to clear)
      console.log('⏱️ Waiting 5 seconds for CAPTCHA to fully clear...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check once more after manual solving
      const postSolveStatus = await detectCaptcha(page);
      if (!postSolveStatus.hasCaptcha) {
        console.log('✅ CAPTCHA cleared! Continuing...');
        break;
      } else {
        console.log('⚠️ CAPTCHA still detected after manual solving...');
        if (captchaAttempt >= 2) {
          console.log('💡 The website might be in "suspicious mode". Try these options:');
          console.log('   - Use "wait" to pause for 2 minutes');
          console.log('   - Use "cookies" to clear browser data');
          console.log('   - Use "stealth" for advanced reload');
          console.log('   - Use "human" for behavior simulation');
          console.log('   - Use "skip" to bypass detection and continue');
          if (captchaService) {
            console.log('   - Use "auto" to retry automated solving');
          }
        }
      }
    }
    
    // Additional strategies for persistent CAPTCHAs
    if (captchaAttempt >= 3) {
      console.log('🛑 Persistent CAPTCHA loop detected!');
      console.log('💡 Website Anti-Bot Countermeasures:');
      console.log('   - The site is likely flagging this session as suspicious');
      console.log('   - Try the "wait" option to let the site cool down');
      console.log('   - Try the "cookies" option to reset browser fingerprint');
      console.log('   - Try the "stealth" option for advanced evasion');
      console.log('   - Try the "human" option to simulate real user behavior');
      console.log('   - Consider switching to a different proxy/IP');
      console.log('   - Manual browsing for 5-10 minutes might help reset the flag');
    }
    
    if (captchaAttempt >= maxCaptchaAttempts) {
      console.log('⚠️ Maximum CAPTCHA attempts reached. Continuing anyway...');
      break;
    }
  }
};

/**
 * Detect various types of CAPTCHAs and bot challenges
 */
export const detectCaptcha = async (page: Page): Promise<CaptchaDetectionResult> => {
  console.log('🔍 Scanning for CAPTCHA and bot detection...');
  
  // Enhanced CAPTCHA selectors - more comprehensive
  const captchaSelectors = {
    recaptcha: [
      'iframe[src*="recaptcha"]',
      '.g-recaptcha',
      '#recaptcha',
      '[data-sitekey]',
      '.recaptcha-checkbox'
    ],
    hcaptcha: [
      'iframe[src*="hcaptcha"]',
      '.h-captcha',
      '#hcaptcha',
      '[data-hcaptcha-sitekey]'
    ],
    turnstile: [
      'iframe[src*="turnstile"]',
      '.cf-turnstile',
      '#turnstile',
      '[data-cf-turnstile-sitekey]'
    ],
    cloudflare: [
      '#cf-challenge-running',
      '.cf-browser-verification',
      '#challenge-form',
      '.challenge-stage',
      '.cf-wrapper',
      '.cf-error-overview',
      '#cf-content',
      '.cf-challenge-container',
      '[data-ray]',
      '.challenge-wrapper',
      '.challenge-error-text',
      '#challenge-error-title'
    ],
    generic: [
      '[class*="captcha"]', 
      '[id*="captcha"]',
      '[class*="challenge"]',
      '[id*="challenge"]',
      '.verification',
      '#verification',
      '.robot-check',
      '.security-check',
      '.bot-detection',
      '.anti-bot'
    ]
  };

  // Check each type and its selectors
  for (const [type, selectors] of Object.entries(captchaSelectors)) {
    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          console.log(`🎯 CAPTCHA/Bot detection found: ${type} (selector: ${selector})`);
          return {
            hasCaptcha: true,
            type: `${type} (${selector})`
          };
        }
      } catch (error) {
        // Continue checking other selectors
      }
    }
  }

  // Enhanced Cloudflare detection
  const currentUrl = page.url();
  const pageTitle = await page.title().catch(() => '');
  
  // Check for Cloudflare-specific indicators
  if (currentUrl.includes('cdn-cgi/challenge-platform') || 
      currentUrl.includes('__cf_chl_') ||
      pageTitle.includes('Just a moment') ||
      pageTitle.includes('Checking your browser') ||
      pageTitle.includes('DDoS protection') ||
      pageTitle.includes('Cloudflare')) {
    console.log(`🎯 Cloudflare challenge detected: URL/Title based`);
    return {
      hasCaptcha: true,
      type: 'cloudflare-challenge'
    };
  }

  // Check page content for CAPTCHA keywords (more comprehensive)
  const pageContent = await page.content().catch(() => '');
  const captchaKeywords = [
    'captcha', 'recaptcha', 'hcaptcha', 'turnstile',
    'verify you are human', 'prove you are human', 'human verification',
    'security check', 'robot verification', 'anti-robot',
    'challenge', 'verification required', 'please verify',
    'checking your browser', 'just a moment', 'ddos protection',
    'cloudflare', 'ray id', 'performance & security',
    'browser verification', 'automated requests'
  ];

  const lowerContent = pageContent.toLowerCase();
  for (const keyword of captchaKeywords) {
    if (lowerContent.includes(keyword)) {
      console.log(`🎯 CAPTCHA/Bot detection keyword found: "${keyword}"`);
      return {
        hasCaptcha: true,
        type: `keyword: ${keyword}`
      };
    }
  }

  // Check for suspicious redirects or challenge pages
  if (currentUrl.includes('challenge') || currentUrl.includes('verify') || 
      currentUrl.includes('captcha') || currentUrl.includes('cf-') ||
      currentUrl.includes('bot-check') || currentUrl.includes('security-check')) {
    console.log(`🎯 Challenge URL detected: ${currentUrl}`);
    return {
      hasCaptcha: true,
      type: 'url-based'
    };
  }

  // Check for meta refresh redirects (common with Cloudflare)
  try {
    const metaRefresh = await page.$('meta[http-equiv="refresh"]');
    if (metaRefresh) {
      const content = await metaRefresh.evaluate(el => el.getAttribute('content'));
      console.log(`🎯 Meta refresh detected: ${content}`);
      return {
        hasCaptcha: true,
        type: 'meta-refresh'
      };
    }
  } catch (error) {
    // Continue
  }

  // Check if page is stuck loading or redirecting
  const bodyText = await page.evaluate(() => document.body?.textContent || '').catch(() => '');
  if (bodyText.trim().length < 100 && !currentUrl.includes('tlscontact.com/visa/gb/gbLON2de/home')) {
    console.log(`🎯 Suspicious minimal content detected (${bodyText.trim().length} chars)`);
    return {
      hasCaptcha: true,
      type: 'minimal-content'
    };
  }

  console.log('✅ No CAPTCHA/Bot detection found');
  return {
    hasCaptcha: false,
    type: 'none'
  };
};

/**
 * Advanced stealth reload technique
 */
export const stealthReload = async (page: Page): Promise<void> => {
  try {
    console.log('🥷 Starting stealth reload sequence...');
    
    // Step 1: Navigate to a neutral page first
    console.log('📄 Navigating to neutral page...');
    await page.goto('about:blank', { waitUntil: 'load' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 2: Clear all data
    await clearBrowserData(page);
    
    // Step 3: Set new fingerprint
    console.log('🔄 Refreshing browser fingerprint...');
    const newUserAgent = userAgentList[Math.floor(Math.random() * userAgentList.length)];
    await page.setUserAgent(newUserAgent);
    
    // Step 4: Add random delay to appear more human
    const randomDelay = Math.floor(Math.random() * 5000) + 3000; // 3-8 seconds
    console.log(`⏳ Random delay: ${randomDelay}ms`);
    await new Promise(resolve => setTimeout(resolve, randomDelay));
    
    // Step 5: Navigate back to target
    console.log('🎯 Returning to target page...');
    await page.goto(tlsURL, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    console.log('✅ Stealth reload complete');
  } catch (error) {
    console.log('⚠️ Stealth reload failed:', error);
  }
};

/**
 * Simulate human-like browsing behavior
 */
export const simulateHumanBehavior = async (page: Page): Promise<void> => {
  try {
    console.log('👤 Starting human behavior simulation...');
    
    // Random mouse movements
    console.log('🖱️ Simulating mouse movements...');
    for (let i = 0; i < 3; i++) {
      const x = Math.floor(Math.random() * 800) + 100;
      const y = Math.floor(Math.random() * 600) + 100;
      await page.mouse.move(x, y);
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    }
    
    // Random scrolling
    console.log('📜 Simulating scrolling...');
    await page.evaluate(() => {
      window.scrollTo(0, Math.floor(Math.random() * 500));
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Click on a safe element (like body)
    console.log('👆 Simulating clicks...');
    await page.click('body').catch(() => {}); // Ignore if fails
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate typing behavior (random keystrokes)
    console.log('⌨️ Simulating keyboard activity...');
    await page.keyboard.press('Tab').catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Random viewport changes
    console.log('📱 Adjusting viewport...');
    const viewports = [
      { width: 1366, height: 768 },
      { width: 1920, height: 1080 },
      { width: 1280, height: 720 }
    ];
    const randomViewport = viewports[Math.floor(Math.random() * viewports.length)];
    await page.setViewport(randomViewport);
    
    // Wait with human-like timing
    const humanDelay = Math.floor(Math.random() * 3000) + 2000; // 2-5 seconds
    console.log(`⏱️ Human-like pause: ${humanDelay}ms`);
    await new Promise(resolve => setTimeout(resolve, humanDelay));
    
    console.log('✅ Human behavior simulation complete');
  } catch (error) {
    console.log('⚠️ Human behavior simulation failed:', error);
  }
};

/**
 * Attempt automated CAPTCHA solving using the captcha service
 */
export const attemptAutomatedSolving = async (page: Page, captchaService: CaptchaService): Promise<AutomatedCaptchaResult> => {
  try {
    console.log('🤖 Starting automated CAPTCHA solving...');
    const startTime = Date.now();
    
    // Use the service to auto-detect and solve
    const result = await captchaService.autoSolvePage(page);
    
    if (result.success && result.solution) {
      console.log('✅ CAPTCHA solution received, submitting...');
      
      // Determine captcha type for submission
      const challenge = await captchaService.detectCaptchaChallenge(page);
      const captchaType = challenge?.type || 'unknown';
      
      // Submit the solution
      const submitted = await captchaService.submitSolution(page, result.solution, captchaType);
      
      if (submitted) {
        return {
          solved: true,
          method: 'automated',
          service: result.service as 'twocaptcha' | 'anticaptcha',
          timeSpent: Date.now() - startTime
        };
      } else {
        return {
          solved: false,
          method: 'automated',
          error: 'Failed to submit solution to page'
        };
      }
    } else {
      return {
        solved: false,
        method: 'automated',
        error: result.error || 'Unknown solving error'
      };
    }
  } catch (error) {
    console.log('❌ Automated solving error:', error);
    return {
      solved: false,
      method: 'automated',
      error: String(error)
    };
  }
};

/**
 * Click Cloudflare checkbox if it's a simple challenge
 */
export const clickCloudflareCheckbox = async (page: Page): Promise<boolean> => {
  try {
    console.log('🔍 Looking for Cloudflare checkbox...');
    
    // Common selectors for Cloudflare checkbox
    const checkboxSelectors = [
      'input[type="checkbox"]', // Simple checkbox
      'input[type="checkbox"][id*="challenge"]',
      'input[type="checkbox"][name*="cf"]',
      'input[type="checkbox"][class*="challenge"]',
      '.cf-turnstile input[type="checkbox"]',
      '.challenge-form input[type="checkbox"]',
      '#challenge-form input[type="checkbox"]',
      'label input[type="checkbox"]'
    ];
    
    for (const selector of checkboxSelectors) {
      try {
        console.log(`🔍 Trying checkbox selector: ${selector}`);
        const checkbox = await page.$(selector);
        
        if (checkbox) {
          // Check if the checkbox is visible and not already checked
          const isVisible = await checkbox.isIntersectingViewport();
          const isChecked = await checkbox.evaluate((el) => (el as HTMLInputElement).checked);
          
          console.log(`📋 Found checkbox - Visible: ${isVisible}, Checked: ${isChecked}`);
          
          if (isVisible && !isChecked) {
            console.log(`✅ Clicking Cloudflare checkbox with selector: ${selector}`);
            await checkbox.click();
            
            // Wait for potential processing
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check if the challenge is resolving
            const postClickStatus = await detectCaptcha(page);
            if (!postClickStatus.hasCaptcha) {
              console.log('🎉 Cloudflare challenge cleared after checkbox click!');
              return true;
            } else {
              console.log('⏳ Checkbox clicked, waiting for challenge to process...');
              // Wait a bit longer for Cloudflare to process
              await new Promise(resolve => setTimeout(resolve, 5000));
              
              const finalStatus = await detectCaptcha(page);
              if (!finalStatus.hasCaptcha) {
                console.log('🎉 Cloudflare challenge cleared!');
                return true;
              }
            }
          } else if (isChecked) {
            console.log('✅ Checkbox is already checked, waiting for processing...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const status = await detectCaptcha(page);
            if (!status.hasCaptcha) {
              console.log('🎉 Cloudflare challenge cleared!');
              return true;
            }
          }
        }
      } catch (error) {
        console.log(`❌ Error with checkbox selector ${selector}:`, error);
        continue;
      }
    }
    
    console.log('❌ No clickable Cloudflare checkbox found');
    return false;
    
  } catch (error) {
    console.log('❌ Error in clickCloudflareCheckbox:', error);
    return false;
  }
};
