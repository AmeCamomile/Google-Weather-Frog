{ cd website; node generate.js; cd ..; git add $(find . -size +0c); git commit -m "Automatic website update."; git push; } > "website-$(date +"%Y-%m-%d_%H-%M").log" 2>&1
