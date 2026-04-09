import { sharedContext } from './sharedContext';
import { launchBrowser, navigateToGame, resetWorld, openCampaignBuilder, closeCampaignBuilder } from '../agent';
import { testData } from './data';
import { populateSetting } from './setup';

let setupComplete = false;
let dataPopulated = false;

/**
 * Checks if test data already exists in the world
 */
async function testDataExists(): Promise<boolean> {
  const page = sharedContext.page;
  if (!page) return false;

  const settingNames = testData.settings.map(s => s.name);
  const existingSettings = await page.evaluate((names: string[]) => {
    const module = game?.modules?.get('campaign-builder') as { api?: { testAPI?: { getSettingNames: () => string[] } } } | undefined;
    const allNames = module?.api?.testAPI?.getSettingNames() || [];
    return names.every(n => allNames.includes(n));
  }, settingNames);

  return existingSettings;
}

/**
 * Ensures that the global setup (browser connection, initialize, open) has been run.
 * Call this in beforeAll of each test file. It will only run once per test session.
 * 
 * Uses the agent infrastructure for browser connection and Foundry navigation.
 */
export async function ensureSetup(rebuild = false) {
  if (setupComplete && sharedContext.page && sharedContext.context) {
    console.log('Setup already complete, skipping...');
    return;
  }
  
  console.log('Running setup...');
  
  // Use agent infrastructure to connect/navigate
  const { browser, page } = await launchBrowser({ refresh: false });
  
  sharedContext.context = browser;
  sharedContext.page = page;
  
  // Navigate to game (handles login, world selection, etc.)
  await navigateToGame(page);
  
  // Only reset and populate if data doesn't already exist
  const needsData = rebuild && !dataPopulated && !(await testDataExists());
  
  if (needsData) {
    console.log('Resetting world and populating test data...');
    await resetWorld(page);
  }
  
  // Open the Campaign Builder window
  await openCampaignBuilder(page);
  
  // Populate test data only if needed
  if (needsData) {
    for (const setting of testData.settings) {
      await populateSetting(setting);
    }
    // Close and reopen to refresh the UI with new data
    console.log('Closing Campaign Builder...');
    await closeCampaignBuilder(page);
    console.log('Reopening Campaign Builder...');
    await openCampaignBuilder(page);
    console.log('Campaign Builder reopened');
    dataPopulated = true;
  }
  
  setupComplete = true;
  console.log('Setup complete!');
}

/**
 * Checks if setup has been completed
 */
export function isSetupComplete(): boolean {
  return setupComplete;
}
