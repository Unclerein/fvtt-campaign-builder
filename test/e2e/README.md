# E2E Test Architecture

## Overview

This test suite uses **Puppeteer** for end-to-end testing. All tests share the same authenticated browser context and page.

## The first time testing is setup, need to configure portproxy/firewall:

From elevated Windows PowerShell, run the commands in scripts\setup-debug-proxy.ps1

## Important: WSL Browser Limitations

**Do NOT use headed or headless browser modes in WSL.** The WSL browser has critical issues. Must have user start a browser from Windows first and use attached mode:

From Windows PowerShell:

```powershell
& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --remote-debugging-port=9222 --remote-debugging-address=0.0.0.0 --user-data-dir="C:\temp\foundry-edge"
```

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

- **`--file <path>`** - Filter by test file path (relative to `test/e2e/`, without `.test.ts`). Can be specified multiple times.
- **`--grep <pattern>`** - Filter by suite or test name (case-insensitive substring match). If a suite name matches, all its tests run. Otherwise, only matching tests within each suite run.

### Code Coverage

Coverage uses Istanbul instrumentation via `vite-plugin-istanbul`.

1. Build with instrumentation: `npm run debug:test`
2. Reload Foundry so it picks up the instrumented build
3. Run tests with coverage: `npm run test:coverage`
4. Run `npx nyc report` to generate the report summary
5. `xdg-open coverage/index.html` to open the HTML report

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

## Test Data Guidelines

The `ensureSetup(true)` call creates a standard set of test data:
- 2 settings with entries, campaigns, and sessions
- This data persists across test runs (check with `testDataExists()`)
- **Read-only**: Use this data for navigation, display, and read-only tests
- **Write tests**: Create your own objects within the test and delete them afterward
