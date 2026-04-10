/**
 * Main test runner that executes all e2e tests (except rebuild).
 * Import all test files here and run them as a single suite.
 *
 * Usage:
 *   npm test                                  # Run all tests
 *   npm test -- --file directory/basic         # Run only directory/basic.test
 *   npm test -- --file entries/character --file entries/location
 *   npm test -- --grep "character"             # Run suites/tests matching "character"
 */

import { runTests, collectCoverage, setGrep } from './testRunner';
import { sharedContext } from '@e2etest/sharedContext';

// --- Parse CLI args ---
const args = process.argv.slice(2);

/** Collect --file values */
const fileFilters: string[] = [];
/** Collect --grep value */
let grepPattern: string | undefined;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--file' && args[i + 1]) {
    fileFilters.push(args[++i]);
  } else if (args[i] === '--grep' && args[i + 1]) {
    grepPattern = args[++i];
  }
}

// Pass grep filter to the test runner
if (grepPattern) {
  setGrep(grepPattern);
}

// --- All available test files (path relative to this directory, without .test.ts) ---
const allTestFiles: Record<string, () => Promise<void>> = {
  'directory/basic': () => import('./directory/basic.test').then(() => {}),
  'directory/tree': () => import('./directory/tree.test').then(() => {}),
  'entries/character': () => import('./entries/character.test').then(() => {}),
  'entries/location': () => import('./entries/location.test').then(() => {}),
  'entries/organization': () => import('./entries/organization.test').then(() => {}),
  'entries/pc': () => import('./entries/pc.test').then(() => {}),
  'campaigns/campaign': () => import('./campaigns/campaign.test').then(() => {}),
  'sessions/session': () => import('./sessions/session.test').then(() => {}),
  'navigation/header': () => import('./navigation/header.test').then(() => {}),
  'components/editor': () => import('./components/editor.test').then(() => {}),
  'components/tags': () => import('./components/tags.test').then(() => {}),
  'components/typeahead': () => import('./components/typeahead.test').then(() => {}),
  'components/imagePicker': () => import('./components/imagePicker.test').then(() => {}),
  'components/relationshipTabs': () => import('./components/relationshipTabs.test').then(() => {}),
};

// Determine which files to load
const filesToLoad = fileFilters.length > 0
  ? fileFilters.filter(f => {
      if (!allTestFiles[f]) {
        console.error(`\x1b[31mUnknown test file: ${f}\x1b[0m`);
        console.error(`Available files: ${Object.keys(allTestFiles).join(', ')}`);
        return false;
      }
      return true;
    })
  : Object.keys(allTestFiles);

if (filesToLoad.length === 0) {
  console.error('\x1b[31mNo valid test files to run.\x1b[0m');
  process.exit(1);
}

// Dynamically import selected test files, then run
async function main() {
  for (const file of filesToLoad) {
    await allTestFiles[file]();
  }

  const passed = await runTests();

  // Collect coverage data from the browser
  await collectCoverage();

  // Final cleanup - disconnect browser
  if (sharedContext.context) {
    try {
      sharedContext.context.disconnect();
    } catch {
      // Ignore disconnect errors
    }
  }
  process.exit(passed ? 0 : 1);
}

main();
