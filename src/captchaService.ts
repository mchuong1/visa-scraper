// Automated CAPTCHA solving service using 2Captcha and Anti-Captcha

import { Page } from 'puppeteer';
import { Solver as TwoCaptchaSolver } from '2captcha';
import anticaptcha from 'anticaptcha';

export interface CaptchaServiceConfig {
  twoCaptchaApiKey?: string;
  antiCaptchaApiKey?: string;
  preferredService?: 'twocaptcha' | 'anticaptcha' | 'auto';
  maxSolveTime?: number; // in milliseconds
  retryAttempts?: number;
}

interface InternalCaptchaServiceConfig {
  twoCaptchaApiKey?: string;
  antiCaptchaApiKey?: string;
  preferredService: 'twocaptcha' | 'anticaptcha' | 'auto';
  maxSolveTime: number;
  retryAttempts: number;
}

export interface CaptchaSolveResult {
  success: boolean;
  solution?: string;
  error?: string;
  service?: string;
  timeSpent?: number;
}

export interface CaptchaChallenge {
  type: 'recaptcha-v2' | 'recaptcha-v3' | 'hcaptcha' | 'turnstile' | 'cloudflare' | 'funcaptcha';
  sitekey?: string;
  pageUrl: string;
  action?: string; // for reCAPTCHA v3
  minScore?: number; // for reCAPTCHA v3
  data?: string; // for Turnstile
  blob?: string; // for FunCaptcha
}

export class CaptchaService {
  private twoCaptchaSolver?: TwoCaptchaSolver;
  private antiCaptchaClient?: any;
  private config: InternalCaptchaServiceConfig;

  constructor(config: CaptchaServiceConfig) {
    this.config = {
      preferredService: 'auto',
      maxSolveTime: 120000, // 2 minutes
      retryAttempts: 3,
      ...config
    };

    // Initialize 2Captcha if API key is provided
    if (this.config.twoCaptchaApiKey) {
      this.twoCaptchaSolver = new TwoCaptchaSolver(this.config.twoCaptchaApiKey);
    }

    // Initialize Anti-Captcha if API key is provided
    if (this.config.antiCaptchaApiKey) {
      this.antiCaptchaClient = anticaptcha;
      // Note: Anti-captcha API key is set per request, not globally
    }
  }

  /**
   * Auto-detect and solve CAPTCHA on a page
   */
  async autoSolvePage(page: Page): Promise<CaptchaSolveResult> {
    console.log('🔍 Auto-detecting CAPTCHA type on page...');
    
    const challenge = await this.detectCaptchaChallenge(page);
    if (!challenge) {
      return { success: false, error: 'No CAPTCHA detected on page' };
    }

    console.log(`🎯 Detected ${challenge.type} CAPTCHA`);
    return await this.solveCaptcha(challenge);
  }

  /**
   * Detect CAPTCHA challenge on page
   */
  async detectCaptchaChallenge(page: Page): Promise<CaptchaChallenge | null> {
    const pageUrl = page.url();

    // Check for reCAPTCHA v2
    const recaptchaV2 = await page.$('.g-recaptcha, iframe[src*="recaptcha"]').catch(() => null);
    if (recaptchaV2) {
      const sitekey = await page.evaluate(() => {
        const element = document.querySelector('.g-recaptcha');
        return element?.getAttribute('data-sitekey') || 
               document.querySelector('[data-sitekey]')?.getAttribute('data-sitekey');
      });
      
      if (sitekey) {
        return { type: 'recaptcha-v2', sitekey, pageUrl };
      }
    }

    // Check for reCAPTCHA v3
    const recaptchaV3 = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('script')).some(script => 
        script.src.includes('recaptcha/api.js') || 
        script.textContent?.includes('grecaptcha.execute')
      );
    });
    
    if (recaptchaV3) {
      const sitekey = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script'));
        for (const script of scripts) {
          const match = script.textContent?.match(/sitekey['":\s]*['"]([^'"]+)['"]/i);
          if (match) return match[1];
        }
        return null;
      });
      
      if (sitekey) {
        return { type: 'recaptcha-v3', sitekey, pageUrl, action: 'submit', minScore: 0.3 };
      }
    }

    // Check for hCaptcha
    const hcaptcha = await page.$('.h-captcha, iframe[src*="hcaptcha"]').catch(() => null);
    if (hcaptcha) {
      const sitekey = await page.evaluate(() => {
        const element = document.querySelector('.h-captcha');
        return element?.getAttribute('data-sitekey') || 
               document.querySelector('[data-hcaptcha-sitekey]')?.getAttribute('data-hcaptcha-sitekey');
      });
      
      if (sitekey) {
        return { type: 'hcaptcha', sitekey, pageUrl };
      }
    }

    // Check for Cloudflare Turnstile
    const turnstile = await page.$('.cf-turnstile, iframe[src*="turnstile"]').catch(() => null);
    if (turnstile) {
      const sitekey = await page.evaluate(() => {
        const element = document.querySelector('.cf-turnstile');
        return element?.getAttribute('data-sitekey') || 
               document.querySelector('[data-cf-turnstile-sitekey]')?.getAttribute('data-cf-turnstile-sitekey');
      });
      
      if (sitekey) {
        return { type: 'turnstile', sitekey, pageUrl };
      }
    }

    // Check for FunCaptcha
    const funcaptcha = await page.$('#funcaptcha, iframe[src*="funcaptcha"]').catch(() => null);
    if (funcaptcha) {
      const publicKey = await page.evaluate(() => {
        const element = document.querySelector('#funcaptcha');
        return element?.getAttribute('data-pkey') || 
               document.querySelector('[data-pkey]')?.getAttribute('data-pkey');
      });
      
      if (publicKey) {
        return { type: 'funcaptcha', sitekey: publicKey, pageUrl };
      }
    }

    // Check for Cloudflare challenge (generic)
    const isCloudflareChallenge = await page.evaluate(() => {
      const title = document.title.toLowerCase();
      const content = document.body?.textContent?.toLowerCase() || '';
      
      return title.includes('just a moment') || 
             title.includes('checking your browser') ||
             title.includes('cloudflare') ||
             content.includes('checking your browser') ||
             content.includes('cloudflare') ||
             window.location.href.includes('cdn-cgi/challenge-platform');
    });

    if (isCloudflareChallenge) {
      return { type: 'cloudflare', pageUrl };
    }

    return null;
  }

  /**
   * Solve CAPTCHA using configured services
   */
  async solveCaptcha(challenge: CaptchaChallenge): Promise<CaptchaSolveResult> {
    const startTime = Date.now();
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      console.log(`🔄 CAPTCHA solve attempt ${attempt}/${this.config.retryAttempts}`);
      
      try {
        let result: CaptchaSolveResult;
        
        // Determine which service to use
        const service = this.getPreferredService();
        
        if (service === 'twocaptcha' && this.twoCaptchaSolver) {
          result = await this.solveWithTwoCaptcha(challenge);
        } else if (service === 'anticaptcha' && this.antiCaptchaClient) {
          result = await this.solveWithAntiCaptcha(challenge);
        } else {
          return { success: false, error: 'No captcha service available' };
        }
        
        if (result.success) {
          result.timeSpent = Date.now() - startTime;
          return result;
        }
        
        console.log(`❌ Attempt ${attempt} failed: ${result.error}`);
        
        // Wait before retry
        if (attempt < this.config.retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
      } catch (error) {
        console.log(`❌ Attempt ${attempt} error:`, error);
      }
    }
    
    return { 
      success: false, 
      error: `Failed to solve CAPTCHA after ${this.config.retryAttempts} attempts`,
      timeSpent: Date.now() - startTime 
    };
  }

  /**
   * Solve CAPTCHA using 2Captcha service
   */
  private async solveWithTwoCaptcha(challenge: CaptchaChallenge): Promise<CaptchaSolveResult> {
    if (!this.twoCaptchaSolver) {
      return { success: false, error: '2Captcha not initialized', service: 'twocaptcha' };
    }

    console.log('🔧 Solving with 2Captcha...');

    try {
      let result: any;

      switch (challenge.type) {
        case 'recaptcha-v2':
          result = await this.twoCaptchaSolver.recaptcha(
            challenge.sitekey!,
            challenge.pageUrl
          );
          break;

        case 'recaptcha-v3':
          result = await this.twoCaptchaSolver.recaptcha(
            challenge.sitekey!,
            challenge.pageUrl,
            {
              version: 'v3',
              action: challenge.action || 'submit',
              min_score: challenge.minScore || 0.3,
            }
          );
          break;

        case 'hcaptcha':
          result = await this.twoCaptchaSolver.hcaptcha(
            challenge.sitekey!,
            challenge.pageUrl
          );
          break;

        case 'turnstile':
          result = await this.twoCaptchaSolver.turnstile(
            challenge.sitekey!,
            challenge.pageUrl
          );
          break;

        case 'funcaptcha':
          result = await this.twoCaptchaSolver.funCaptcha(
            challenge.sitekey!,
            challenge.pageUrl,
            'https://client-api.arkoselabs.com'
          );
          break;

        default:
          return { success: false, error: `Unsupported CAPTCHA type: ${challenge.type}`, service: 'twocaptcha' };
      }

      console.log('✅ 2Captcha solved successfully');
      return { success: true, solution: result.data || result, service: 'twocaptcha' };

    } catch (error) {
      console.log('❌ 2Captcha error:', error);
      return { success: false, error: String(error), service: 'twocaptcha' };
    }
  }

  /**
   * Solve CAPTCHA using Anti-Captcha service
   */
  private async solveWithAntiCaptcha(challenge: CaptchaChallenge): Promise<CaptchaSolveResult> {
    if (!this.antiCaptchaClient || !this.config.antiCaptchaApiKey) {
      return { success: false, error: 'Anti-Captcha not initialized', service: 'anticaptcha' };
    }

    console.log('🔧 Solving with Anti-Captcha...');

    try {
      // Create a simple HTTP request to Anti-Captcha API
      // This is a simplified implementation - you may want to use the official SDK
      const taskData: any = {
        clientKey: this.config.antiCaptchaApiKey,
        task: {}
      };

      switch (challenge.type) {
        case 'recaptcha-v2':
          taskData.task = {
            type: 'NoCaptchaTaskProxyless',
            websiteURL: challenge.pageUrl,
            websiteKey: challenge.sitekey!,
          };
          break;

        case 'recaptcha-v3':
          taskData.task = {
            type: 'RecaptchaV3TaskProxyless',
            websiteURL: challenge.pageUrl,
            websiteKey: challenge.sitekey!,
            pageAction: challenge.action || 'submit',
            minScore: challenge.minScore || 0.3,
          };
          break;

        case 'hcaptcha':
          taskData.task = {
            type: 'HCaptchaTaskProxyless',
            websiteURL: challenge.pageUrl,
            websiteKey: challenge.sitekey!,
          };
          break;

        case 'turnstile':
          taskData.task = {
            type: 'TurnstileTaskProxyless',
            websiteURL: challenge.pageUrl,
            websiteKey: challenge.sitekey!,
          };
          break;

        case 'funcaptcha':
          taskData.task = {
            type: 'FunCaptchaTaskProxyless',
            websiteURL: challenge.pageUrl,
            websitePublicKey: challenge.sitekey!,
          };
          break;

        default:
          return { success: false, error: `Unsupported CAPTCHA type: ${challenge.type}`, service: 'anticaptcha' };
      }

      // For now, return a simulated response
      // In a real implementation, you'd make HTTP requests to the Anti-Captcha API
      console.log('⚠️ Anti-Captcha integration requires HTTP requests - using fallback');
      return { success: false, error: 'Anti-Captcha requires HTTP API implementation', service: 'anticaptcha' };

    } catch (error) {
      console.log('❌ Anti-Captcha error:', error);
      return { success: false, error: String(error), service: 'anticaptcha' };
    }
  }

  /**
   * Submit CAPTCHA solution to page
   */
  async submitSolution(page: Page, solution: string, captchaType: string): Promise<boolean> {
    console.log('📝 Submitting CAPTCHA solution...');

    try {
      switch (captchaType) {
        case 'recaptcha-v2':
          // Find and fill the reCAPTCHA textarea
          await page.evaluate((token) => {
            const textarea = document.querySelector('textarea[name="g-recaptcha-response"]') as HTMLTextAreaElement;
            if (textarea) {
              textarea.value = token;
              textarea.style.display = 'block';
              
              // Trigger callback if exists
              if (window.grecaptcha && window.grecaptcha.getResponse) {
                window.grecaptcha.execute();
              }
            }
          }, solution);
          break;

        case 'recaptcha-v3':
          // For v3, the solution is usually submitted automatically
          await page.evaluate((token) => {
            // Set the token in any hidden inputs
            const inputs = document.querySelectorAll('input[name*="recaptcha"], input[name*="g-recaptcha"]');
            inputs.forEach((input: any) => {
              input.value = token;
            });
          }, solution);
          break;

        case 'hcaptcha':
          await page.evaluate((token) => {
            const textarea = document.querySelector('textarea[name="h-captcha-response"]') as HTMLTextAreaElement;
            if (textarea) {
              textarea.value = token;
              
              // Trigger hCaptcha callback
              if (window.hcaptcha) {
                window.hcaptcha.execute();
              }
            }
          }, solution);
          break;

        case 'turnstile':
          await page.evaluate((token) => {
            const input = document.querySelector('input[name="cf-turnstile-response"]') as HTMLInputElement;
            if (input) {
              input.value = token;
            }
          }, solution);
          break;

        case 'funcaptcha':
          await page.evaluate((token) => {
            const input = document.querySelector('input[name="fc-token"]') as HTMLInputElement;
            if (input) {
              input.value = token;
            }
          }, solution);
          break;
      }

      // Wait for any DOM changes
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('✅ CAPTCHA solution submitted');
      return true;

    } catch (error) {
      console.log('❌ Error submitting CAPTCHA solution:', error);
      return false;
    }
  }

  /**
   * Get preferred service based on configuration and availability
   */
  private getPreferredService(): 'twocaptcha' | 'anticaptcha' {
    if (this.config.preferredService === 'twocaptcha' && this.twoCaptchaSolver) {
      return 'twocaptcha';
    }
    if (this.config.preferredService === 'anticaptcha' && this.antiCaptchaClient) {
      return 'anticaptcha';
    }
    
    // Auto mode - prefer 2Captcha if available
    if (this.twoCaptchaSolver) {
      return 'twocaptcha';
    }
    
    return 'anticaptcha';
  }

  /**
   * Check service balance
   */
  async checkBalance(): Promise<{ twocaptcha?: number; anticaptcha?: number }> {
    const balances: any = {};

    if (this.twoCaptchaSolver) {
      try {
        const balance = await this.twoCaptchaSolver.balance();
        balances.twocaptcha = balance;
        console.log(`💰 2Captcha balance: $${balance}`);
      } catch (error) {
        console.log('❌ Error checking 2Captcha balance:', error);
      }
    }

    if (this.antiCaptchaClient && this.config.antiCaptchaApiKey) {
      console.log('💰 Anti-Captcha balance: Check manually at anti-captcha.com');
    }

    return balances;
  }
}

// Global declarations for browser APIs
declare global {
  interface Window {
    grecaptcha?: any;
    hcaptcha?: any;
  }
}
