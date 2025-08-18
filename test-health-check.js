#!/usr/bin/env node

// Quick test script for the improved IP health check with proxy support
const { checkIPHealth } = require('./build/ipHealthCheck');

async function testHealthCheck() {
  console.log('🧪 Testing improved IP health check with proxy support...\n');
  
  try {
    const result = await checkIPHealth();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL HEALTH CHECK SUMMARY');
    console.log('='.repeat(60));
    console.log(`IP Address: ${result.ip}`);
    console.log(`Location: ${result.location.city}, ${result.location.country}`);
    console.log(`ISP: ${result.location.isp}`);
    console.log(`Recommendation: ${result.recommendation}`);
    console.log(`CAPTCHA Risk Score: ${result.risks.fraudScore}/100`);
    console.log(`Proxy Detected: ${result.risks.isProxy}`);
    console.log(`VPN/Hosting Detected: ${result.risks.isVPN}`);
    
    console.log('\n🔍 Key Findings:');
    result.details.slice(-8).forEach(detail => console.log(`  ${detail}`));
    
    // Provide interpretation specifically for CAPTCHA risk
    console.log('\n📋 CAPTCHA RISK INTERPRETATION:');
    if (result.risks.fraudScore >= 60) {
      console.log('🚨 VERY HIGH RISK: This IP is very likely to trigger CAPTCHAs');
      console.log('   💡 Recommendation: Use a different proxy with residential IPs');
      console.log('   💡 Consider: Mobile proxies or clean residential IPs from UK/Germany');
    } else if (result.risks.fraudScore >= 35) {
      console.log('⚠️  MODERATE RISK: This IP has decent chance of triggering CAPTCHAs');
      console.log('   💡 Recommendation: Proceed with caution, monitor closely');
      console.log('   💡 Consider: Have manual intervention ready');
    } else {
      console.log('✅ LOW RISK: This IP should be relatively safe from CAPTCHAs');
      console.log('   💡 Should be safe to proceed with automation');
    }
    
    // Check if we're actually getting proxy IP
    console.log('\n🔍 PROXY VERIFICATION:');
    if (process.env.PROXY_HOST) {
      console.log(`   Configured proxy: ${process.env.PROXY_HOST}`);
      console.log(`   IP being checked: ${result.ip}`);
      console.log('   ✅ If the IP above is different from your real IP, proxy is working!');
    } else {
      console.log('   ⚠️  No proxy configured in environment variables');
      console.log('   📝 Set PROXY_HOST, PROXY_USERNAME, PROXY_PASSWORD in .env file');
    }
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    if (error.message.includes('proxy') || error.message.includes('ENOTFOUND')) {
      console.log('\n💡 This might be a proxy connection issue.');
      console.log('   Check your proxy settings in the .env file:');
      console.log('   - PROXY_HOST');
      console.log('   - PROXY_USERNAME'); 
      console.log('   - PROXY_PASSWORD');
    }
  }
}

testHealthCheck();
