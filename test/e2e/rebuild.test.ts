// resets the world and then repopulates with the setup test data

import { sharedContext } from './sharedContext';
import { launchBrowser, navigateToGame, resetWorld, openCampaignBuilder, closeCampaignBuilder } from './utils';
import { testData } from './data';
import { populateSetting } from './setup';
import { ensureSetup } from './ensureSetup';

async function main() {
  console.log('[rebuild] Starting...');

  // Connect to browser
  const { browser, page } = await launchBrowser({ refresh: false });
  sharedContext.context = browser;
  sharedContext.page = page;

  // Navigate to game
  console.log('[rebuild] Navigating to game...');
  await navigateToGame(page);

  // Reset the world
  console.log('[rebuild] Resetting world...');
  try {
    await resetWorld(page);
  } catch (error) {
    console.log('[rebuild] Reset error (may be expected):', error);
  }

  // Wait for stabilization - reload page to ensure clean state
  console.log('[rebuild] Reloading page...');
  await page.reload({ waitUntil: 'networkidle2' }).catch(() => {});
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Populate test data
	await ensureSetup(false);

  console.log('[rebuild] Done!');

  // Close the browser so the process can exit
  await browser.close();
}

main().catch(console.error);
