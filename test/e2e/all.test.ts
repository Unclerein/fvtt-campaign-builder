/**
 * Main test runner that executes all e2e tests (except rebuild).
 * Import all test files here and run them as a single suite.
 */

import { runTests } from './testRunner';
import { sharedContext } from '@e2etest/sharedContext';

// Import test files - this registers all their test suites
import './directory/basic.test';
import './entries/character.test';
import './entries/location.test';

// Run all registered tests and handle cleanup
runTests().then(passed => {
  // Final cleanup - disconnect browser
  if (sharedContext.context) {
    try {
      sharedContext.context.disconnect();
    } catch {
      // Ignore disconnect errors
    }
  }
  process.exit(passed ? 0 : 1);
});
