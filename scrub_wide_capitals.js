const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');

// --- CONFIGURATION ---
// const WEATHER_TYPES = [
//     "CLEAR", "MOSTLY_CLEAR", "PARTLY_CLOUDY", "MOSTLY_CLOUDY", "CLOUDY",
//     "WINDY", "WIND_AND_RAIN", "LIGHT_RAIN_SHOWERS", "CHANCE_OF_SHOWERS",
//     "SCATTERED_SHOWERS", "RAIN_SHOWERS", "HEAVY_RAIN_SHOWERS",
//     "LIGHT_TO_MODERATE_RAIN", "MODERATE_TO_HEAVY_RAIN", "RAIN", "LIGHT_RAIN",
//     "HEAVY_RAIN", "RAIN_PERIODICALLY_HEAVY", "LIGHT_SNOW_SHOWERS",
//     "CHANCE_OF_SNOW_SHOWERS", "SCATTERED_SNOW_SHOWERS", "SNOW_SHOWERS",
//     "HEAVY_SNOW_SHOWERS", "LIGHT_TO_MODERATE_SNOW", "MODERATE_TO_HEAVY_SNOW",
//     "SNOW", "LIGHT_SNOW", "HEAVY_SNOW", "SNOWSTORM", "SNOW_PERIODICALLY_HEAVY",
//     "HEAVY_SNOW_STORM", "BLOWING_SNOW", "RAIN_AND_SNOW", "HAIL", "HAIL_SHOWERS",
//     "THUNDERSTORM", "THUNDERSHOWER", "LIGHT_THUNDERSTORM_RAIN",
//     "SCATTERED_THUNDERSTORMS", "HEAVY_THUNDERSTORM"
// ];

const CAPITALS = [
    // Europe
    "London", "Paris", "Berlin", "Madrid", "Rome", "Kyiv", "Warsaw", "Vienna", "Amsterdam", "Brussels",
    "Stockholm", "Oslo", "Helsinki", "Copenhagen", "Reykjavik", "Dublin", "Lisbon", "Athens", "Prague", "Budapest",
    "Bucharest", "Sofia", "Belgrade", "Zurich", "Geneva", "Luxembourg", "Monaco", "Tallinn", "Riga", "Vilnius",

    // North & Central America
    "Washington D.C.", "New York", "Ottawa", "Mexico City", "Havana", "Panama City", "Kingston", "San Jose", 
    "Guatemala City", "Nassau", "Toronto", "Vancouver", "Chicago", "Los Angeles", "Miami",

    // Asia
    "Tokyo", "Seoul", "Beijing", "Taipei", "Hong Kong", "Singapore", "Bangkok", "Hanoi", "Jakarta", "Kuala Lumpur",
    "Manila", "New Delhi", "Mumbai", "Islamabad", "Dhaka", "Kathmandu", "Tashkent", "Astana", "Ulaanbaatar",

    // Middle East & Caucasus
    "Dubai", "Abu Dhabi", "Riyadh", "Doha", "Kuwait City", "Muscat", "Jerusalem", "Amman", "Beirut", "Ankara",
    "Tbilisi", "Yerevan", "Baku", "Tehran", "Baghdad",

    // Africa
    "Cairo", "Nairobi", "Cape Town", "Johannesburg", "Addis Ababa", "Casablanca", "Marrakech", "Algiers", "Tunis",
    "Lagos", "Abuja", "Accra", "Dakar", "Luanda", "Antananarivo",

    // South America
    "Buenos Aires", "Brasilia", "Rio de Janeiro", "Santiago", "Lima", "Bogota", "Quito", "Caracas", "Montevideo", "Asuncion",

    // Oceania
    "Sydney", "Melbourne", "Canberra", "Wellington", "Auckland", "Suva", "Port Moresby"
];

async function runCapitalHarvest() {
    const browser = await puppeteer.launch({ 
        headless: false, 
        userDataDir: './user_data',
        args: ['--disable-blink-features=AutomationControlled']
    });

    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36", {
        architecture: "arm", mobile: true, model: "Pixel 8", platform: "Android", platformVersion: "14"
    });
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true });

    const collectionDir = path.resolve(`./images/wide`);
    if (!fs.existsSync(collectionDir)) fs.mkdirSync(collectionDir, { recursive: true });

    console.log(`\n=== STARTING CAPITALS FROG HARVEST ===`);
    let i = 0;
    let randomWait = 0;
    for (const city of CAPITALS) {

        // Progress Bar Calculation
        i++;
        const progress = Math.round((i / CAPITALS.length) * 100);

        const query = `weather+${city}`;
        console.log(`\n🔍 Searching for ${city}... [${progress}%] (${i}/${CAPITALS.length}) ..${randomWait / 1000}s`);

        try {
            await page.goto(`https://www.google.com/search?q=${query}`, { waitUntil: 'networkidle2' });

            const data = await page.evaluate(() => {
                const img = Array.from(document.querySelectorAll('img')).find(i => i.src.includes('froggie/l/'));
                const bg = document.querySelector('[jsname="ifm6ce"]') || document.querySelector('.nS41ed');
                return {
                    src: img ? img.src : null,
                    gradient: bg ? window.getComputedStyle(bg).background : null
                };
            });

            if (data.src) {
                const cleanUrl = data.src.split('?')[0];
                const originalName = path.basename(cleanUrl).replace('_2x.png', '_4x.png');
                const destPath = path.join(collectionDir, originalName.replace('_4x', ''));

                console.log(`   ${cleanUrl}`);

                if (fs.existsSync(destPath)) {
                    console.log(`✨ Already have frog: ${originalName.replace('_4x', '')}`);
                } else {
                    const highResUrl = cleanUrl.replace('_2x.png', '_4x.png');
                    await downloadFile(highResUrl, destPath);
                    console.log(`🐸 NEW FROG CAPTURED: ${originalName}`);
                    
                    if (data.gradient) {
                        fs.writeFileSync(destPath.replace('.png', '.css'), `.bg { background: ${data.gradient}; }`);
                    }
                }
            }
        } catch (err) {
            console.log(`⚠️ Error in ${city}: ${err.message}`);
        }

        // RANDOM DELAY: Between 2 and 10 seconds
        randomWait = Math.floor(Math.random() * (10000 - 2000 + 1)) + 2000;
        await new Promise(r => setTimeout(r, randomWait)); // Random wait to avoid rate limiting
    }

    await browser.close();
    console.log("\n✅ HARVEST COMPLETED.");
}

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (res) => {
            res.pipe(file);
            file.on('finish', () => file.close(resolve));
        }).on('error', reject);
    });
}

runCapitalHarvest();