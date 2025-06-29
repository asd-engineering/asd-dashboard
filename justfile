
setup:
    npm install && npx playwright install-deps && npx playwright install

extract-arch:
    node scripts/extract-jsdoc.js
