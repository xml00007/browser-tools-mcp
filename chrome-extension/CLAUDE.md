# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is the Chrome extension component of BrowserTools MCP, a browser monitoring and interaction tool that enables AI-powered applications to capture and analyze browser data through a Chrome extension. The extension is part of a three-component system (Chrome Extension → Node Server → MCP Server) that facilitates communication between AI clients and browser data.

## Architecture

### Extension Structure
- `manifest.json` - Chrome extension manifest v3 configuration
- `background.js` - Service worker handling extension lifecycle and communication
- `devtools.js` - DevTools panel initialization and main logic
- `devtools.html` - DevTools panel entry point 
- `panel.js` - DevTools panel UI and settings management
- `panel.html` - DevTools panel UI layout and styling

### Key Components

**Background Service Worker** (`background.js`):
- Manages tab URL tracking and caching
- Handles screenshot capture via `chrome.tabs.captureVisibleTab`
- Validates server identity via `/.identity` endpoint
- Communicates with browser-tools-server for URL updates
- Listens for tab events (navigation, activation, etc.)

**DevTools Integration** (`devtools.js`):
- Attaches Chrome debugger API for console log capture
- Monitors network requests (XHR/fetch only)
- Establishes WebSocket connection to browser-tools-server
- Processes and truncates large data payloads
- Tracks selected DOM elements in Elements panel

**Settings Panel** (`panel.js`):
- Manages extension configuration (log limits, server connection)
- Auto-discovery of browser-tools-server instances
- Connection status monitoring and reconnection logic
- Screenshot path configuration and auto-paste settings

## Development Commands

This Chrome extension does not use a build system - it's vanilla JavaScript that loads directly in Chrome.

### Loading the Extension
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select this directory
4. Open DevTools on any page to see the "BrowserToolsMCP" panel

### Server Dependencies
The extension requires two servers to be running:
- **browser-tools-server**: `npx @agentdeskai/browser-tools-server@latest`
- **browser-tools-mcp**: `npx @agentdeskai/browser-tools-mcp@latest`

## Key Features

### Network Monitoring
- Filters to localhost requests only (configurable in devtools.js:496)
- Captures request/response bodies, headers, cookies
- Processes JSON payloads with size limits to prevent token overflow

### Console Log Capture
- Uses Chrome Debugger Protocol (`Runtime.consoleAPICalled`, `Runtime.exceptionThrown`)
- Formats multi-argument console calls into readable strings
- Truncates large strings and objects to stay within limits

### Screenshot Functionality
- Two capture methods: via WebSocket commands and direct panel button
- Validates server identity before capturing
- Supports custom save paths and auto-paste to Cursor IDE

### Server Discovery
- Auto-discovers browser-tools-server on common ports (3025-3035)
- Tests localhost, 127.0.0.1, and common local network IPs
- Graceful reconnection after page refreshes or server restarts

## Configuration

### Extension Settings
Settings are stored in `chrome.storage.local` and include:
- `logLimit`: Maximum number of logs to store (default: 50)
- `queryLimit`: Maximum query size in characters (default: 30000) 
- `stringSizeLimit`: Maximum string length before truncation (default: 500)
- `maxLogSize`: Maximum total log payload size (default: 20000)
- `serverHost`/`serverPort`: Connection details for browser-tools-server
- `screenshotPath`: Custom directory for saving screenshots
- `allowAutoPaste`: Enable auto-paste screenshots to Cursor

### Server Communication
- Validates server identity via signature: `"mcp-browser-connector-24x7"`
- Uses both HTTP endpoints (`/extension-log`, `/screenshot`, `/current-url`) and WebSocket (`/extension-ws`)
- Implements retry logic and graceful degradation when server unavailable

## Security Considerations

### Data Handling
- All data stays local - no external API calls except to configured local servers
- Removes sensitive headers and cookies before sending to MCP server
- Server identity validation prevents connecting to unintended services

### Permissions
Extension requires these Chrome permissions:
- `activeTab`: Access current tab content
- `debugger`: Console log capture
- `storage`: Settings persistence
- `tabs`/`tabCapture`: Screenshot functionality
- `<all_urls>`: Network request monitoring

## Troubleshooting

### Common Issues
1. **Extension not loading**: Check Chrome developer mode is enabled
2. **No server connection**: Verify browser-tools-server is running and accessible
3. **Missing console logs**: Ensure debugger is attached (automatic on panel open)
4. **Screenshot failures**: Check tab permissions and server validation

### Debug Information
- Console logs are prefixed with "Chrome Extension:" for easy filtering
- Connection status shown in panel banner and detailed in connection dialog
- WebSocket connection includes heartbeat mechanism for connection monitoring