// Type definitions for the visa scraper application

export interface IPHealthResult {
  ip: string;
  location: {
    country: string;
    city: string;
    region: string;
    isp: string;
  };
  risks: {
    isProxy: boolean;
    isVPN: boolean;
    isTor: boolean;
    isBotnet: boolean;
    isSpam: boolean;
    fraudScore: number;
    blacklisted: string[];
  };
  recommendation: 'SAFE' | 'CAUTION' | 'UNSAFE';
  details: string[];
}

export interface SessionInfo {
  startTime: string;
  userAgent: string;
  proxyUsed: boolean;
  captchaSolved: number;
  errors: number;
}

export interface CaptchaDetectionResult {
  hasCaptcha: boolean;
  type: string;
}
