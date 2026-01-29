{ node scrub.js; git add $(find . -size +0c); git commit -m "Automatic image upload."; git push; } 2>&1 | tee "logs/scrub-$(date +"%Y-%m-%d_%H-%M").log"
