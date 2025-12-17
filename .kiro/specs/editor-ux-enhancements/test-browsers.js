/**
 * Simple Browser Test Script
 * Tests if Chromium and Firefox can launch and connect to the app
 */

const { chromium, firefox } = require('playwright');

const APP_URL = 'http://localhost:1420';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testBrowser(browserType, browserName) {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(`Testing ${browserName}`, colors.cyan);
  log('='.repeat(60), colors.cyan);
  
  let browser;
  try {
    log(`Launching ${browserName}...`, colors.blue);
    browser = await browserType.launch({
      headless: false
    });
    
    log(`✓ ${browserName} launched successfully`, colors.green);
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    log(`Navigating to ${APP_URL}...`, colors.blue);
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 10000 });
    
    log(`✓ Successfully loaded app in ${browserName}`, colors.green);
    
    // Take a screenshot
    const screenshotPath = `.kiro/specs/editor-ux-enhancements/screenshots/${browserName.toLowerCase()}-test.png`;
    await page.screenshot({ path: screenshotPath });
    log(`✓ Screenshot saved: ${screenshotPath}`, colors.green);
    
    // Wait a bit so you can see the browser
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await browser.close();
    log(`✓ ${browserName} test completed successfully`, colors.green);
    
    return true;
  } catch (error) {
    log(`✗ ${browserName} test failed: ${error.message}`, colors.red);
    if (browser) {
      await browser.close();
    }
    return false;
  }
}

async function main() {
  log('\n' + '='.repeat(60), colors.cyan);
  log('Browser Compatibility Test', colors.cyan);
  log('='.repeat(60) + '\n', colors.cyan);
  
  // Create screenshots directory
  const fs = require('fs');
  const screenshotDir = '.kiro/specs/editor-ux-enhancements/screenshots';
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  
  const results = {};
  
  // Test Chromium
  results.chromium = await testBrowser(chromium, 'Chromium');
  
  // Test Firefox
  results.firefox = await testBrowser(firefox, 'Firefox');
  
  // Summary
  log('\n' + '='.repeat(60), colors.cyan);
  log('Test Summary', colors.cyan);
  log('='.repeat(60), colors.cyan);
  
  if (results.chromium) {
    log('✓ Chromium: PASSED', colors.green);
  } else {
    log('✗ Chromium: FAILED', colors.red);
  }
  
  if (results.firefox) {
    log('✓ Firefox: PASSED', colors.green);
  } else {
    log('✗ Firefox: FAILED', colors.red);
  }
  
  const passed = Object.values(results).filter(r => r === true).length;
  const total = Object.keys(results).length;
  
  log(`\nTotal: ${passed}/${total} browsers working`, colors.cyan);
  
  if (passed === total) {
    log('\n✓ All browsers working!', colors.green);
  } else {
    log('\n⚠ Some browsers failed', colors.red);
  }
}

main().catch(console.error);
