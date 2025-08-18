# 🧹 Clean Run Mode Usage Guide

## Overview
Clean Run Mode provides a simplified way to test the TLS Contact scraper without using proxies, with built-in rate limiting to prevent being flagged as a bot.

## Quick Start

### Running Clean Mode
```bash
npm run clean
```

### Expected Output
```
🧹 Clean Run Mode - No Proxy, No IP Health Check
⚡ Simplified automation for direct website access
🌐 Target URL: https://visas-de.tlscontact.com/visa/gb/gbLON2de/home

⏰ Rate Limit Check:
🕒 Current time: 8/18/2025, 10:21:57 AM
✅ Rate limit check passed - proceeding with run

🚀 Starting clean run...
✅ Rate limit updated - Next run allowed after: 8/18/2025, 10:36:57 AM
```

## Rate Limiting

### How It Works
- **15-minute cooldown**: Only one run allowed every 15 minutes
- **Automatic tracking**: Uses `.last-run-timestamp` file to track runs
- **Clear feedback**: Shows exactly when next run is allowed

### Rate Limit Messages
When rate limit is active:
```
❌ Rate limit active - 15 minutes remaining
⏰ Next allowed run: 8/18/2025, 10:36:57 AM
🔒 Rate limit: One run every 15 minutes

🛑 Exiting due to rate limit. Please wait before running again.
💡 This helps prevent being flagged as a bot by the website.
```

## Key Differences from Standard Mode

| Feature | Standard Mode | Clean Mode |
|---------|---------------|------------|
| **Proxy** | ✅ Required | ❌ Not used |
| **IP Health Check** | ✅ Full analysis | ❌ Skipped |
| **Rate Limiting** | ❌ None | ✅ 15-minute cooldown |
| **Environment Requirements** | Proxy + TLS credentials | TLS credentials only |
| **Use Case** | Production automation | Testing & development |

## Environment Setup

### Required Variables
```env
# TLS Contact Credentials (Required)
TLS_USERNAME=your_username
TLS_PASSWORD=your_password

# Proxy Variables (Not used in clean mode)
# PROXY_HOST=not_required_for_clean_mode
# PROXY_USERNAME=not_required_for_clean_mode  
# PROXY_PASSWORD=not_required_for_clean_mode
```

## Best Practices

### 1. Testing Workflow
```bash
# Test your changes with clean mode first
npm run clean

# Wait 15 minutes between tests
# Then run production mode when ready
npm start
```

### 2. Development Cycle
- Use clean mode for quick functionality tests
- Respect the 15-minute cooldown
- Switch to standard mode for full feature testing

### 3. Troubleshooting
- Check `.env` file has TLS credentials
- Ensure 15 minutes have passed since last run
- Use `npm run build` to recompile after changes

## Files Created
- `.last-run-timestamp`: Tracks last run time (auto-created)
- This file is automatically ignored by git

## When to Use Clean Mode
- ✅ Testing new features
- ✅ Debugging scraper logic
- ✅ Quick functionality verification
- ❌ Production automation (use standard mode)
- ❌ High-frequency testing (respect rate limits)

---

**⚠️ Remember**: Clean mode is for testing only. Use standard mode with proxy for production automation to avoid IP blocking.
