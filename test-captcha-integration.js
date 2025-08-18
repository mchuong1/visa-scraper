// Test script for CAPTCHA service integration
// Run with: node test-captcha-integration.js

// Load environment variables
require('dotenv').config();

const { CaptchaService } = require('./build/captchaService');

async function testCaptchaService() {
  console.log('🧪 Testing CAPTCHA Service Integration');
  console.log('=====================================');

  // Use real API keys from environment variables
  const config = {
    twoCaptchaApiKey: process.env.TWOCAPTCHA_API_KEY,
    antiCaptchaApiKey: process.env.ANTICAPTCHA_API_KEY,
    preferredService: process.env.PREFERRED_CAPTCHA_SERVICE || 'auto',
    maxSolveTime: 120000,
    retryAttempts: 2
  };

  console.log('🔑 API Key Status:');
  console.log(`   2Captcha: ${config.twoCaptchaApiKey ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   Anti-Captcha: ${config.antiCaptchaApiKey ? '✅ Configured' : '❌ Missing'}`);
  
  if (!config.twoCaptchaApiKey && !config.antiCaptchaApiKey) {
    console.log('❌ No CAPTCHA service API keys found in .env file');
    console.log('💡 Please add TWOCAPTCHA_API_KEY or ANTICAPTCHA_API_KEY to your .env file');
    return;
  }

  try {
    console.log('🔧 Initializing CAPTCHA service...');
    const captchaService = new CaptchaService(config);
    
    console.log('✅ CAPTCHA service initialized successfully');
    console.log(`🎯 Preferred service: ${config.preferredService}`);
    console.log(`⏱️ Max solve time: ${config.maxSolveTime}ms`);
    console.log(`🔄 Retry attempts: ${config.retryAttempts}`);

    // Test balance check (will show errors with mock keys)
    console.log('\n💰 Checking service balances...');
    await captchaService.checkBalance();

    console.log('\n✅ Test completed successfully!');
    console.log('\n📝 To use with real API keys:');
    console.log('1. Sign up at https://2captcha.com/ or https://anti-captcha.com/');
    console.log('2. Add funds to your account ($10+ recommended)');
    console.log('3. Add your API key to the .env file');
    console.log('4. Run the scraper with automated CAPTCHA solving enabled');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testCaptchaService();
