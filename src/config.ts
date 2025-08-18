// Configuration constants and environment variables

import 'dotenv/config';

// Use environment variables for sensitive data
export const PROXY_HOST = process.env.PROXY_HOST || '';
export const PROXY_USERNAME = process.env.PROXY_USERNAME || '';
export const PROXY_PASSWORD = process.env.PROXY_PASSWORD || '';

// CAPTCHA service API keys
export const TWOCAPTCHA_API_KEY = process.env.TWOCAPTCHA_API_KEY || '';
export const ANTICAPTCHA_API_KEY = process.env.ANTICAPTCHA_API_KEY || '';
export const PREFERRED_CAPTCHA_SERVICE = process.env.PREFERRED_CAPTCHA_SERVICE as 'twocaptcha' | 'anticaptcha' | 'auto' || 'auto';

// URLs
export const tlsURL = 'https://visas-de.tlscontact.com/visa/gb/gbLON2de/home';
export const vfsURL = 'https://visa.vfsglobal.com/gbr/en/prt/login';

// User agent list for randomization
export const userAgentList = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
];

// Validate required environment variables
export const validateEnvironment = (requireProxy: boolean = true): void => {
  if (requireProxy && (!PROXY_HOST || !PROXY_USERNAME || !PROXY_PASSWORD)) {
    console.error('❌ Missing required proxy environment variables. Please check your .env file.');
    console.error('Required: PROXY_HOST, PROXY_USERNAME, PROXY_PASSWORD');
    process.exit(1);
  }
  
  // Always check for TLS credentials
  if (!process.env.TLS_USERNAME || !process.env.TLS_PASSWORD) {
    console.error('❌ Missing required TLS Contact credentials. Please check your .env file.');
    console.error('Required: TLS_USERNAME, TLS_PASSWORD');
    process.exit(1);
  }

  // Check for CAPTCHA service credentials (at least one should be provided)
  if (!TWOCAPTCHA_API_KEY && !ANTICAPTCHA_API_KEY) {
    console.warn('⚠️ No CAPTCHA service API keys found. Automated CAPTCHA solving will not be available.');
    console.warn('Add TWOCAPTCHA_API_KEY or ANTICAPTCHA_API_KEY to your .env file for automated solving.');
  }
};

// Generate random user agent
export const getRandomUserAgent = (): string => {
  return userAgentList[Math.floor(Math.random() * userAgentList.length)];
};
