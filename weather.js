const https = require("https");
const fs = require("fs");
const { performance } = require('perf_hooks');

const wideRegex = /(?<url>https:\/\/www.gstatic.com\/weather\/froggie\/l\/)(?<name>.*?)_2x(?<ext>\.png)/g;
const locationUrls = [
    ["https://www.google.com/search?q=weather+nieuwendijk", "nieuwendijk"],
]

const colorsRegex = /background:-webkit-linear-gradient\((?<colors>.*?)\)/g;

const androidUserAgent = {
    headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 6.0.1; A0001 Build/MHC19Q; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/76.0.3809.80 Mobile Safari/537.36 GSA/10.28.7.21.arm"
    }
};

var nextIterationDelay = 0;
var iterationDelayAmount = 3000;

function getImages(url, regex, getColors = false) {
    return new Promise((resolve, reject) => {
        try {
            https.get(url, androidUserAgent, (response) => {
                if (response.statusCode !== 200) {
                    reject("Non-OK status code: " + response.statusCode);
                    return;
                }

                var body = "";

                response.on("data", function (chunk) {
                    body += chunk;
                });

                response.on("end", function () {
                    var images = [];

                    var match;
                    while (match = regex.exec(body)) {
                        var object = {
                            url: match[0],
                            name: match[2],
                            extension: match[3]
                        };

                        if (getColors) {
                            var color;
                            while (color = colorsRegex.exec(body)) {
                                object.css = color[0];
                                object.gradient = color[1];
                            }
                        }

                        images.push(object);
                    }

                    resolve(images);
                });
            }).on("error", (error) => {
                reject(error);
            });
        } catch (error) {
            reject(error);
        }
    });
}

function downloadFile(url, path, logPrefix) {
    return new Promise((resolve, reject) => {
        try {
            if (fs.existsSync(path) && fs.statSync(path).size > 0) {
                console.log(logPrefix, `SKIPPED (exists): ${path}`);
                resolve();
                return;
            }
            
            console.log(logPrefix, `DOWNLOADING: ${url} -> ${path}`);
            var file = fs.createWriteStream(path);

            https.get(url, (response) => {
                if (response.statusCode !== 200) {
                    file.end(() => {
                        fs.unlinkSync(path);
                    });

                    reject("Non-OK status code: " + response.statusCode);
                    return;
                }

                response.pipe(file);
                response.on('end', () => {
                    file.close(resolve);
                });
            }).on("error", (error) => {
                reject(error);
            });
        } catch (error) {
            reject(error);
        }
    });
}

function makeFile(data, path, logPrefix) {
    return new Promise((resolve, reject) => {
        try {
            if (fs.existsSync(path) && fs.statSync(path).size > 0) {
                console.log(logPrefix, `SKIPPED CSS (exists): ${path}`);
                resolve();
                return;
            }

            console.log(logPrefix, `CREATING CSS: ${path}`);
            fs.writeFile(path, data, (error) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        } catch (error) {
            reject(error);
        }
    })
}

async function doLocationsDownload() {
    console.log("\n--- Starting Location Weather Download Process ---");
    locationUrls.forEach(async (item, index, array) => {
        nextIterationDelay = nextIterationDelay + iterationDelayAmount;

        setTimeout(async () => {
            const realIndex = (index + 1).toString();
            const padLength = array.length.toString().length;
            const currentItemString = "[L: " + realIndex.padStart(padLength, '0') + "/" + array.length + "]";
            const performanceString = "[" + Math.round(performance.now()) + " ms]";
            const logPrefix = `${currentItemString} ${performanceString}`;
            const locationName = item[1];
            const locationUrl = item[0];

            console.log(logPrefix, `Processing location '${locationName}' from URL: ${locationUrl}`);
            
            var result = await getImages(locationUrl, wideRegex, true).catch((error) => console.log(logPrefix, "Item failed:", JSON.stringify(error)));

            if (result === undefined) {
                return;
            }

            if (result.length < 1) {
                console.log(logPrefix, "Item failed, no images found in response.");
                return;
            }

            console.log(logPrefix, `Found ${result.length} image(s) for '${locationName}'.`);
            result.forEach(async (image) => {
                const css = ".weather-frog { background: linear-gradient(" + image.gradient + "); background: -moz-linear-gradient(" + image.gradient + "); background: -ms-linear-gradient(" + image.gradient + "); background: -o-linear-gradient(" + image.gradient + "); background: -webkit-linear-gradient(" + image.gradient + "); }";
                const cssPath = "./locations/" + locationName + "/weather-frog.css";
                await makeFile(css, cssPath, logPrefix).catch((error) => console.log(logPrefix, "CSS creation failed:", JSON.stringify(error)));
                
                const destPath = "./locations/" + locationName + "/weather-frog" + image.extension;
                const srcUrl = image.url.replace("_2x.png", "_4x.png");
                await downloadFile(srcUrl, destPath, logPrefix).catch((error) => console.log(logPrefix, "Download failed:", JSON.stringify(error)));
            });
        }, nextIterationDelay);
    });
}

console.log("=== [" + new Date().toString() + "] ===");
console.log("Location scraper starting. Totals: " + locationUrls.length + " location URL(s)");

doLocationsDownload().catch((error) => console.error(error));