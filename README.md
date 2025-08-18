# 🎯 Advanced Visa Scraper

A sophisticated, enterprise-level visa appointment scraper with comprehensive CAPTCHA bypass capabilities and advanced anti-detection measures.

## ⚡ Key Features

### 🛡️ **Advanced Anti-Detection**
- **Browser Stealth**: Puppeteer-extra with stealth plugin
- **Fingerprint Randomization**: Random user agents, viewports, and browser properties
- **JavaScript Spoofing**: Removes webdriver properties and mocks browser behavior
- **Human-like Behavior**: Mouse movements, scrolling, and realistic timing

### 🤖 **Comprehensive CAPTCHA Handling**
- **Multi-Type Detection**: reCAPTCHA v2/v3, hCAPTCHA, Turnstile, Cloudflare challenges
- **Automated Solving**: Integration with 2Captcha and Anti-Captcha services
- **8-Option Bypass System**:
  1. **Automated solving** using CAPTCHA services (NEW!)
  2. Manual solving with user input
  3. Skip detection and continue
  4. Page refresh strategies
  5. 2-minute wait for rate limiting
  6. Cookie/cache clearing
  7. Stealth reload with fingerprint reset
  8. Human behavior simulation

📖 **[Read the Complete CAPTCHA Integration Guide →](CAPTCHA_INTEGRATION_GUIDE.md)**

### 🔄 **Robust Error Recovery**
- **Retry Mechanisms**: Auto-retry with exponential backoff
- **Manual Fallback**: User intervention when automation fails
- **Timeout Handling**: Smart navigation timeout management
- **Session Persistence**: Track and resume interrupted sessions

### 🔍 **IP Health Check System**
- **Geolocation Verification**: Ensures IP matches visa application country
- **Proxy/VPN Detection**: Multi-source detection using ip-api.com
- **Reputation Analysis**: Checks for hosting/datacenter patterns
- **Risk Assessment**: Fraud score calculation and recommendations
- **User Decision Points**: Interactive choices based on IP health

### 🔐 **Security & Compliance**
- **Environment Variables**: All credentials stored securely
- **Legal Disclaimer**: Comprehensive compliance documentation
- **Proxy Support**: Smart Proxy and BrightData integration
- **Rate Limiting**: Built-in delays to respect website policies

## 🚀 Quick Start

### Prerequisites
- Node.js 18.x or 20.x
- Smart Proxy account

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/matthewchuong/visa-scraper.git
cd visa-scraper
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your credentials
```

4. **Build and run**
```bash
# Standard run with proxy and full features
npm run build
npm start

# Clean run without proxy (rate limited)
npm run clean
```

## 🧹 Clean Run Mode

For testing purposes, you can run the scraper without proxy in "clean mode":

```bash
npm run clean
```

### Clean Mode Features:
- **🚫 No Proxy**: Direct connection to website
- **🌐 Real Browser**: Uses your actual Chrome installation instead of bundled Chromium
- **🔍 IP Health Check**: Analyzes your actual IP for risks
- **⏱️ Rate Limited**: Automatic 15-minute cooldown between runs
- **🔒 Anti-Spam Protection**: Prevents rapid consecutive requests
- **⚡ Simplified Flow**: No proxy setup required

### Rate Limiting:
- Only one run allowed every 15 minutes
- Automatic tracking in `.last-run-timestamp` file
- Clear error messages when rate limit is active
- Helps avoid being flagged as a bot

**⚠️ Note**: Clean mode is for testing only. Use standard mode with proxy for production automation.

📖 **[Read the Complete Clean Mode Guide →](CLEAN_MODE_GUIDE.md)**

## ⚙️ Configuration

### Environment Variables

Create a `.env` file with:

```env
# Smart Proxy Configuration
PROXY_HOST=your_proxy_host:port
PROXY_USERNAME=your_proxy_username
PROXY_PASSWORD=your_proxy_password

# TLS Contact Credentials
TLS_USERNAME=your_username
TLS_PASSWORD=your_password

# CAPTCHA Service API Keys (Optional - for automated solving)
TWOCAPTCHA_API_KEY=your_2captcha_api_key
ANTICAPTCHA_API_KEY=your_anticaptcha_api_key
PREFERRED_CAPTCHA_SERVICE=auto
```

### CAPTCHA Service Setup (Optional)

For automated CAPTCHA solving, you can configure one or both services:

#### 2Captcha Setup
1. Sign up at [2captcha.com](https://2captcha.com/)
2. Add funds to your account ($10 minimum recommended)
3. Get your API key from the dashboard
4. Add `TWOCAPTCHA_API_KEY=your_api_key` to your `.env` file

#### Anti-Captcha Setup
1. Sign up at [anti-captcha.com](https://anti-captcha.com/)
2. Add funds to your account ($10 minimum recommended)  
3. Get your API key from the dashboard
4. Add `ANTICAPTCHA_API_KEY=your_api_key` to your `.env` file

#### Service Comparison
| Feature | 2Captcha | Anti-Captcha |
|---------|----------|--------------|
| **Price** | $1-3 per 1000 solves | $1-2 per 1000 solves |
| **Speed** | 15-30 seconds | 10-25 seconds |
| **Success Rate** | 95-98% | 96-99% |
| **Supported Types** | All major CAPTCHAs | All major CAPTCHAs |

**Recommendation**: Use `PREFERRED_CAPTCHA_SERVICE=auto` to automatically choose the best available service.

### Supported Websites
- ✅ TLS Contact (Germany visa applications)
- 🔄 VFS Global (in development)

## 🎮 Usage Guide

### IP Health Check

Before automation begins, the scraper performs a comprehensive IP health check:

```
🔍 Starting comprehensive IP health check...
📍 Step 1: Checking IP geolocation and ISP...
🛡️ Step 2: Checking proxy/VPN detection...
🚫 Step 3: Checking IP reputation and blacklists...

📊 IP Health Analysis:
🎯 IP: 123.456.789.0
📍 Location: London, England, GB
🏢 ISP: BT Group PLC
📊 Fraud Score: 15/100
🔍 Proxy: ✅ No
🔍 VPN/Hosting: ✅ No

🎯 Recommendation: ✅ SAFE - Proceed with automation
```

Based on the analysis, you'll get one of three recommendations:
- **✅ SAFE**: Low risk, automation proceeds automatically
- **⚠️ CAUTION**: Medium risk, manual decision required
- **🚨 UNSAFE**: High risk, different proxy recommended

### Interactive CAPTCHA Handling

When a CAPTCHA is detected, the scraper will:

1. **🤖 Try automated solving first** (if API keys are configured)
2. **🔄 Fall back to manual options** if automated solving fails

#### Automated Mode
If you have configured CAPTCHA service API keys, you'll see:
```
🤖 CAPTCHA detected (Type: cloudflare-challenge) - Attempt 1/5
🚀 Attempting automated CAPTCHA solving...
💰 Checking CAPTCHA service balance...
💰 2Captcha balance: $5.23
🔧 Solving with 2Captcha...
✅ 2Captcha solved successfully
✅ CAPTCHA cleared! Continuing...
```

#### Manual Fallback Mode
If automated solving fails or no API keys are provided:
```
🔧 CAPTCHA Options:
   1. Solve manually and press ENTER to continue
   2. Type "skip" and press ENTER to skip CAPTCHA detection
   3. Type "refresh" and press ENTER to refresh the page
   4. Type "wait" and press ENTER to wait 2 minutes
   5. Type "cookies" and press ENTER to clear cookies
   6. Type "stealth" and press ENTER to try stealth reload
   7. Type "human" and press ENTER for human-like browsing
   8. Type "auto" and press ENTER to retry automated solving
```

### Manual Intervention Points

The scraper pauses at key moments for manual interaction:
- **IP Health Check**: Decision point for risky IPs
- After page load for manual navigation if needed
- During CAPTCHA challenges
- Before critical form submissions

### IP Health Decision Options

When the IP health check detects risks, you'll see these options:

```
🤔 What would you like to do?
   1. Type "proceed" to continue anyway
   2. Type "stop" to exit and change proxy
   3. Type "manual" to continue but skip proxy for manual testing
```

- **proceed**: Continue with current IP despite risks
- **stop**: Exit to configure a different proxy
- **manual**: Continue without proxy for testing

## 🛠️ Advanced Features

### IP Health Assessment

The scraper evaluates multiple factors for IP health:

**🌍 Geolocation Consistency**
- Checks if IP location matches visa application country
- UK→Germany applications should use UK/DE IPs
- Flags suspicious geographic mismatches

**🛡️ Proxy/VPN Detection**
- Multi-source detection via ip-api.com
- ISP pattern analysis for hosting/datacenter keywords
- ASN checks for cloud providers (AWS, Google Cloud, etc.)

**📊 Risk Scoring**
- Fraud score calculation (0-100)
- Blacklist checking patterns
- Mobile IP detection (often problematic)
- Reputation analysis based on ISP type

**🎯 Smart Recommendations**
- **SAFE (0-29)**: Clean residential IP, proceed automatically
- **CAUTION (30-69)**: Some risks detected, user choice required
- **UNSAFE (70+)**: High risk of blocks/CAPTCHAs, proxy change recommended

### Stealth Reload
Comprehensive session reset including:
- Navigate to neutral page
- Clear all browser data
- Reset browser fingerprint
- Random delay simulation
- Return to target with new identity

### Human Behavior Simulation
- Random mouse movements
- Natural scrolling patterns
- Realistic typing delays
- Viewport changes
- Human-like pauses

### Debug Mode
- Page content inspection
- iframe detection
- Form element analysis
- Button text extraction
- URL and title monitoring

## 📊 Session Tracking

Monitor your scraping sessions with detailed metrics:
- Start time and duration
- User agent used
- Proxy connection status
- CAPTCHAs encountered and solved
- Error count and types

## ⚖️ Legal Compliance

**⚠️ IMPORTANT**: This tool is for educational purposes only.

- Read the [Legal Disclaimer](LEGAL_DISCLAIMER.md)
- Always respect website Terms of Service
- Implement appropriate rate limiting
- Never collect personal information without permission

## 🔧 Development

### Project Structure
```
visa-scraper/
├── src/
│   └── index.ts          # Main scraper logic
├── build/                # Compiled JavaScript
├── .env.example          # Environment template
├── LEGAL_DISCLAIMER.md   # Legal compliance info
└── README.md            # This file
```

### Building
```bash
npm run build
```

### Dependencies
- **puppeteer-extra**: Enhanced Puppeteer with plugins
- **puppeteer-extra-plugin-stealth**: Anti-detection measures
- **dotenv**: Environment variable management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This software is provided for educational purposes only. Users are responsible for compliance with all applicable laws and website terms of service. Misuse may result in legal consequences, account termination, or IP blocking.

---

**Built with ❤️ for ethical automation and learning purposes.**
