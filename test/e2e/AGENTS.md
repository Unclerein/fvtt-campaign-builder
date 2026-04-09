# E2E Tests

Puppeteer-based end-to-end tests for the Campaign Builder module.

## Important: WSL Browser Limitations

**Do NOT use headed or headless browser modes in WSL.** The WSL browser has critical issues:

- **WebGL/PIXI failures**: WSL's software WebGL (swiftshader) has poor performance with PIXI.js, causing GPU stalls and graphical errors
- **Hardware acceleration**: Foundry VTT requires hardware acceleration for proper rendering, which WSL cannot provide
- **Network isolation**: Windows localhost isn't directly accessible from WSL2

**Always use attach mode** - connect to a Windows browser that has full hardware acceleration and proper WebGL support.

## Setup

### 1. Launch Windows Browser with Remote Debugging

From Windows PowerShell:

```powershell
& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --remote-debugging-port=9222 --user-data-dir="C:\temp\foundry-edge"
```

### 2. Configure Portproxy (One-Time)

From elevated Windows PowerShell:

```powershell
.\scripts\setup-debug-proxy.ps1
```

This creates:
- Portproxy rule to forward `0.0.0.0:9222` to `127.0.0.1:9222`
- Firewall rule to allow inbound connections on port 9222

### 3. Verify Connection

From WSL:

```bash
curl http://$(ip route show default | awk '{print $3}'):9222/json/version
```

Should return JSON with browser version info.

## Running Tests

```bash
npm run test              # Run basic directory tests
npm run test:rebuild      # Run rebuild tests
```

## Architecture

- `testRunner.ts` - Custom Jest-like test runner (describe/test/beforeAll/afterAll/expect)
- `ensureSetup.ts` - Browser connection and Foundry setup using agent infrastructure
- `sharedContext.ts` - Shared browser/page context
- `helpers.ts` - Puppeteer helpers (Locator class, getByTestId, etc.)
- `types.ts` - Local types (Topics enum) to avoid importing Foundry-dependent code
- `utils/` - Test utilities (settings, dialogs, setup)
- `data/` - Test data generators
- `setup/` - World population utilities

## Key Points

1. **No Foundry imports**: E2E tests run in Node.js and communicate with Foundry via Puppeteer's `page.evaluate()`. Never import from `src/` as it pulls in Foundry-dependent code.

2. **Use agent infrastructure**: The `test/agent/` module handles browser connection, login, navigation, and module interaction. Import from `../agent`.

3. **Disconnect, don't close**: In `afterAll`, use `browser.disconnect()` not `browser.close()` to keep the Windows browser running.

4. **Explicit runTests()**: Each test file must call `runTests()` at the end to execute the registered tests.

5. **Test data isolation**: Tests that modify or delete data must create their own objects and clean them up. The basic structure created during setup (settings, campaigns, sessions, entries) is shared across tests and should only be used for read operations.

6. **User experience**: Unless a test is designed to specifically test the module API, it should simulate a real user's actions as much as possible. This means using the UI elements and interactions that a user would use, rather than directly calling the API.

## Test Data Guidelines

The `ensureSetup(true)` call creates a standard set of test data:
- 2 settings with entries, campaigns, and sessions
- This data persists across test runs (check with `testDataExists()`)
- **Read-only**: Use this data for navigation, display, and read-only tests
- **Write tests**: Create your own objects within the test and delete them afterward

