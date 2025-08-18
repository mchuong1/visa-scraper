#!/bin/bash
# CAPTCHA Integration Setup Script
# Run this after setting up your API keys

echo "🤖 CAPTCHA Automation Integration - Setup Verification"
echo "================================================="

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building project..."
npm run build

echo "🧪 Testing CAPTCHA service integration..."
node test-captcha-integration.js

echo ""
echo "✅ Integration Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Sign up for 2Captcha (https://2captcha.com/) or Anti-Captcha (https://anti-captcha.com/)"
echo "2. Add your API key to the .env file:"
echo "   TWOCAPTCHA_API_KEY=your_api_key_here"
echo "   ANTICAPTCHA_API_KEY=your_api_key_here"
echo "3. Run the scraper: npm start"
echo ""
echo "📖 For detailed setup instructions, see: CAPTCHA_INTEGRATION_GUIDE.md"
