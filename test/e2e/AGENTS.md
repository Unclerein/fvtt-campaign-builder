# E2E Tests

Puppeteer-based end-to-end tests for the Campaign Builder module.

## Browser Modes

### Headed Mode (Default)

Tests run in a visible Chrome window using swiftshader for WebGL compatibility. This works on both WSL2 and native Linux.

### Attach Mode (Optional)

For full hardware acceleration, connect to a Windows browser via remote debugging. This requires manual setup:

1. **Start Edge with remote debugging** (from Windows PowerShell):

```powershell
& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --remote-debugging-port=9222 --remote-debugging-address=0.0.0.0 --user-data-dir="C:\temp\foundry-edge"
```

## Running Tests

```bash
npm test                                        # Run all tests (headed mode)
BROWSER_MODE=attach npm test                    # Run all tests (attach mode)
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

## Coverage Targets
 
| Area | Target Coverage | Notes |
|------|-----------------|-------|
| **Components** | **98% (ideally 100%)** | Critical - UI must be fully tested |
| Stores | 80% | State management logic |
| Classes | 80% | Business logic |
| Utils | 80% | Helper functions |
| Applications | 80% | Main app files |
| **Migrations** | **0% (excluded)** | Not required |

## Architecture

- `testRunner.ts` - Custom Jest-like test runner (describe/test/beforeAll/afterAll/expect)
- `ensureSetup.ts` - Browser connection and Foundry setup using agent infrastructure
- `sharedContext.ts` - Shared browser/page context
- `helpers.ts` - Puppeteer helpers (Locator class, getByTestId, etc.)
- `types.ts` - Local types (Topics enum) to avoid importing Foundry-dependent code
- `utils/` - Test utilities (settings, dialogs, setup)
- `data/` - Test data generators
- `setup/` - World population utilities

## Test Structure

Tests use a **register-then-run** model:

1. **Test files register suites** using `describe()` and `test()`. They do NOT call `runTests()`.
2. **`all.test.ts` imports all test files**, then calls `runTests()` once to execute all registered suites.
3. **Each suite's `beforeAll` calls `ensureSetup()`** which uses a promise lock to ensure setup runs exactly once.

### Creating a New Test File

```typescript
import { describe, test, beforeAll, afterAll, expect } from '../testRunner';
import { sharedContext } from '@e2etest/sharedContext';
import { ensureSetup } from '../ensureSetup';

describe.serial('My Test Suite', () => {
  beforeAll(async () => {
    await ensureSetup(false);
    // Navigate to starting point...
  });

  test('my test case', async () => {
    const page = sharedContext.page!;
    // Test logic...
  });
});
```

### Adding to the Test Runner

After creating a new test file, add it to `allTestFiles` in `all.test.ts`:

```typescript
const allTestFiles: Record<string, () => Promise<void>> = {
  // ... existing entries ...
  'myFeature/mytest': () => import('./myFeature/mytest.test').then(() => {}),
};
```

## Key Points

1. **No Foundry imports**: E2E tests run in Node.js and communicate with Foundry via Puppeteer's `page.evaluate()`. Never import from `src/` as it pulls in Foundry-dependent code.

2. **Use agent infrastructure**: The `test/agent/` module handles browser connection, login, navigation, and module interaction. Import from `../agent`.

3. **Test data isolation**: Tests that modify or delete data must create their own objects and clean them up. Never edit data on an object that was created as part of the basic structure during setup (settings, campaigns, sessions, entries, etc.).

4. **User experience**: Unless a test is designed to specifically test the module API, it should simulate a real user's actions. This means using the UI elements and interactions that a user would use, rather than directly calling the API.  Tests that need to create their own data for testing purposes should navigate through the app UI to create it as part of the test, as if they were a user, rather than using the API directly.  They should then clean up behind themselves.  Alternately, they can create a new entry, session, campaign, etc. and give it a unique name.  In that case, it shouldn't interfere with the existing test data and could be left behind.

5. **Serial execution**: Tests run in the same UI so can never run in parallel.  Also, each test file should assume it could be run in any order or combination with other files.  This means it should never assume a starting point for the UI - it should confirm the module is open and navigate to the starting point it needs.

## Test Data Guidelines

The `ensureSetup(true)` call creates a standard set of test data:
- 2 settings with entries, campaigns, and sessions
- This data persists across test runs (check with `testDataExists()`)
- **Read-only**: Use this data for navigation, display, and read-only tests
- **Write tests**: Create your own objects within the test and delete them afterward

## Entry Creation Patterns

### UI-Based Entry Creation

Use `createEntryViaUI()` from `@e2etest/utils` to create entries via the UI (simulates real user behavior).  Note that the entry will be open after creation, which is often convenient for next steps.

### Topic-Specific Behaviors

- **Character, Location, Organization**: Use grouped tree with type folders. Dialog button is "Use".
- **PC**: Uses nested tree (no type folders). Dialog button is "OK".

### Directory Tree Structure

- **Grouped tree** (Character, Location, Organization): Entries are grouped under type folders like `(none)`, `Town`, etc.
- **Nested tree** (PC): Entries are listed directly under the topic folder without type grouping.

### Test Isolation

Each test file should:
1. Close leftover tabs in `beforeAll` (from previous test runs)
2. Close all tabs in `afterEach` (between tests in the same suite)
3. Clean up created entries in `afterAll`

```typescript
beforeAll(async () => {
  await ensureSetup(false);
  await switchToSetting(setting.name);
  
  // Close leftover tabs
  const page = sharedContext.page!;
  const closeButtons = await page.$$('[data-testid="tab-close-button"]');
  for (const btn of closeButtons) {
    try {
      await btn.click();
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch { /* ignore */ }
  }
});

afterEach(async () => {
  const page = sharedContext.page!;
  const closeButtons = await page.$$('[data-testid="tab-close-button"]');
  for (const btn of closeButtons) {
    try {
      await btn.click();
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch { /* ignore */ }
  }
});
```

### Waiting for Entry Content

After opening an entry, wait for the name input to have a value (Vue reactivity timing):

```typescript
await page.waitForSelector('[data-testid="entry-name-input"]', { timeout: 5000 });
await page.waitForFunction(() => {
  const input = document.querySelector('[data-testid="entry-name-input"]') as HTMLInputElement;
  return input && input.value.length > 0;
}, { timeout: 5000 });
```

