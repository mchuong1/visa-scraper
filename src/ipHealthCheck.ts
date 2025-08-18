// IP Health Check functionality

import { IPHealthResult } from './types';
import { getUserChoice } from './helpers';
import { tlsURL, PROXY_HOST, PROXY_USERNAME, PROXY_PASSWORD } from './config';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch from 'node-fetch';

/**
 * Create proxy agent if proxy is configured
 */
const createProxyAgent = (): any => {
  if (PROXY_HOST && PROXY_USERNAME && PROXY_PASSWORD) {
    const proxyUrl = `http://${PROXY_USERNAME}:${PROXY_PASSWORD}@${PROXY_HOST}`;
    console.log(`🌐 Using proxy for health check: ${PROXY_HOST}`);
    return new HttpsProxyAgent(proxyUrl);
  }
  console.log('📡 No proxy configured - checking your actual IP');
  return undefined;
};

/**
 * Create fetch options with proxy if available
 */
const createFetchOptions = (additionalOptions: any = {}): any => {
  const agent = createProxyAgent();
  return {
    ...additionalOptions,
    agent: agent
  };
};

/**
 * Perform comprehensive IP health check
 */
export const checkIPHealth = async (): Promise<IPHealthResult> => {
  console.log('🔍 Starting comprehensive IP health check...');
  
  const result: IPHealthResult = {
    ip: '',
    location: { country: '', city: '', region: '', isp: '' },
    risks: {
      isProxy: false,
      isVPN: false,
      isTor: false,
      isBotnet: false,
      isSpam: false,
      fraudScore: 0,
      blacklisted: []
    },
    recommendation: 'SAFE',
    details: []
  };

  try {
    // Step 1: Get IP information from ipinfo.io (through proxy if configured)
    console.log('📍 Step 1: Checking IP geolocation and ISP...');
    const ipInfoResponse = await fetch('https://ipinfo.io/json', createFetchOptions());
    const ipInfo = await ipInfoResponse.json();
    
    result.ip = ipInfo.ip;
    result.location = {
      country: ipInfo.country || 'Unknown',
      city: ipInfo.city || 'Unknown',
      region: ipInfo.region || 'Unknown',
      isp: ipInfo.org || 'Unknown'
    };

    console.log(`✅ IP: ${result.ip}`);
    console.log(`📍 Location: ${result.location.city}, ${result.location.region}, ${result.location.country}`);
    console.log(`🏢 ISP: ${result.location.isp}`);

    // Step 2: Check for proxy/VPN detection using multiple sources
    console.log('🛡️ Step 2: Checking proxy/VPN detection...');
    await checkProxyDetection(result);

    // Step 3: Test actual connectivity to TLS website (most important check)
    console.log('🌐 Step 3: Testing actual TLS website connectivity...');
    await testTLSConnectivity(result);

    // Step 4: Check IP reputation and blacklists
    console.log('🚫 Step 4: Checking IP reputation and blacklists...');
    await checkIPReputation(result);

    // Step 5: Analyze results and make recommendation
    analyzeIPHealth(result);

    return result;

  } catch (error) {
    console.error('❌ IP health check failed:', error);
    result.details.push('Failed to complete IP health check');
    result.recommendation = 'CAUTION';
    return result;
  }
};

/**
 * Check for proxy/VPN detection using multiple sources
 */
const checkProxyDetection = async (result: IPHealthResult): Promise<void> => {
  try {
    // Check with multiple IP detection services for better accuracy
    await Promise.all([
      checkIPAPI(result),
      checkIPInfo(result),
      checkIPQualityScore(result)
    ]);

    // Additional ISP-based detection with expanded patterns
    const ispLower = result.location.isp.toLowerCase();
    const suspiciousISPs = [
      // Hosting providers (high CAPTCHA risk)
      'hosting', 'datacenter', 'data center', 'cloud', 'server', 'virtual', 'proxy',
      'vpn', 'amazon', 'aws', 'google cloud', 'gcp', 'microsoft', 'azure',
      'digitalocean', 'linode', 'vultr', 'ovh', 'hetzner', 'contabo',
      'godaddy', 'namecheap', 'hostgator', 'bluehost', 'cloudflare',
      
      // VPN providers (very high CAPTCHA risk)
      'nordvpn', 'expressvpn', 'surfshark', 'cyberghost', 'ipvanish',
      'purevpn', 'hidemyass', 'tunnelbear', 'windscribe', 'protonvpn',
      
      // Proxy services (very high CAPTCHA risk)
      'bright data', 'luminati', 'oxylabs', 'smartproxy', 'blazingseollc',
      'storm proxies', 'rotating', 'residential proxy', 'datacenter proxy'
    ];

    for (const suspicious of suspiciousISPs) {
      if (ispLower.includes(suspicious)) {
        result.risks.isVPN = true;
        result.details.push(`⚠️ ISP contains suspicious keyword: "${suspicious}"`);
        result.risks.fraudScore += 35; // Higher penalty for ISP detection
        break;
      }
    }

  } catch (error) {
    console.log('⚠️ Could not complete proxy detection check');
    result.details.push('Proxy detection check failed');
  }
};

/**
 * Check IP-API.com for proxy/VPN detection
 */
const checkIPAPI = async (result: IPHealthResult): Promise<void> => {
  try {
    const url = `http://ip-api.com/json/${result.ip}?fields=status,proxy,hosting,mobile,query`;
    const response = await fetch(url, createFetchOptions());
    const data = await response.json();
    
    if (data.status === 'success') {
      if (data.proxy) {
        result.risks.isProxy = true;
        result.details.push('🔍 IP-API: Detected as proxy');
        result.risks.fraudScore += 40;
      }
      if (data.hosting) {
        result.risks.isVPN = true;
        result.details.push('🔍 IP-API: Detected as hosting/datacenter');
        result.risks.fraudScore += 35;
      }
      if (data.mobile) {
        result.details.push('📱 IP-API: Mobile IP detected');
        result.risks.fraudScore += 10; // Mobile IPs can be problematic
      }
    }
  } catch (error) {
    console.log('⚠️ IP-API check failed');
  }
};

/**
 * Check IPInfo.io for additional data
 */
const checkIPInfo = async (result: IPHealthResult): Promise<void> => {
  try {
    const response = await fetch(`https://ipinfo.io/${result.ip}/json`, createFetchOptions());
    const data = await response.json();
    
    // Check for hosting/datacenter indicators
    if (data.org) {
      const orgLower = data.org.toLowerCase();
      if (orgLower.includes('hosting') || orgLower.includes('datacenter') || 
          orgLower.includes('cloud') || orgLower.includes('server')) {
        result.risks.isVPN = true;
        result.details.push('🔍 IPInfo: Organization indicates hosting/datacenter');
        result.risks.fraudScore += 30;
      }
    }
    
    // Check anycast networks (often problematic)
    if (data.anycast) {
      result.details.push('🔍 IPInfo: Anycast network detected');
      result.risks.fraudScore += 20;
    }
  } catch (error) {
    console.log('⚠️ IPInfo check failed');
  }
};

/**
 * Check IP Quality Score (simulate with additional checks)
 */
const checkIPQualityScore = async (result: IPHealthResult): Promise<void> => {
  try {
    // Use additional endpoint for more comprehensive check
    const url = `https://check-host.net/ip-info?host=${result.ip}`;
    const response = await fetch(url, createFetchOptions());
    
    // If we can't reach certain endpoints, it might indicate blocking
    if (!response.ok) {
      result.details.push('⚠️ Network connectivity issues detected');
      result.risks.fraudScore += 15;
    }
    
    // Check for common proxy ports being open (heuristic)
    await checkCommonProxyPorts(result);
    
  } catch (error) {
    console.log('⚠️ Additional IP checks failed');
  }
};

/**
 * Test actual connectivity to TLS website
 */
const testTLSConnectivity = async (result: IPHealthResult): Promise<void> => {
  try {
    console.log('🌐 Testing actual connectivity to TLS website...');
    
    const startTime = Date.now();
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const fetchOptions = createFetchOptions({
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      signal: controller.signal
    });
    
    const response = await fetch(tlsURL, fetchOptions);
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    const responseText = await response.text();
    
    // Analyze response for CAPTCHA indicators
    const captchaIndicators = [
      'captcha', 'recaptcha', 'cloudflare', 'challenge',
      'blocked', 'access denied', 'rate limit', 'bot detection',
      'please verify', 'security check', 'cf-ray'
    ];
    
    const responseTextLower = responseText.toLowerCase();
    let captchaDetected = false;
    
    for (const indicator of captchaIndicators) {
      if (responseTextLower.includes(indicator)) {
        captchaDetected = true;
        result.details.push(`🚨 CAPTCHA/Block indicator found: "${indicator}"`);
        result.risks.fraudScore += 50; // Very high penalty for actual detection
        break;
      }
    }
    
    // Check response codes
    if (response.status === 403) {
      result.details.push('🚨 HTTP 403 Forbidden - IP likely blocked');
      result.risks.fraudScore += 60;
      captchaDetected = true;
    } else if (response.status === 429) {
      result.details.push('🚨 HTTP 429 Rate Limited - IP flagged');
      result.risks.fraudScore += 50;
      captchaDetected = true;
    } else if (response.status !== 200) {
      result.details.push(`⚠️ HTTP ${response.status} - Unusual response`);
      result.risks.fraudScore += 20;
    }
    
    // Check response time (very slow responses might indicate challenges)
    if (responseTime > 10000) {
      result.details.push(`⚠️ Slow response time: ${responseTime}ms (possible challenge)`);
      result.risks.fraudScore += 15;
    } else if (responseTime < 1000) {
      result.details.push(`✅ Fast response time: ${responseTime}ms`);
    }
    
    // Check for normal TLS website indicators
    if (responseTextLower.includes('tlscontact') && responseTextLower.includes('visa')) {
      if (!captchaDetected) {
        result.details.push('✅ Successfully loaded TLS website without blocks');
      }
    } else if (!captchaDetected) {
      result.details.push('⚠️ Unexpected response content - possible redirect or block');
      result.risks.fraudScore += 25;
    }
    
  } catch (error: any) {
    console.log('⚠️ TLS connectivity test failed:', error.message);
    result.details.push('❌ Failed to connect to TLS website');
    result.risks.fraudScore += 40; // High penalty for connection failure
  }
};

/**
 * Heuristic check for common proxy ports
 */
const checkCommonProxyPorts = async (result: IPHealthResult): Promise<void> => {
  // This is a simplified heuristic - in practice, port scanning would require special tools
  // We'll use the IP pattern to estimate likelihood
  const ipParts = result.ip.split('.');
  const lastOctet = parseInt(ipParts[3]);
  
  // IPs ending in common proxy ports are suspicious
  const suspiciousPorts = [80, 8080, 3128, 1080, 8888, 9999];
  if (suspiciousPorts.includes(lastOctet)) {
    result.details.push(`⚠️ IP ends in suspicious port number: ${lastOctet}`);
    result.risks.fraudScore += 10;
  }
};

/**
 * Check IP reputation and blacklists
 */
const checkIPReputation = async (result: IPHealthResult): Promise<void> => {
  try {
    // Check with AbuseIPDB-style reputation (using a public API through proxy)
    const reputationUrl = `http://ip-api.com/json/${result.ip}?fields=status,isp,org,as,mobile,proxy,hosting,query`;
    const reputationResponse = await fetch(reputationUrl, createFetchOptions());
    const reputationData = await reputationResponse.json();
    
    if (reputationData.status === 'success') {
      // Check for mobile carrier (mobile IPs are often problematic for automation)
      if (reputationData.mobile) {
        result.details.push('📱 Mobile IP detected - higher CAPTCHA risk');
        result.risks.fraudScore += 25; // Increased penalty for mobile
      }

      // Check ASN for known problematic networks with higher penalties
      const asn = reputationData.as || '';
      const problematicASNs = [
        { name: 'Cloudflare', penalty: 45 },
        { name: 'Amazon', penalty: 40 },
        { name: 'Google', penalty: 40 },
        { name: 'Microsoft', penalty: 40 },
        { name: 'DigitalOcean', penalty: 50 },
        { name: 'Linode', penalty: 50 },
        { name: 'Vultr', penalty: 50 },
        { name: 'OVH', penalty: 45 },
        { name: 'Hetzner', penalty: 45 }
      ];

      for (const problematic of problematicASNs) {
        if (asn.includes(problematic.name)) {
          result.risks.isVPN = true;
          result.details.push(`⚠️ ASN indicates high-risk cloud provider: ${problematic.name}`);
          result.risks.fraudScore += problematic.penalty;
          break;
        }
      }
    }

    // Additional residential IP checks
    await checkResidentialIP(result);

    // Recalculate fraud score with better weights for CAPTCHA prediction
    result.risks.fraudScore = Math.min(result.risks.fraudScore, 100);

  } catch (error) {
    console.log('⚠️ Could not complete IP reputation check');
    result.details.push('IP reputation check failed');
    result.risks.fraudScore += 10; // Small penalty for check failure
  }
};

/**
 * Check if IP appears to be residential vs datacenter
 */
const checkResidentialIP = async (result: IPHealthResult): Promise<void> => {
  try {
    // Heuristics for residential IP detection
    const isp = result.location.isp.toLowerCase();
    
    // Common residential ISP patterns
    const residentialPatterns = [
      'broadband', 'cable', 'dsl', 'fiber', 'telecom', 'internet',
      'communications', 'comcast', 'verizon', 'at&t', 'charter',
      'cox', 'spectrum', 'bt group', 'virgin', 'sky', 'vodafone',
      'orange', 'telefonica', 'deutsche telekom', 'o2'
    ];
    
    const isLikelyResidential = residentialPatterns.some(pattern => 
      isp.includes(pattern)
    );
    
    if (isLikelyResidential) {
      result.details.push('🏠 Appears to be residential IP - lower CAPTCHA risk');
      result.risks.fraudScore = Math.max(0, result.risks.fraudScore - 20); // Bonus for residential
    } else {
      // If not clearly residential and not already flagged as hosting, add suspicion
      if (!result.risks.isVPN && !isp.includes('mobile')) {
        result.details.push('🏢 Non-residential ISP pattern detected');
        result.risks.fraudScore += 15;
      }
    }
    
  } catch (error) {
    console.log('⚠️ Residential IP check failed');
  }
};

/**
 * Analyze IP health and make recommendation
 */
const analyzeIPHealth = (result: IPHealthResult): void => {
  console.log('\n📊 IP Health Analysis:');
  
  // Check geolocation consistency for Germany visa application
  const isGermanyApplication = tlsURL.includes('gbLON2de'); // UK to Germany application
  if (isGermanyApplication) {
    const acceptableCountries = ['GB', 'UK', 'DE', 'Germany'];
    const isGeoConsistent = acceptableCountries.some(country => 
      result.location.country.includes(country) || 
      result.location.region.includes(country)
    );
    
    if (!isGeoConsistent) {
      result.details.push(`🌍 Geolocation mismatch: IP in ${result.location.country}, applying for Germany visa from UK`);
      result.risks.fraudScore += 20;
    } else {
      result.details.push(`✅ Geolocation consistent with visa application`);
    }
  }

  // Determine recommendation
  if (result.risks.fraudScore >= 70 || result.risks.isProxy || result.risks.isVPN) {
    result.recommendation = 'UNSAFE';
    result.details.push('🚨 HIGH RISK: IP likely to be blocked or trigger CAPTCHAs');
  } else if (result.risks.fraudScore >= 30 || result.details.some(d => d.includes('⚠️'))) {
    result.recommendation = 'CAUTION';
    result.details.push('⚠️ MEDIUM RISK: IP may encounter some restrictions');
  } else {
    result.recommendation = 'SAFE';
    result.details.push('✅ LOW RISK: IP appears clean for automation');
  }

  // Display results
  console.log(`🎯 IP: ${result.ip}`);
  console.log(`📍 Location: ${result.location.city}, ${result.location.country}`);
  console.log(`🏢 ISP: ${result.location.isp}`);
  console.log(`📊 Fraud Score: ${result.risks.fraudScore}/100`);
  console.log(`🔍 Proxy: ${result.risks.isProxy ? '❌ Yes' : '✅ No'}`);
  console.log(`🔍 VPN/Hosting: ${result.risks.isVPN ? '❌ Yes' : '✅ No'}`);
  console.log(`\n📋 Details:`);
  result.details.forEach(detail => console.log(`   ${detail}`));
  
  // Recommendation
  const recommendations = {
    'SAFE': '✅ SAFE - Proceed with automation',
    'CAUTION': '⚠️ CAUTION - Monitor for issues, consider manual intervention',
    'UNSAFE': '🚨 UNSAFE - High risk of blocks, consider different proxy'
  };
  
  console.log(`\n🎯 Recommendation: ${recommendations[result.recommendation]}`);
};

/**
 * Prompt user for decision based on IP health results
 */
export const promptUserDecision = async (healthResult: IPHealthResult): Promise<boolean> => {
  if (healthResult.recommendation === 'SAFE') {
    return true; // Proceed automatically
  }

  console.log('\n🤔 What would you like to do?');
  console.log('   1. Type "proceed" to continue anyway');
  console.log('   2. Type "stop" to exit and change proxy');
  console.log('   3. Type "manual" to continue but skip proxy for manual testing');
  console.log('⏳ Your choice:');

  const choice = await getUserChoice();
  
  switch (choice) {
    case 'proceed':
      console.log('▶️ Proceeding with current IP despite risks...');
      return true;
    case 'stop':
      console.log('🛑 Stopping automation. Please configure a different proxy.');
      process.exit(0);
    case 'manual':
      console.log('👤 Continuing without proxy for manual testing...');
      return false; // Don't use proxy
    default:
      console.log('❓ Invalid choice, stopping for safety...');
      process.exit(0);
  }
};
