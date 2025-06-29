
setup:
    npm install && npx playwright install-deps && npx playwright install

extract-symbols:
    node scripts/extract-symbol-index.mjs
