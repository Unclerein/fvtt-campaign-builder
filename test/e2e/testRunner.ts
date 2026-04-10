/**
 * Simple test runner for Puppeteer e2e tests.
 * Provides Jest-like describe/it/test syntax without requiring Jest.
 */

import * as fs from 'fs';
import * as path from 'path';
import { sharedContext } from './sharedContext';

type TestFn = () => Promise<void> | void;
type HookFn = () => Promise<void> | void;

interface TestSuite {
  name: string;
  tests: { name: string; fn: TestFn; skip?: boolean }[];
  beforeAll: HookFn[];
  afterAll: HookFn[];
  beforeEach: HookFn[];
  afterEach: HookFn[];
  serial: boolean;
}

const suites: TestSuite[] = [];
let currentSuite: TestSuite | null = null;
let onlySuite: TestSuite | null = null;
let grepPattern: string | null = null;

/**
 * Set a grep pattern to filter suites and tests by name (case-insensitive substring match).
 */
export function setGrep(pattern: string): void {
  grepPattern = pattern;
}

/**
 * Creates a test suite. Use .serial to run tests sequentially.
 */
export function describe(name: string, fn: () => void): void {
  const suite: TestSuite = {
    name,
    tests: [],
    beforeAll: [],
    afterAll: [],
    beforeEach: [],
    afterEach: [],
    serial: false,
  };
  
  const prevSuite = currentSuite;
  currentSuite = suite;
  fn();
  currentSuite = prevSuite;
  
  suites.push(suite);
}

/**
 * Mark suite as serial (run tests sequentially, not in parallel).
 */
describe.serial = function(name: string, fn: () => void): void {
  const suite: TestSuite = {
    name,
    tests: [],
    beforeAll: [],
    afterAll: [],
    beforeEach: [],
    afterEach: [],
    serial: true,
  };
  
  const prevSuite = currentSuite;
  currentSuite = suite;
  fn();
  currentSuite = prevSuite;
  
  suites.push(suite);
};

/**
 * Run only this suite.
 */
describe.only = function(name: string, fn: () => void): void {
  const suite: TestSuite = {
    name,
    tests: [],
    beforeAll: [],
    afterAll: [],
    beforeEach: [],
    afterEach: [],
    serial: true,
  };
  
  const prevSuite = currentSuite;
  currentSuite = suite;
  fn();
  currentSuite = prevSuite;
  
  onlySuite = suite;
};

/**
 * Skip this suite.
 */
describe.skip = function(_name: string, _fn: () => void): void {
  // Don't add to suites - effectively skipped
};

/**
 * Creates a test case.
 */
export function test(name: string, fn: TestFn): void {
  if (!currentSuite) {
    throw new Error('test() must be called inside describe()');
  }
  currentSuite.tests.push({ name, fn });
}

/**
 * Skip a test.
 */
test.skip = function(name: string, fn: TestFn): void {
  if (!currentSuite) {
    throw new Error('test.skip() must be called inside describe()');
  }
  currentSuite.tests.push({ name, fn, skip: true });
};

/**
 * Mark test as slow (extends timeout).
 */
test.slow = function(): void {
  // No-op in this simple runner, but kept for API compatibility
};

/**
 * Set timeout for the current test.
 */
test.setTimeout = function(_ms: number): void {
  // No-op in this simple runner
};

/**
 * Alias for test.
 */
export const it = test;

/**
 * Run before all tests in a suite.
 */
export function beforeAll(fn: HookFn): void {
  if (!currentSuite) {
    throw new Error('beforeAll() must be called inside describe()');
  }
  currentSuite.beforeAll.push(fn);
}

/**
 * Run after all tests in a suite.
 */
export function afterAll(fn: HookFn): void {
  if (!currentSuite) {
    throw new Error('afterAll() must be called inside describe()');
  }
  currentSuite.afterAll.push(fn);
}

/**
 * Run before each test in a suite.
 */
export function beforeEach(fn: HookFn): void {
  if (!currentSuite) {
    throw new Error('beforeEach() must be called inside describe()');
  }
  currentSuite.beforeEach.push(fn);
}

/**
 * Run after each test in a suite.
 */
export function afterEach(fn: HookFn): void {
  if (!currentSuite) {
    throw new Error('afterEach() must be called inside describe()');
  }
  currentSuite.afterEach.push(fn);
}

/**
 * Simple expect function with matchers.
 */
export function expect<T>(actual: T) {
  return {
    toBe(expected: T): void {
      if (actual !== expected) {
        throw new Error(`Expected ${expected} but got ${actual}`);
      }
    },
    toEqual(expected: T): void {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      }
    },
    toBeTruthy(): void {
      if (!actual) {
        throw new Error(`Expected truthy value but got ${actual}`);
      }
    },
    toBeFalsy(): void {
      if (actual) {
        throw new Error(`Expected falsy value but got ${actual}`);
      }
    },
    toContain(expected: T extends any[] ? T[number] : T): void {
      if (Array.isArray(actual)) {
        if (!actual.includes(expected as any)) {
          throw new Error(`Expected array to contain ${expected}`);
        }
      } else if (typeof actual === 'string') {
        if (!actual.includes(expected as string)) {
          throw new Error(`Expected string to contain ${expected}`);
        }
      } else {
        throw new Error('toContain() requires an array or string');
      }
    },
    toHaveLength(expected: number): void {
      if ((actual as any).length !== expected) {
        throw new Error(`Expected length ${expected} but got ${(actual as any).length}`);
      }
    },
    toBeGreaterThan(expected: number): void {
      if ((actual as number) <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toBeLessThan(expected: number): void {
      if ((actual as number) >= expected) {
        throw new Error(`Expected ${actual} to be less than ${expected}`);
      }
    },
    toBeNull(): void {
      if (actual !== null) {
        throw new Error(`Expected null but got ${actual}`);
      }
    },
    toBeUndefined(): void {
      if (actual !== undefined) {
        throw new Error(`Expected undefined but got ${actual}`);
      }
    },
    not: {
      toBe(expected: T): void {
        if (actual === expected) {
          throw new Error(`Expected not ${expected}`);
        }
      },
      toEqual(expected: T): void {
        if (JSON.stringify(actual) === JSON.stringify(expected)) {
          throw new Error(`Expected not ${JSON.stringify(expected)}`);
        }
      },
      toContain(expected: T extends any[] ? T[number] : T): void {
        if (Array.isArray(actual)) {
          if (actual.includes(expected as any)) {
            throw new Error(`Expected array not to contain ${expected}`);
          }
        } else if (typeof actual === 'string') {
          if (actual.includes(expected as string)) {
            throw new Error(`Expected string not to contain ${expected}`);
          }
        }
      },
      toBeNull(): void {
        if (actual === null) {
          throw new Error(`Expected not null`);
        }
      },
    },
  };
}

/**
 * Collect Istanbul coverage data from the browser and write to .nyc_output.
 * Call this after all tests have run but before disconnecting the browser.
 */
export async function collectCoverage(): Promise<void> {
  const page = sharedContext.page;
  if (!page) {
    console.log('\x1b[33mNo page available for coverage collection\x1b[0m');
    return;
  }

  try {
    // Pull coverage data from the browser
    const coverage = await page.evaluate(() => {
      return (window as any).__coverage__ ?? null;
    });

    if (!coverage) {
      console.log('\x1b[33mNo coverage data found (build with --mode test to enable instrumentation)\x1b[0m');
      return;
    }

    // Write coverage JSON to .nyc_output for nyc to pick up
    const outputDir = path.resolve(process.cwd(), '.nyc_output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFile = path.join(outputDir, `coverage-${Date.now()}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(coverage));
    console.log(`\x1b[36mCoverage data written to ${outputFile}\x1b[0m`);
  } catch (error) {
    console.error(`\x1b[31mFailed to collect coverage: ${error}\x1b[0m`);
  }
}

/**
 * Run all registered test suites.
 */
export async function runTests(): Promise<boolean> {
  let suitesToRun = onlySuite ? [onlySuite] : suites;

  // Apply grep filter if set
  if (grepPattern) {
    const lowerGrep = grepPattern.toLowerCase();
    suitesToRun = suitesToRun
      .map(suite => {
        // If suite name matches, run all its tests
        if (suite.name.toLowerCase().includes(lowerGrep)) {
          return suite;
        }
        // Otherwise, filter individual tests
        const filteredTests = suite.tests.filter(t => t.name.toLowerCase().includes(lowerGrep));
        if (filteredTests.length > 0) {
          return { ...suite, tests: filteredTests };
        }
        return null;
      })
      .filter((s): s is TestSuite => s !== null);

    if (suitesToRun.length === 0) {
      console.log(`\x1b[33mNo suites or tests match grep pattern: "${grepPattern}"\x1b[0m`);
      return true;
    }
  }

  let allPassed = true;
  
  for (const suite of suitesToRun) {
    console.log(`\n\x1b[36m${suite.name}\x1b[0m`);
    
    // Run beforeAll hooks
    for (const hook of suite.beforeAll) {
      try {
        await hook();
      } catch (error) {
        console.error(`  \x1b[31mbeforeAll failed: ${error}\x1b[0m`);
        allPassed = false;
        continue;
      }
    }
    
    // Run tests
    for (const test of suite.tests) {
      if (test.skip) {
        console.log(`  \x1b[90m- ${test.name} (skipped)\x1b[0m`);
        continue;
      }
      
      // Run beforeEach hooks
      for (const hook of suite.beforeEach) {
        try {
          await hook();
        } catch (error) {
          console.error(`  \x1b[31mbeforeEach failed: ${error}\x1b[0m`);
          allPassed = false;
          continue;
        }
      }
      
      try {
        await test.fn();
        console.log(`  \x1b[32m\u2713 ${test.name}\x1b[0m`);
      } catch (error) {
        console.error(`  \x1b[31m\u2717 ${test.name}\x1b[0m`);
        console.error(`    ${error}`);
        allPassed = false;
      }
      
      // Run afterEach hooks
      for (const hook of suite.afterEach) {
        try {
          await hook();
        } catch (error) {
          console.error(`  \x1b[31mafterEach failed: ${error}\x1b[0m`);
        }
      }
    }
    
    // Run afterAll hooks
    for (const hook of suite.afterAll) {
      try {
        await hook();
      } catch (error) {
        console.error(`  \x1b[31mafterAll failed: ${error}\x1b[0m`);
      }
    }
  }
  
  console.log(allPassed ? '\n\x1b[32mAll tests passed!\x1b[0m' : '\n\x1b[31mSome tests failed.\x1b[0m');
  return allPassed;
}

// Tests must explicitly call runTests() at the end of the file
// This ensures async setup completes before tests run
