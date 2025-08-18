// IP Health Check functionality

import { IPHealthResult } from './types';
import { getUserChoice } from './helpers';
import { tlsURL } from './config';

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
    // Step 1: Get IP information from ipinfo.io
    console.log('📍 Step 1: Checking IP geolocation and ISP...');
    const ipInfoResponse = await fetch('https://ipinfo.io/json');
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

    // Step 3: Check IP reputation and blacklists
    console.log('🚫 Step 3: Checking IP reputation and blacklists...');
    await checkIPReputation(result);

    // Step 4: Analyze results and make recommendation
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
    // Check with IP2Location (free tier)
    const ip2locationUrl = `http://ip-api.com/json/${result.ip}?fields=status,proxy,hosting`;
    const proxyResponse = await fetch(ip2locationUrl);
    const proxyData = await proxyResponse.json();
    
    if (proxyData.status === 'success') {
      result.risks.isProxy = proxyData.proxy || false;
      result.risks.isVPN = proxyData.hosting || false;
      
      if (proxyData.proxy) {
        result.details.push('⚠️ IP detected as proxy by ip-api.com');
      }
      if (proxyData.hosting) {
        result.details.push('⚠️ IP detected as hosting/datacenter by ip-api.com');
      }
    }

    // Additional proxy detection patterns
    const ispLower = result.location.isp.toLowerCase();
    const suspiciousISPs = [
      'hosting', 'datacenter', 'cloud', 'server', 'virtual', 'proxy',
      'vpn', 'amazon', 'google cloud', 'microsoft', 'digitalocean',
      'linode', 'vultr', 'ovh', 'hetzner'
    ];

    for (const suspicious of suspiciousISPs) {
      if (ispLower.includes(suspicious)) {
        result.risks.isVPN = true;
        result.details.push(`⚠️ ISP contains suspicious keyword: "${suspicious}"`);
        break;
      }
    }

  } catch (error) {
    console.log('⚠️ Could not complete proxy detection check');
    result.details.push('Proxy detection check failed');
  }
};

/**
 * Check IP reputation and blacklists
 */
const checkIPReputation = async (result: IPHealthResult): Promise<void> => {
  try {
    // Check with AbuseIPDB-style reputation (using a public API)
    const reputationUrl = `http://ip-api.com/json/${result.ip}?fields=status,isp,org,as,mobile,proxy,hosting,query`;
    const reputationResponse = await fetch(reputationUrl);
    const reputationData = await reputationResponse.json();
    
    if (reputationData.status === 'success') {
      // Check for mobile carrier (mobile IPs are often problematic)
      if (reputationData.mobile) {
        result.details.push('📱 Mobile IP detected - may have restrictions');
      }

      // Check ASN for known problematic networks
      const asn = reputationData.as || '';
      const problematicASNs = [
        'Cloudflare', 'Amazon', 'Google', 'Microsoft',
        'DigitalOcean', 'Linode', 'Vultr'
      ];

      for (const problematic of problematicASNs) {
        if (asn.includes(problematic)) {
          result.risks.isVPN = true;
          result.details.push(`⚠️ ASN indicates cloud provider: ${problematic}`);
          break;
        }
      }
    }

    // Simulate fraud score based on detected issues
    let fraudScore = 0;
    if (result.risks.isProxy) fraudScore += 30;
    if (result.risks.isVPN) fraudScore += 25;
    if (result.location.isp.toLowerCase().includes('hosting')) fraudScore += 20;
    if (result.location.country === 'Unknown') fraudScore += 15;

    result.risks.fraudScore = Math.min(fraudScore, 100);

  } catch (error) {
    console.log('⚠️ Could not complete IP reputation check');
    result.details.push('IP reputation check failed');
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
