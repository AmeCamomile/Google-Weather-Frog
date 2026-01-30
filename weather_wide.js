const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');
const city = "lviv";

async function getFrogAssets(locationUrl, locationName) {
    // Launch with 'headless: false' if you want to watch it work!
    // Set to true once it's working to run in the background.
    const browser = await puppeteer.launch({ 
        headless: false, // Set to FALSE so you can manually solve the captcha
        args: [
            // '--no-sandbox', 
            // '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled' // Helps hide "I am a bot" flags
        ],
        userDataDir: './user_data' // This saves your session!
    });
    
    const page = await browser.newPage();

    // Emulate a specific mobile device (iPhone or Pixel)
    await page.setViewport({
        width: 390,
        height: 844,
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        isLandscape: false
    });

    // Set a very specific Chrome/Android User Agent
    await page.setUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36", {
        architecture: "arm",
        mobile: true,
        model: "Pixel 8",
        platform: "Android",
        platformVersion: "14"
    });

    console.log(`[${locationName}] Opening Google... Solve the Captcha if it appears!`);
    
    try {
        // Go to Google and wait for the "Weather" box to actually render
        await page.goto(locationUrl, { waitUntil: 'networkidle2' });

        // Wait for a selector that is unique to the weather card
        // This ensures the JS has finished building the UI
        await page.waitForSelector('[jsname="K996X"]', { timeout: 10000 }).catch(() => {
            console.log("Weather card selector not found, attempting generic scrape...");
        });

        const data = await page.evaluate(() => {
            // Find all images on the page
            const imgs = Array.from(document.querySelectorAll('img'));
            // Look for the one that lives on the froggie CDN
            const frogImg = imgs.find(img => img.src.includes('froggie/l/'));
            
            // Look for the main background container for the gradient
            // Usually, this is a parent of the frog image or has a specific JS name
            const bgElement = document.querySelector('[jsname="ifm6ce"]') || document.querySelector('.nS41ed');
            const gradient = bgElement ? window.getComputedStyle(bgElement).background : null;

            return { imageUrl: frogImg ? frogImg.src : null, gradient: gradient };
        });

        if (data.imageUrl) {
            // Clean the URL (remove any extra parameters Google adds)
            const cleanUrl = data.imageUrl.split('?')[0];
            console.log(`[${locationName}] Found Frog! URL: ${cleanUrl}`);
            await downloadHighRes(cleanUrl, data.gradient, locationName);
        } else {
            // DEBUG: Save a screenshot if it fails so you can see what the bot sees
            const debugPath = path.resolve('debug_screenshot.png');
            await page.screenshot({ path: debugPath });
            console.log(`[${locationName}] Frog not found. See: ${debugPath}`);
        }

    } catch (error) {
        console.error("Failed to find weather card. Did you solve the captcha?", error.message);
    } finally {
        // Keep the browser open for a few seconds so you can see the result
        setTimeout(() => browser.close(), 5000);
    }
}

async function downloadHighRes(url, gradient, name) {

    // Determine Directory
    const dir = path.resolve(`./locations/${name}`);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Extract Original Filename (removing query params)
    const cleanUrl = url.split('?')[0];
    const highResName = path.basename(cleanUrl).replace('_2x.png', '_4x.png');
    const highResUrl = cleanUrl.replace('_2x.png', '_4x.png');
    const destPath = path.join(dir, 'weather-frog.png');
    
    // Download Image
    console.log(`[${name}] Downloading high-res version: ${highResName}...`);
    const file = fs.createWriteStream(destPath);

    https.get(highResUrl, (res) => {
        res.pipe(file);
        file.on('finish', () => {
            file.close();
            console.log(`[${name}] Downloaded: ${destPath}`);
        });
    }).on('error', (err) => {
        console.error(`Download Error: ${err.message}`);
    });

    // Save CSS
    if (gradient) {
        const cssPath = path.join(dir, 'weather-frog.css');
        fs.writeFileSync(cssPath, `.weather-frog { background: ${gradient}; }`);
        console.log(`CSS SAVED:   ${cssPath}`);
    }
}

// Usage
getFrogAssets(`https://www.google.com/search?q=weather+${city}`, city);