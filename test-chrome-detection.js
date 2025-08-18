// Test Chrome detection
const fs = require('fs');

const findChromePath = () => {
  const possiblePaths = [
    // macOS paths
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    
    // Windows paths
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    
    // Linux paths
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium'
  ];

  console.log('🔍 Searching for Chrome installation...');
  
  for (const path of possiblePaths) {
    try {
      if (fs.existsSync(path)) {
        console.log(`✅ Found Chrome at: ${path}`);
        return path;
      } else {
        console.log(`❌ Not found: ${path}`);
      }
    } catch (error) {
      console.log(`⚠️ Error checking: ${path}`);
    }
  }

  console.log('⚠️ Could not find Chrome installation, would use bundled Chromium');
  return undefined;
};

const chromePath = findChromePath();
console.log('\n📊 Result:', chromePath || 'Will use bundled Chromium');
