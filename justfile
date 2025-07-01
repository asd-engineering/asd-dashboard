# Justfile for asd-dashboard
import "scripts/just/playwright.just"
import "scripts/just/embed.just"

# Bootstrap the project
setup:
    npm install \
    && npx playwright install-deps \
    && npx playwright install

# Start the dev server (no-cache)
start:
    npm run start

# Run the full test suite
test:
    npm run test

# Run tests matching a grep pattern
test-grep GREP:
    npm run test:grep "{{GREP}}"

# Autoformat & fix lint errors
format:
    npm run lint-fix

# Extract symbol index
extract-symbols:
    node scripts/extract-symbol-index.mjs

# Run static type checking
check:
    npm run check
