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
npm test                                        # Run all tests
npm test -- --file directory/basic               # Run only directory/basic.test
npm test -- --file entries/character --file entries/location  # Run multiple files
npm test -- --grep "character"                   # Run suites/tests matching "character"
npm test -- --file entries/character --grep "name"  # Combine file + grep filters
npm run test:coverage                            # Run all tests with coverage report
npm run test:rebuild                             # Reset world and repopulate test data
```

**Note:** Use `npm test` to run E2E tests. Only use `npm run debug` (which rebuilds the module) if application code was changed. If only test code was modified, no rebuild is needed.

### Test Filtering

- **`--file <path>`** — Filter by test file path (relative to `test/e2e/`, without `.test.ts`). Can be specified multiple times.
- **`--grep <pattern>`** — Filter by suite or test name (case-insensitive substring match). If a suite name matches, all its tests run. Otherwise, only matching tests within each suite run.

### Code Coverage

Coverage uses Istanbul instrumentation via `vite-plugin-istanbul`.

1. Build with instrumentation: `npm run debug:test`
2. Reload Foundry so it picks up the instrumented build
3. Run tests with coverage: `npm run test:coverage`
4. Run `npx nyc report` to generate the report summary
5. `xdg-open coverage/index.html` to open the HTML report

The `debug:test` build mode adds Istanbul instrumentation to the source code. When tests run, coverage data is collected from `window.__coverage__` in the browser and written to `.nyc_output/`. The `nyc report` command then generates human-readable reports.

If you run `npm test` without an instrumented build, coverage collection is silently skipped.

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

