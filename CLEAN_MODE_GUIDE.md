# 🧹 Clean Run Mode Usage Guide

## Overview
Clean Run Mode provides a way to test the TLS Contact scraper using your actual IP address (no proxy), with built-in rate limiting and comprehensive IP health analysis to assess your connection's suitability for automation.

## Key Benefits
- **🔍 Know Your IP Risk**: Understand if your actual IP will trigger CAPTCHAs
- **🏠 Residential IP Advantage**: Often performs better than proxy IPs
- **📊 Risk Assessment**: Get detailed analysis of your connection
- **⚡ Quick Testing**: No proxy setup required for development

## Quick Start

### Running Clean Mode
```bash
npm run clean
```

### Expected Output
```
🧹 Clean Run Mode - No Proxy, With IP Health Check
⚡ Direct website access with your actual IP analysis
🌐 Target URL: https://visas-de.tlscontact.com/visa/gb/gbLON2de/home

⏰ Rate Limit Check:
🕒 Current time: 8/18/2025, 10:21:57 AM
✅ Rate limit check passed - proceeding with run

🚀 Starting clean run...
✅ Rate limit updated - Next run allowed after: 8/18/2025, 10:36:57 AM

🔍 Running IP health check for your actual IP...
📍 Step 1: Checking IP geolocation and ISP...
🛡️ Step 2: Checking proxy/VPN detection...
🌐 Step 3: Testing actual TLS website connectivity...
🚫 Step 4: Checking IP reputation and blacklists...
```

## IP Health Check in Clean Mode

### What It Checks
- **🌍 Your Actual IP**: Analyzes the IP you're connecting from
- **📍 Geolocation**: Verifies location consistency with visa application
- **🏢 ISP Analysis**: Checks if your ISP is residential vs business/hosting
- **🚫 Reputation**: Scans for any blacklisting or suspicious activity
- **🌐 TLS Connectivity**: Tests actual connection to the visa website

### Possible Results
- **✅ SAFE**: Your IP is clean, proceed with confidence
- **⚠️ CAUTION**: Some risks detected, monitor for issues
- **🚨 UNSAFE**: High risk of blocks, consider using standard proxy mode

### Sample Clean Mode IP Analysis
```
📊 IP Health Analysis:
🎯 IP: 123.456.789.0
📍 Location: London, England, GB
🏢 ISP: BT Group PLC
📊 Fraud Score: 15/100
🔍 Proxy: ✅ No
🔍 VPN/Hosting: ✅ No
🏠 Appears to be residential IP - lower CAPTCHA risk
✅ Geolocation consistent with visa application

🎯 Recommendation: ✅ SAFE - Proceed with automation
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
| **IP Health Check** | ✅ Full analysis | ✅ Analyzes your actual IP |
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
