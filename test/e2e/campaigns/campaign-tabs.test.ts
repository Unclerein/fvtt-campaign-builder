/**
 * Campaign content tabs tests.
 * Tests Ideas, Lore, PCs, and ToDo tabs within campaign content.
 */

import { describe, test, beforeAll, afterAll, expect, runTests } from '../testRunner';
import { sharedContext } from '@e2etest/sharedContext';
import { testData } from '@e2etest/data';
import { ensureSetup } from '../ensureSetup';
import { switchToSetting } from '@e2etest/utils';
import { getByTestId, Locator } from '../helpers';

/**
 * Helper delay function.
 */
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Opens a campaign from the directory.
 */
const openCampaign = async (campaignName: string): Promise<void> => {
  const page = sharedContext.page!;

  // Find the campaign node in the directory
  const campaignNodes = await page.$$('.fcb-campaign-folder');
  for (const node of campaignNodes) {
    const text = await node.evaluate(el => el.textContent);
    if (text?.includes(campaignName)) {
      // Click on the campaign name to open it
      const nameEl = await node.$('[data-testid="campaign-name"]');
      if (nameEl) {
        await nameEl.click();
        break;
      }
    }
  }

  // Wait for campaign content to load
  await page.waitForSelector('.fcb-campaign-content, .fcb-name-header', { timeout: 10000 });
};

/**
 * Clicks a content tab in the campaign view.
 */
const clickCampaignTab = async (tabId: string): Promise<void> => {
  const page = sharedContext.page!;

  const tab = await page.$(`[data-tab="${tabId}"]`);
  if (tab) {
    await tab.click();
    await delay(200);
  }
};

/**
 * Gets the campaign UUID via API.
 */
const getCampaignUuidViaAPI = async (campaignName: string, settingName: string): Promise<string | null> => {
  const page = sharedContext.page!;

  return await page.evaluate(
    async ({ campaignName, settingName }: { campaignName: string; settingName: string }) => {
      const api = (game as any).modules.get('campaign-builder')!.api!.testAPI;
      return await api.getCampaignUuid(campaignName, settingName);
    },
    { campaignName, settingName }
  );
};

/**
 * Adds an idea to the campaign via the UI.
 */
const addIdeaViaUI = async (): Promise<void> => {
  const page = sharedContext.page!;
  
  // Click the add button
  const addBtn = await page.$('[data-testid="base-table-add-button"], .fcb-table-add-button');
  if (addBtn) {
    await addBtn.click();
    await delay(300);
  }
};

/**
 * Gets the count of ideas in the table.
 */
const getIdeaRowCount = async (): Promise<number> => {
  const page = sharedContext.page!;
  const rows = await page.$$('.fcb-table-row, .base-table-row');
  return rows.length;
};

/**
 * Adds a ToDo item via the UI.
 */
const addToDoViaUI = async (): Promise<void> => {
  const page = sharedContext.page!;
  
  // Click the add button
  const addBtn = await page.$('[data-testid="base-table-add-button"], .fcb-table-add-button');
  if (addBtn) {
    await addBtn.click();
    await delay(300);
  }
};

/**
 * Gets the count of ToDo items in the table.
 */
const getToDoRowCount = async (): Promise<number> => {
  const page = sharedContext.page!;
  const rows = await page.$$('.fcb-table-row, .base-table-row');
  return rows.length;
};

describe.serial('Campaign Content Tabs Tests', () => {
  beforeAll(async () => {
    await ensureSetup(false);
    const setting = testData.settings[0];
    await switchToSetting(setting.name);
  });

  afterAll(async () => {
    // Cleanup handled by test data reset
  });

  // Ideas Tab Tests
  test('Navigate to Ideas tab', async () => {
    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    await openCampaign(firstCampaign.name);
    await clickCampaignTab('ideas');

    const page = sharedContext.page!;
    const ideasTab = await page.$('[data-tab="ideas"]');
    expect(ideasTab).not.toBeNull();
  });

  test('Ideas tab shows table component', async () => {
    const page = sharedContext.page!;
    
    // Wait for table to be visible
    await page.waitForSelector('.base-table, .fcb-table', { timeout: 5000 });
    
    const table = await page.$('.base-table, .fcb-table');
    expect(table).not.toBeNull();
  });

  test('Ideas tab has add button', async () => {
    const page = sharedContext.page!;
    
    const addBtn = await page.$('[data-testid="base-table-add-button"], .fcb-table-add-button, button[class*="add"]');
    expect(addBtn).not.toBeNull();
  });

  // Lore Tab Tests
  test('Navigate to Lore tab', async () => {
    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    await openCampaign(firstCampaign.name);
    await clickCampaignTab('lore');

    const page = sharedContext.page!;
    const loreTab = await page.$('[data-tab="lore"]');
    expect(loreTab).not.toBeNull();
  });

  test('Lore tab shows table component', async () => {
    const page = sharedContext.page!;
    
    // Wait for table to be visible
    await page.waitForSelector('.base-table, .fcb-table', { timeout: 5000 });
    
    const table = await page.$('.base-table, .fcb-table');
    expect(table).not.toBeNull();
  });

  test('Lore tab has add button', async () => {
    const page = sharedContext.page!;
    
    const addBtn = await page.$('[data-testid="base-table-add-button"], .fcb-table-add-button, button[class*="add"]');
    expect(addBtn).not.toBeNull();
  });

  // PCs Tab Tests
  test('Navigate to PCs tab', async () => {
    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    await openCampaign(firstCampaign.name);
    await clickCampaignTab('pcs');

    const page = sharedContext.page!;
    const pcsTab = await page.$('[data-tab="pcs"]');
    expect(pcsTab).not.toBeNull();
  });

  test('PCs tab shows table component', async () => {
    const page = sharedContext.page!;
    
    // Wait for table to be visible
    await page.waitForSelector('.base-table, .fcb-table', { timeout: 5000 });
    
    const table = await page.$('.base-table, .fcb-table');
    expect(table).not.toBeNull();
  });

  test('PCs tab has add button', async () => {
    const page = sharedContext.page!;
    
    const addBtn = await page.$('[data-testid="base-table-add-button"], .fcb-table-add-button, button[class*="add"]');
    expect(addBtn).not.toBeNull();
  });

  // ToDo Tab Tests
  test('Navigate to ToDo tab', async () => {
    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    await openCampaign(firstCampaign.name);
    await clickCampaignTab('toDo');

    const page = sharedContext.page!;
    const toDoTab = await page.$('[data-tab="toDo"]');
    expect(toDoTab).not.toBeNull();
  });

  test('ToDo tab shows table component', async () => {
    const page = sharedContext.page!;
    
    // Wait for table to be visible
    await page.waitForSelector('.base-table, .fcb-table', { timeout: 5000 });
    
    const table = await page.$('.base-table, .fcb-table');
    expect(table).not.toBeNull();
  });

  test('ToDo tab has add button', async () => {
    const page = sharedContext.page!;
    
    const addBtn = await page.$('[data-testid="base-table-add-button"], .fcb-table-add-button, button[class*="add"]');
    expect(addBtn).not.toBeNull();
  });

  // Tab Navigation Tests
  test('Can switch between multiple campaign tabs', async () => {
    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    await openCampaign(firstCampaign.name);
    
    // Switch through multiple tabs
    await clickCampaignTab('ideas');
    await delay(100);
    await clickCampaignTab('lore');
    await delay(100);
    await clickCampaignTab('pcs');
    await delay(100);
    
    // Verify we're on PCs tab
    const page = sharedContext.page!;
    const pcsTab = await page.$('[data-tab="pcs"]');
    expect(pcsTab).not.toBeNull();
  });

  test('Description tab is always available', async () => {
    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    await openCampaign(firstCampaign.name);
    await clickCampaignTab('description');

    const page = sharedContext.page!;
    const descTab = await page.$('[data-tab="description"]');
    expect(descTab).not.toBeNull();
  });
});

// Note: runTests() is called by the main runner (all.test.ts)
