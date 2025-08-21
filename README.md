# ASD Dashboard

The ASD web dashboard is a VanillaJS Progressive Web App (PWA) designed to streamline ⚡ Accelerated Software Development/Devops and Service Deployment. This application empowers users to manage remote services through dynamic, resizable widgets encapsulated within iframes. It supports multiple boards and views for flexible configurations, with user preferences stored in localStorage for persistent sessions. Services are configured in `services.json` and the configuration can be loaded via a `config.json` file. Both files can be loaded local or remote due to the way the project has been designed as a PWA.

## Overview

ASD Dashboard is architected with a focus on simplicity and adaptability:

- **Frontend**: Built using VanillaJS without any frameworks, it leverages CSS Grid for responsive layouts and iframes for embedding widgets.
- **Storage**: Utilizes localStorage for saving user preferences, such as widget positions and board/view states. Configuration is fetched and applied from a `config.json` file.
- **Service Worker**: Provides PWA capabilities, enabling offline functionality and caching of essential resources.
- **Testing**: Automated UI testing is conducted using Playwright, integrated with GitHub Actions for continuous integration. Static files are served by a Python web server during tests.
- **Widgets**: Widgets are loaded through iframes, supporting content from URLs or APIs with options for auto-refresh and configurable intervals.
- **Configurable Grid**: The widget layout grid is flexible, scaling from 1 to 6 columns/rows by default, with options for customization through configuration.

## Features

- **Widget Management**: Add, resize, reorder, and remove widgets dynamically. Widgets can be customized with properties such as size, metadata, and settings. Resizing is facilitated via mouse cursor dragging, adhering to grid standards.
- **Board and View Structure**: Manage multiple boards and views, akin to tabs, allowing users to switch, rename, delete, or reset configurations. State is persistently stored.
- **Global Configuration**: Centralized configuration through `config.json` for global settings like themes and widget store URLs.
- **Widget Menu Toggle**: `showMenuWidget` controls whether widget menus are visible by default.
- **LocalStorage Integration**: Persistent storage of dashboard preferences, with a modal for editing localStorage, enabling import/export and modification of JSON data.
- **Responsive Grid Layout**: Widgets are arranged in a grid that adapts to screen size, with default configurations and options for customization.
- **Service Selection**: Widgets can be added from a predefined JSON file, custom URL, or remote services, with support for merging multiple sources.
- **Service Worker & PWA**: Offline capabilities and caching through a service worker enhance usability and performance.
- **Playwright Integration & Testing**: Comprehensive testing using Playwright, with automated tests running via GitHub Actions.
- **Custom Logger Integration**: All log statements use a custom logger for better development and debugging.

## Reset & State Management

The admin reset control clears boards, views, services and configuration while keeping any saved state snapshots. Bulk removal of saved states is available from the **Saved States** tab in the configuration modal via the "Delete all snapshots" button. A full wipe, including saved states, remains possible through the legacy `StorageManager.clearAll()` API.

### Snapshot de-duplication

Repeated exports with identical configuration and services no longer create duplicate snapshots. If the MD5 hash matches an existing snapshot, its timestamp is refreshed and it moves to the top of the list instead. Snapshots are de-duplicated by MD5 but keep their provided names.

Here's the optimized version of the second part—**URL Fragment-Based Config Sharing**—to follow directly after the revised query parameter section. It's concise, technically precise, and clearly contrasts with the dynamic configuration method:

## Private Config Sharing (via URL Fragment)

ASD Dashboard also supports sharing full configuration and service state using the URL **fragment** (`#...`), which is **never sent to the server**. This method is ideal for securely sharing setups between users without exposing data to the backend or intermediaries.

### How It Works

* Click **“Export”** in the config modal to generate a shareable URL:

  ```
  https://your-dashboard.app/#cfg=<compressed>&svc=<compressed>
  ```

### Fragment Parameters

The fragment follows standard `URLSearchParams` semantics and may include:

* `name` – human-readable snapshot name
* `cfg` / `svc` – compressed config and service payloads
* `algo` – compression algorithm (`deflate` by default, `gzip` for legacy links)
* `cc` – per-payload CRC32 checksums (`cfg,svc`)
* `ccw` – whole-payload checksum over both payloads
* `chunks` – optional manifest when `cfg` or `svc` are split (`cfg:3;svc:2`)

* Config and services are:

  * Compressed with built-in **deflate** (or legacy **gzip**) and base64url-encoded for compactness
  * Optionally minified via a reversible key map for even shorter URLs
  * Protected by a CRC32 checksum to detect truncated or corrupted fragments
  * Decoded locally using modern browser APIs (e.g. `DecompressionStream`)
  * Persisted to `localStorage` when the page loads
  * Switching environments triggers a single reload after clearing the fragment and saves the snapshot under the provided name (MD5-deduplicated)

* **No servers are involved**: data stays fully client-side.

### Advantages

* 🔒 **100% private** – Fragment data never hits the server or network
* 🧪 **Great for debugging** – Share exact UI state across devices or teams
* 🔁 **Instant import** – Users loading the link get your full dashboard setup
* ⚡ **Offline-ready** – Works even when hosted statically or offline

### Practical Limits

* Works reliably up to \~60KB total URL length (more than enough for hundreds of services)
* Very long `cfg`/`svc` parameters are automatically chunked (`cfg0,cfg1,...`) when exceeding 12KB each. A `chunks` manifest (e.g. `chunks=cfg:3;svc:2`) plus a whole-payload checksum `ccw` guard reassembly.
* Shows a warning if the link becomes too large even after chunking
* Fails gracefully if compression is unsupported (e.g., older Safari versions)

### Use Case Example

You can configure your dashboard, click **Export**, and share the link in Slack or WhatsApp. The recipient opens it and instantly gets your layout, widgets, theme, and services—no installation, syncing, or servers involved.

## Dynamic Configuration (via URL Parameters)

The dashboard also supports loading configuration and services **dynamically at runtime** using URL **query parameters**. This feature is mainly intended for **testing, development, or temporary setups** where you want to load alternative configuration data **without modifying local files**.

> ⚠️ **Note:** Unlike fragment-based config sharing (which is 100% client-side and private), query parameters **are sent to the server** and may appear in logs, caches, proxies, or analytics systems. Avoid using this for sensitive or personal data.

### Supported Parameters

* `config_base64` – base64-encoded JSON of the full `config.json`.
* `config_url` – direct URL to a remote `config.json` file.
* `services_base64` – base64-encoded JSON for service definitions.
* `services_url` – direct URL to a remote `services.json` file.

These values override:

* Anything stored in `localStorage`
* The default local `config.json` and `services.json` files

### Example URLs

```bash
# Load from remote config/services
http://localhost:8000/?config_url=https://example.com/config.json&services_url=https://example.com/services.json

# Load from base64-encoded strings
http://localhost:8000/?config_base64=<base64-string>&services_base64=<base64-string>
```

### When to Use This

✅ Ideal for:

* Testing alternate dashboards or environments
* Injecting configuration from CI scripts or preview links

❌ Not ideal for:

* Production or long-term use
* Sharing sensitive configs (use the fragment-based method instead)

## Getting started

### Requirements

To run the ASD Dashboard, ensure the following are installed on your system:

- Node.js: A JavaScript runtime required to run the application.

### Quickstart

Follow these steps to set up and run the ASD Dashboard:

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd asd-dashboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the application:
   ```bash
   npm run start
   ```

4. Open your browser and navigate to `http://localhost:8000` to access the dashboard.

## AI-Enhanced Test Infrastructure

ASD Dashboard integrates an advanced test automation setup powered by [Playwright](https://playwright.dev), designed for **AI-assisted Test-Driven Development (TDD)**.

Instead of manually adding test hooks for logs in each test file, we override the standard `@playwright/test` import via a custom alias defined in `tsconfig.json`. This injects enhanced logging capabilities into every test automatically.

### Rich Feedback for Autonomous Agents

Our custom test runner captures the following data during every test:

- **Console logs** (e.g. `console.log`, `console.warn`)
- **Network requests** (URLs, status codes)
- **App logs** exposed via `window._appLogs` (collected from the client during Playwright runs)

These logs are automatically attached to the Playwright report (`.json` and HTML) on every test—**even when it passes**—making them ideal for Codex/AI agents that analyze feedback post-run.

### Structure

| File                                | Purpose                                       |
|-------------------------------------|-----------------------------------------------|
| `tests/test.ts`                     | Overrides `@playwright/test`, injects fixtures |
| `tsconfig.json`                     | Aliases `@playwright/test` to our runner      |
| `playwright.config.ts`             | Configures global test behavior (trace, video, etc.) |

### Example Usage

You write tests like this:

```ts
import { test, expect } from '@playwright/test';

test('does something', async ({ page }) => {
  await navigate(page,'/');
  // ...
});
```

Console logs, network requests, and in-app logs (window._appLogs) are automatically captured and attached to each test. No extra boilerplate or fixture setup is required. The code becomes:

```ts
// Instead of importing from @playwright/test directly:
import { test, expect } from '@playwright/test';

test('does something', async ({ page, console, network, app }) => {
  await navigate(page,'/');
  // ...
});
```

### License

The ASD-dashboard project is currently proprietary. You are allowed to use the project for personal or internal purposes, but you are not permitted to distribute or sublicense the code.  
Copyright (c) 2025, ASD Engineering. 

**Note**: I plan to transition the project to an open-source license (likely MIT) in the future. However, during this early stage of development, with a focus on networking security related to the commercial side, I am keeping it proprietary to ensure I have the time to shape all ASD-related projects in a way that allows anyone to use them without compromising personal data, privacy, or project security.

