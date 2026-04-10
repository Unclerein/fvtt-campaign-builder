import { sharedContext } from './sharedContext';
import { launchBrowser, navigateToGame, resetWorld, openCampaignBuilder, closeCampaignBuilder } from '../agent';
import { testData } from './data';
import { populateSetting } from './setup';

let setupComplete = false;
let dataPopulated = false;
let setupPromise: Promise<void> | null = null;

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
 * @param rebuild - If true, always reset world and repopulate data (used by test:rebuild)
 */
export async function ensureSetup(rebuild = false) {
  console.log(`[ensureSetup] Called with rebuild=${rebuild}, setupComplete=${setupComplete}`);
  
  // Skip only if already complete AND not a rebuild request
  if (!rebuild && setupComplete && sharedContext.page && sharedContext.context) {
    console.log('[ensureSetup] Setup already complete, skipping...');
    return;
  }
  
  // If setup is in progress, wait for it to complete
  if (setupPromise) {
    console.log('[ensureSetup] Setup in progress, waiting...');
    await setupPromise;
    return;
  }
  
  console.log('[ensureSetup] Running setup...');
  
  // Create the promise and store it for other callers to await
  setupPromise = (async () => {
    // Use agent infrastructure to connect/navigate
    const { browser, page } = await launchBrowser({ refresh: false });
    
    sharedContext.context = browser;
    sharedContext.page = page;
    
    // Navigate to game (handles login, world selection, etc.)
    await navigateToGame(page);
    
    // Determine if we need to reset and populate data
    // rebuild=true: always reset and repopulate (used by test:rebuild)
    // rebuild=false: only populate if data doesn't exist
    const dataExists = await testDataExists();
    const needsData = rebuild || (!dataPopulated && !dataExists);
    console.log(`[ensureSetup] dataExists=${dataExists}, dataPopulated=${dataPopulated}, needsData=${needsData}`);
    
    if (needsData) {
      console.log('[ensureSetup] Resetting world...');
      await resetWorld(page);
      console.log('[ensureSetup] World reset complete, waiting for stabilization...');

      // Wait for page to stabilize after reset (may trigger Foundry reload)
      await page.waitForSelector('#game', { timeout: 10000 }).catch(() => {
        console.log('[ensureSetup] waitForSelector #game timed out (expected if page reloaded)');
      });
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('[ensureSetup] Stabilization wait complete');
    }
    
    // Open the Campaign Builder window
    console.log('[ensureSetup] Opening Campaign Builder...');
    await openCampaignBuilder(page);
    console.log('[ensureSetup] Campaign Builder opened');
    
    // Populate test data only if needed
    if (needsData) {
      console.log(`[ensureSetup] Populating ${testData.settings.length} settings...`);
      for (let i = 0; i < testData.settings.length; i++) {
        console.log(`[ensureSetup] Populating setting ${i + 1}: ${testData.settings[i].name}`);
        await populateSetting(testData.settings[i]);
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
  })();
  
  // Wait for the setup to complete
  await setupPromise;
}

/**
 * Checks if setup has been completed
 */
export function isSetupComplete(): boolean {
  return setupComplete;
}
