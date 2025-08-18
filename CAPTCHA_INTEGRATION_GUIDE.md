# 🤖 CAPTCHA Automation Integration Guide

## Overview

Your visa scraper now includes **comprehensive automated CAPTCHA solving** using industry-leading services **2Captcha** and **Anti-Captcha**. This integration can automatically bypass Cloudflare challenges and other CAPTCHAs with **95-99% success rates**.

## ✨ What's New

### 🚀 Automated CAPTCHA Solving
- **2Captcha Integration**: Fast, reliable solving with 95-98% success rate
- **Anti-Captcha Integration**: Premium service with 96-99% success rate  
- **Auto-Detection**: Automatically detects reCAPTCHA v2/v3, hCaptcha, Turnstile, and Cloudflare challenges
- **Smart Fallback**: Falls back to manual solving if automated methods fail
- **Balance Monitoring**: Automatic balance checking for cost management

### 🔧 Enhanced CAPTCHA Handling
The scraper now provides **8 different options** when a CAPTCHA is detected:

1. **🤖 Automated solving** (NEW!) - Uses 2Captcha/Anti-Captcha services
2. **👤 Manual solving** - Traditional user intervention
3. **⏭️ Skip detection** - Bypass detection and continue
4. **🔄 Page refresh** - Reload page strategies
5. **⏱️ Wait mode** - 2-minute wait for rate limiting
6. **🍪 Clear cookies** - Reset browser fingerprint
7. **🥷 Stealth reload** - Advanced evasion techniques
8. **🎭 Human simulation** - Realistic browsing behavior

## 💰 Cost & Performance

### Service Comparison
| Metric | 2Captcha | Anti-Captcha |
|--------|----------|--------------|
| **Price** | $1-3 per 1000 solves | $1-2 per 1000 solves |
| **Speed** | 15-30 seconds | 10-25 seconds |
| **Success Rate** | 95-98% | 96-99% |
| **Cloudflare Support** | ✅ Yes | ✅ Yes |
| **API Quality** | Good | Excellent |

### Cost Estimation
- **Light usage** (10 CAPTCHAs/day): ~$0.10-0.30/month
- **Moderate usage** (50 CAPTCHAs/day): ~$1.50-4.50/month  
- **Heavy usage** (200 CAPTCHAs/day): ~$6-24/month

## 🛠️ Setup Instructions

### Step 1: Choose a Service

#### Option A: 2Captcha (Recommended for beginners)
1. Sign up at [2captcha.com](https://2captcha.com/)
2. Add $10+ to your account (minimum recommended)
3. Get API key from dashboard
4. Add to `.env`: `TWOCAPTCHA_API_KEY=your_api_key_here`

#### Option B: Anti-Captcha (Recommended for high volume)
1. Sign up at [anti-captcha.com](https://anti-captcha.com/)
2. Add $10+ to your account (minimum recommended)
3. Get API key from dashboard  
4. Add to `.env`: `ANTICAPTCHA_API_KEY=your_api_key_here`

#### Option C: Both Services (Maximum reliability)
- Configure both API keys for automatic failover
- Set `PREFERRED_CAPTCHA_SERVICE=auto` in `.env`

### Step 2: Update Your .env File

```env
# Existing configuration
PROXY_HOST=your_proxy_host:port
PROXY_USERNAME=your_proxy_username  
PROXY_PASSWORD=your_proxy_password
TLS_USERNAME=your_username
TLS_PASSWORD=your_password

# NEW: CAPTCHA service configuration
TWOCAPTCHA_API_KEY=your_2captcha_api_key
ANTICAPTCHA_API_KEY=your_anticaptcha_api_key
PREFERRED_CAPTCHA_SERVICE=auto
```

### Step 3: Test the Integration

Run the test script to verify everything works:

```bash
npm run build
node test-captcha-integration.js
```

## 🎯 Usage Examples

### Successful Automated Solving
```
🤖 CAPTCHA detected (Type: cloudflare-challenge) - Attempt 1/5
🚀 Attempting automated CAPTCHA solving...
💰 2Captcha balance: $15.42
🔧 Solving with 2Captcha...
✅ 2Captcha solved successfully
📝 Submitting CAPTCHA solution...
✅ CAPTCHA solution submitted
✅ CAPTCHA cleared! Continuing...
```

### Fallback to Manual Mode
```
🤖 CAPTCHA detected (Type: recaptcha-v2) - Attempt 2/5
🚀 Attempting automated CAPTCHA solving...
❌ Automated solving failed: Service timeout
🔄 Falling back to manual solving...

🔧 CAPTCHA Options:
   1. Solve manually and press ENTER to continue
   2. Type "skip" and press ENTER to skip CAPTCHA detection
   ...
   8. Type "auto" and press ENTER to retry automated solving
```

## 🔍 Supported CAPTCHA Types

| CAPTCHA Type | 2Captcha | Anti-Captcha | Success Rate |
|--------------|----------|--------------|--------------|
| **Cloudflare Challenges** | ✅ | ✅ | 90-95% |
| **reCAPTCHA v2** | ✅ | ✅ | 95-98% |
| **reCAPTCHA v3** | ✅ | ✅ | 92-96% |
| **hCaptcha** | ✅ | ✅ | 94-97% |
| **Turnstile** | ✅ | ✅ | 88-93% |
| **FunCaptcha** | ✅ | ✅ | 85-92% |

## 🛡️ Best Practices

### 1. Balance Management
- Monitor your balance regularly
- Set up balance alerts on service dashboards  
- Keep at least $5-10 buffer for uninterrupted operation

### 2. Rate Limiting
- The scraper includes built-in delays to respect website policies
- Automated solving adds 2-5 seconds delay per attempt
- Use `wait` mode if you encounter too many CAPTCHAs

### 3. Fallback Strategy
- Always have manual solving as backup
- Use multiple services for redundancy
- Monitor success rates and switch services if needed

### 4. Cost Optimization
- Start with 2Captcha for lower volume usage
- Switch to Anti-Captcha for high-volume scenarios
- Use `auto` mode to automatically choose the best service

## 🚨 Troubleshooting

### Common Issues

#### "No CAPTCHA service available"
- **Cause**: No API keys configured
- **Solution**: Add `TWOCAPTCHA_API_KEY` or `ANTICAPTCHA_API_KEY` to `.env`

#### "Insufficient funds"  
- **Cause**: Account balance too low
- **Solution**: Add funds to your 2Captcha/Anti-Captcha account

#### "Service timeout"
- **Cause**: High server load or complex CAPTCHA
- **Solution**: Retry with `auto` command or solve manually

#### "API key invalid"
- **Cause**: Wrong API key format or expired key
- **Solution**: Check API key in service dashboard and update `.env`

## 📊 Monitoring & Analytics

The scraper automatically tracks:
- Number of CAPTCHAs solved
- Service used (2Captcha vs Anti-Captcha)  
- Success/failure rates
- Time spent on solving
- Cost estimation

## 🔄 Migration from Manual-Only

If you were previously using manual CAPTCHA solving:

1. **No code changes needed** - Integration is automatic
2. **Existing workflows preserved** - Manual options still available
3. **Gradual adoption** - Test with one service first
4. **Easy rollback** - Remove API keys to disable automation

## 🚀 Next Steps

1. **Set up your first service** (2Captcha recommended)
2. **Add $10-20 to your account** for testing
3. **Run a test session** to verify integration  
4. **Monitor balance and success rates** during initial runs
5. **Consider adding second service** for redundancy

## 📞 Support

- **2Captcha Support**: [2captcha.com/support](https://2captcha.com/support)
- **Anti-Captcha Support**: [anti-captcha.com/support](https://anti-captcha.com/support)  
- **Integration Issues**: Check the console logs for detailed error messages

---

**🎉 Congratulations!** Your visa scraper now has enterprise-level CAPTCHA automation capabilities. This dramatically reduces manual intervention and increases success rates for appointment finding.
