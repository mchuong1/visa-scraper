// Main application entry point with advanced browser lifecycle management
import { BrowserManager } from './browserManager';
import { SessionInfo } from './types';
import { 
  validateEnvironment,
  TWOCAPTCHA_API_KEY,
  ANTICAPTCHA_API_KEY 
} from './config';
import { checkIPHealth, promptUserDecision } from './ipHealthCheck';
import { scrapeTLSContact } from './scraper';

/**
 * Main application execution with browser lifecycle management
 */
(async () => {
  console.log('🎬 Starting Visa Scraper with Advanced Browser Management...');
  
  // Show configuration status
  console.log('\n🔧 Configuration Status:');
  if (TWOCAPTCHA_API_KEY) console.log('   - 2Captcha service: ✅ Configured');
  if (ANTICAPTCHA_API_KEY) console.log('   - Anti-Captcha service: ✅ Configured');
  if (!TWOCAPTCHA_API_KEY && !ANTICAPTCHA_API_KEY) {
    console.log('   - CAPTCHA services: ⚠️ None configured (manual solving only)');
  }

  // Validate environment
  validateEnvironment();

  // Initialize browser manager
  const browserManager = new BrowserManager('./session-data.json');
  
  // Graceful shutdown handling
  process.on('SIGINT', async () => {
    console.log('\n🛑 Graceful shutdown initiated...');
    await browserManager.cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Graceful shutdown initiated...');
    await browserManager.cleanup();
    process.exit(0);
  });

  try {
    // Run IP health check first
    console.log('\n🏥 Running IP health check...');
    const ipHealthResult = await checkIPHealth();
    const proceedWithProxy = await promptUserDecision(ipHealthResult);

    if (!proceedWithProxy) {
      console.log('🛑 Stopping automation due to IP health check results.');
      return;
    }

    // Main scraping loop with browser lifecycle management
    let sessionCount = 0;
    const maxSessions = 50; // Prevent infinite loops

    while (sessionCount < maxSessions) {
      sessionCount++;
      console.log(`\n🔄 Starting scraping session #${sessionCount}`);

      try {
        // Launch or restart browser if needed
        let session = browserManager.getCurrentSession();
        if (!session || browserManager.shouldRestart()) {
          session = await browserManager.restartBrowser();
        }

        // Save session data before starting scraping
        await browserManager.saveSessionData();

        // Start scraping with current session
        await scrapeTLSContact(session.page, session.sessionInfo);

        // Session completed successfully
        console.log('\n🎉 Scraping session completed successfully!');
        
        // Show session summary
        console.log('\n📊 Session Summary:');
        console.log(`⏰ Started: ${session.sessionInfo.startTime}`);
        console.log(`🌐 User Agent: ${session.sessionInfo.userAgent}`);
        console.log(`🔗 Proxy Used: ${session.sessionInfo.proxyUsed ? '✅' : '❌'}`);
        console.log(`🤖 CAPTCHAs Handled: ${session.sessionInfo.captchaSolved}`);
        console.log(`❌ Errors Encountered: ${session.sessionInfo.errors}`);
        console.log(`🔄 Browser Restarts: ${session.restartCount}`);
        console.log(`🧠 Memory Usage: ${Math.round(session.memoryUsage / 1024 / 1024)}MB`);

        // Check if we should continue or stop
        console.log('\n🤔 Continue scraping?');
        console.log('   - Press ENTER to continue with current session');
        console.log('   - Type "restart" to restart browser and continue');
        console.log('   - Type "stop" to exit gracefully');
        
        const readline = require('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        const choice = await new Promise<string>((resolve) => {
          rl.question('⏳ Your choice: ', (answer: string) => {
            rl.close();
            resolve(answer.trim().toLowerCase());
          });
        });

        if (choice === 'stop') {
          console.log('🛑 Stopping automation as requested...');
          break;
        } else if (choice === 'restart') {
          console.log('🔄 Restarting browser as requested...');
          await browserManager.restartBrowser();
        }

      } catch (error) {
        console.error(`❌ Error in session #${sessionCount}:`, error);
        
        // Increment error count
        const currentSession = browserManager.getCurrentSession();
        if (currentSession) {
          currentSession.sessionInfo.errors++;
        }

        // Force restart browser on error
        console.log('🔄 Restarting browser due to error...');
        try {
          await browserManager.restartBrowser();
        } catch (restartError) {
          console.error('❌ Failed to restart browser:', restartError);
          break;
        }

        // Wait before retrying
        console.log('⏳ Waiting 30 seconds before retry...');
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }

    if (sessionCount >= maxSessions) {
      console.log('⚠️ Maximum session limit reached. Stopping automation.');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    // Clean up
    await browserManager.cleanup();
    console.log('✅ Application shutdown complete');
  }
})();
