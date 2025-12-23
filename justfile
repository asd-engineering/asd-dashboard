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

test-failed:
    npm run test:failed

# Autoformat & fix lint errors
format:
    npm run lint-fix

# Run static type checking
check:
    bash -c "! rg \"localStorage\\.getItem\\(['\\\"]asd\\.\" -n src | rg -v 'migration|adapters' || (echo 'Direct asd.* localStorage access found'; exit 1)"
    npm run check

[private]
export-all:
    mkdir -p local
    find src tests \
        -maxdepth 3 \
        -type f \( -name '*.ts' \) \
        -not -path './.git/*' \
        -not -path './local/*' \
        -not -path './node_modules/*' \
        -print0 \
    | xargs -0 realpath -z \
    | sort -zu \
    | xargs -0 -I{} sh -c 'printf "\n// --- %s ---\n" "{}"; cat "{}"' \
    > local/src.txt

export-css:
	mkdir -p local
	find scripts src tests . \
		-maxdepth 3 \
		-type f -name '*.css' \
		-not -path './.git/*' \
		-not -path './local/*' \
		-not -path './node_modules/*' \
		-not -path './playwright-report/*' \
		-print0 \
	| xargs -0 -I{} realpath -z --relative-to=. "{}" \
	| sort -z -u \
	| xargs -0 -I{} sh -c 'printf "\n// --- %s ---\n" "{}"; cat "{}"' \
	> local/src.txt

# Git origin checkout
gitoc ARG:
    git fetch origin && git checkout {{ARG}}

# Ubuntu 25.10 workaround for webkit

fix-playwright-webkit-deps:
  @echo "Ensuring compatibility symlinks for WebKit"
  if [ ! -L /usr/lib/x86_64-linux-gnu/libxml2.so.2 ] || [ "$(readlink /usr/lib/x86_64-linux-gnu/libxml2.so.2)" != "/usr/lib/x86_64-linux-gnu/libxml2.so.16.0.5" ]; then \
    sudo ln -sf /usr/lib/x86_64-linux-gnu/libxml2.so.16.0.5 /usr/lib/x86_64-linux-gnu/libxml2.so.2; \
  else \
    echo "libxml2.so.2 link already correct"; \
  fi
  if [ ! -L /usr/lib/x86_64-linux-gnu/libasound2.so ] || [ "$(readlink /usr/lib/x86_64-linux-gnu/libasound2.so)" != "/usr/lib/x86_64-linux-gnu/libasound.so.2.0.0" ]; then \
    sudo ln -sf /usr/lib/x86_64-linux-gnu/libasound.so.2.0.0 /usr/lib/x86_64-linux-gnu/libasound2.so; \
  else \
    echo "libasound2.so link already correct"; \
  fi
  @echo "Setting environment variable for Playwright"
  echo "PW_SKIP_VALIDATE_HOST_REQUIREMENTS=1" >> ~/.profile
  @echo "Done. Please restart your shell or run: source ~/.profile"
