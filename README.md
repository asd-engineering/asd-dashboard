# ASD Dashboard

ASD Dashboard is a VanillaJS Progressive Web App (PWA) designed to streamline Accelerated Software Development and Automated Service Deployment. This application empowers users to manage remote services through dynamic, resizable widgets encapsulated within iframes. It supports multiple boards and views for flexible configurations, with user preferences stored in localStorage for persistent sessions. Configuration can be loaded via a local or remote `config.json` file.

## Overview

ASD Dashboard is architected with a focus on simplicity and adaptability:

- **Frontend**: Built using VanillaJS without any frameworks, it leverages CSS Grid for responsive layouts and iframes for embedding widgets.
- **Storage**: Utilizes localStorage for saving user preferences, such as widget positions and board/view states. Configuration is fetched and applied from a `config.json` file.
- **Service Worker**: Provides PWA capabilities, enabling offline functionality and caching of essential resources.
- **Testing**: Automated UI testing is conducted using Playwright, integrated with GitHub Actions for continuous integration. Static files are served by a Python web server during tests.
- **Widgets**: Widgets are loaded through iframes, supporting content from URLs or APIs with options for auto-refresh and configurable intervals.
- **Themes**: The application supports both light and dark themes, configurable globally.
- **Configurable Grid**: The widget layout grid is flexible, scaling from 1 to 6 columns/rows by default, with options for customization through configuration.

## Features

- **Widget Management**: Add, resize, reorder, and remove widgets dynamically. Widgets can be customized with properties such as size, metadata, and settings. Resizing is facilitated via mouse cursor dragging, adhering to grid standards.
- **Board and View Structure**: Manage multiple boards and views, akin to tabs, allowing users to switch, rename, delete, or reset configurations. State is persistently stored.
- **Global Configuration**: Centralized configuration through `config.json` for global settings like themes and widget store URLs.
- **LocalStorage Integration**: Persistent storage of dashboard preferences, with a modal for editing localStorage, enabling import/export and modification of JSON data.
- **Responsive Grid Layout**: Widgets are arranged in a grid that adapts to screen size, with default configurations and options for customization.
- **Theme Support**: Easily switch between light and dark themes via global settings.
- **Service Selection**: Widgets can be added from a predefined JSON file, custom URL, or remote services, with support for merging multiple sources.
- **Service Worker & PWA**: Offline capabilities and caching through a service worker enhance usability and performance.
- **Playwright Integration & Testing**: Comprehensive testing using Playwright, with automated tests running via GitHub Actions.
- **Custom Logger Integration**: All log statements use a custom logger for better development and debugging.

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

### License

The project is proprietary. Copyright (c) 2024.
