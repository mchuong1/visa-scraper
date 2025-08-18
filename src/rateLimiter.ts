// Rate limiting functionality for clean runs
import fs from 'fs';
import path from 'path';

const RATE_LIMIT_FILE = path.join(process.cwd(), '.last-run-timestamp');
const RATE_LIMIT_MINUTES = 15;

export interface RateLimitResult {
  canRun: boolean;
  lastRunTime?: Date;
  nextAllowedTime?: Date;
  minutesRemaining?: number;
}

/**
 * Check if enough time has passed since the last run
 */
export const checkRateLimit = (): RateLimitResult => {
  try {
    // Check if rate limit file exists
    if (!fs.existsSync(RATE_LIMIT_FILE)) {
      return { canRun: true };
    }

    // Read the last run timestamp
    const lastRunTimestamp = fs.readFileSync(RATE_LIMIT_FILE, 'utf8').trim();
    const lastRunTime = new Date(lastRunTimestamp);
    
    // Validate the timestamp
    if (isNaN(lastRunTime.getTime())) {
      console.log('⚠️ Invalid timestamp in rate limit file, allowing run...');
      return { canRun: true };
    }

    // Calculate time difference
    const now = new Date();
    const timeDifferenceMs = now.getTime() - lastRunTime.getTime();
    const timeDifferenceMinutes = timeDifferenceMs / (1000 * 60);

    if (timeDifferenceMinutes >= RATE_LIMIT_MINUTES) {
      return { canRun: true, lastRunTime };
    } else {
      const minutesRemaining = RATE_LIMIT_MINUTES - timeDifferenceMinutes;
      const nextAllowedTime = new Date(lastRunTime.getTime() + (RATE_LIMIT_MINUTES * 60 * 1000));
      
      return {
        canRun: false,
        lastRunTime,
        nextAllowedTime,
        minutesRemaining: Math.ceil(minutesRemaining)
      };
    }
  } catch (error) {
    console.log('⚠️ Error reading rate limit file, allowing run...', error);
    return { canRun: true };
  }
};

/**
 * Update the rate limit file with current timestamp
 */
export const updateRateLimit = (): void => {
  try {
    const now = new Date().toISOString();
    fs.writeFileSync(RATE_LIMIT_FILE, now, 'utf8');
    console.log(`✅ Rate limit updated - Next run allowed after: ${new Date(Date.now() + (RATE_LIMIT_MINUTES * 60 * 1000)).toLocaleString()}`);
  } catch (error) {
    console.error('❌ Error updating rate limit file:', error);
  }
};

/**
 * Display rate limit information
 */
export const displayRateLimitInfo = (result: RateLimitResult): void => {
  console.log('\n⏰ Rate Limit Check:');
  console.log(`🕒 Current time: ${new Date().toLocaleString()}`);
  
  if (result.lastRunTime) {
    console.log(`📅 Last run: ${result.lastRunTime.toLocaleString()}`);
  }
  
  if (result.canRun) {
    console.log('✅ Rate limit check passed - proceeding with run');
  } else {
    console.log(`❌ Rate limit active - ${result.minutesRemaining} minutes remaining`);
    console.log(`⏰ Next allowed run: ${result.nextAllowedTime?.toLocaleString()}`);
    console.log(`🔒 Rate limit: One run every ${RATE_LIMIT_MINUTES} minutes`);
  }
};
