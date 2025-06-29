# Justfile for asd-dashboard

# 1. Bootstrap the project
setup:
    npm install \
    && npx playwright install-deps \
    && npx playwright install

# 2. Start the dev server (no-cache)
start:
    npm run start

# 3. Run the full test suite
test:
    npm run test

# Run tests matching a grep pattern
test-grep GREP:
    npm run test:grep "{{GREP}}"

# Run only widget tagged tests
test-widgets:
    npm run test:widgets

# 4. Autoformat & fix lint errors
format:
    npm run lint-fix

# 5. Extract symbol index
extract-symbols:
    node scripts/extract-symbol-index.mjs
