{ node weather_wide.js; git add $(find . -size +0c); git commit -m "Update location weather."; git push; } > "logs/weather-wide-$(date +"%Y-%m-%d_%H-%M").log" 2>&1
