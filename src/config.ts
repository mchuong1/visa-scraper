// Configuration constants and environment variables

import 'dotenv/config';

// Use environment variables for sensitive data
export const PROXY_HOST = process.env.PROXY_HOST || '';
export const PROXY_USERNAME = process.env.PROXY_USERNAME || '';
export const PROXY_PASSWORD = process.env.PROXY_PASSWORD || '';

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
export const validateEnvironment = (): void => {
  if (!PROXY_HOST || !PROXY_USERNAME || !PROXY_PASSWORD) {
    console.error('❌ Missing required environment variables. Please check your .env file.');
    console.error('Required: PROXY_HOST, PROXY_USERNAME, PROXY_PASSWORD');
    process.exit(1);
  }
};

// Generate random user agent
export const getRandomUserAgent = (): string => {
  return userAgentList[Math.floor(Math.random() * userAgentList.length)];
};
