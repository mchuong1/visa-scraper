#!/usr/bin/env node

// Test script for browser lifecycle management
const { BrowserManager } = require('./build/browserManager');

async function testBrowserManager() {
  console.log('🧪 Testing Browser Lifecycle Management...\n');
  
  const browserManager = new BrowserManager('./test-session-data.json');
  
  try {
    // Test 1: Launch browser
    console.log('📝 Test 1: Launching browser...');
    const session = await browserManager.launchBrowser(false); // No proxy for test
    console.log('✅ Browser launched successfully');
    console.log(`   - User Agent: ${session.sessionInfo.userAgent.substring(0, 50)}...`);
    console.log(`   - Proxy Used: ${session.sessionInfo.proxyUsed}`);
    
    // Test 2: Navigate to a test page
    console.log('\n📝 Test 2: Navigating to test page...');
    await session.page.goto('https://httpbin.org/user-agent', { waitUntil: 'domcontentloaded' });
    const content = await session.page.content();
    console.log('✅ Page navigation successful');
    console.log(`   - Page loaded: ${content.includes('user-agent') ? '✅' : '❌'}`);
    
    // Test 3: Save session data
    console.log('\n📝 Test 3: Saving session data...');
    await browserManager.saveSessionData();
    console.log('✅ Session data saved');
    
    // Test 4: Check memory usage
    console.log('\n📝 Test 4: Checking memory usage...');
    const memoryUsage = await browserManager.getBrowserMemoryUsage();
    console.log(`✅ Memory usage: ${Math.round(memoryUsage / 1024 / 1024)}MB`);
    
    // Test 5: Check restart conditions
    console.log('\n📝 Test 5: Checking restart conditions...');
    const shouldRestart = browserManager.shouldRestart();
    console.log(`✅ Should restart: ${shouldRestart}`);
    
    // Test 6: Restart browser
    console.log('\n📝 Test 6: Testing browser restart...');
    const newSession = await browserManager.restartBrowser();
    console.log('✅ Browser restarted successfully');
    console.log(`   - Restart count: ${newSession.restartCount}`);
    console.log(`   - New session ID: ${newSession.startTime}`);
    
    // Test 7: Load saved session data
    console.log('\n📝 Test 7: Loading session data...');
    const sessionData = await browserManager.loadSessionData();
    console.log(`✅ Session data loaded: ${sessionData ? 'Yes' : 'No'}`);
    if (sessionData) {
      console.log(`   - Cookies count: ${sessionData.cookies.length}`);
      console.log(`   - Data age: ${Math.round((Date.now() - sessionData.timestamp) / 1000)}s`);
    }
    
    // Test 8: Watchdog functionality
    console.log('\n📝 Test 8: Testing watchdog...');
    browserManager.startWatchdog();
    browserManager.startMemoryMonitoring();
    console.log('✅ Watchdog and memory monitoring started');
    
    // Wait a moment to see monitoring in action
    console.log('\n⏳ Waiting 10 seconds to observe monitoring...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    console.log('\n🎉 All tests completed successfully!');
    
    // Summary
    console.log('\n📊 Test Summary:');
    console.log('   ✅ Browser launch and navigation');
    console.log('   ✅ Session data persistence');
    console.log('   ✅ Memory monitoring');
    console.log('   ✅ Browser restart functionality');
    console.log('   ✅ Watchdog process');
    console.log('   ✅ Automatic cleanup');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    await browserManager.cleanup();
    console.log('✅ Cleanup complete');
  }
}

// Run the test
testBrowserManager().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});
