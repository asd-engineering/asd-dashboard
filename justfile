# Justfile for asd-dashboard
import "scripts/just/playwright.just"
import "scripts/just/embed.just"
import "scripts/just/repo.just"
import "scripts/just/symbols.just"

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

# Run static type checking
check:
    npm run check
