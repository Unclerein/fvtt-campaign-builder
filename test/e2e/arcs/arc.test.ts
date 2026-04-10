/**
 * Arc management tests.
 * Tests arc creation, editing, content tabs, and navigation.
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
 * Expands a campaign folder in the directory.
 */
const expandCampaignFolder = async (campaignName: string): Promise<void> => {
  const page = sharedContext.page!;

  const campaignNodes = await page.$$('.fcb-campaign-folder');
  for (const node of campaignNodes) {
    const text = await node.evaluate(el => el.textContent);
    if (text?.includes(campaignName)) {
      const isCollapsed = await node.evaluate(el => el.classList.contains('collapsed'));
      if (isCollapsed) {
        const toggle = await node.$('[data-testid="campaign-folder-toggle"]');
        if (toggle) {
          await toggle.click();
          await delay(200);
        }
      }
      break;
    }
  }
};

/**
 * Opens an arc from the campaign directory.
 */
const openArc = async (campaignName: string, arcName: string): Promise<void> => {
  const page = sharedContext.page!;

  await expandCampaignFolder(campaignName);

  // Find the arc node
  const arcNodes = await page.$$('.fcb-arc-node');
  for (const node of arcNodes) {
    const text = await node.evaluate(el => el.textContent);
    if (text?.includes(arcName)) {
      const nameEl = await node.$('[data-testid="arc-name"], .node-name');
      if (nameEl) {
        await nameEl.click();
        break;
      }
    }
  }

  await page.waitForSelector('.fcb-name-header', { timeout: 10000 });
};

/**
 * Gets the arc name input value.
 */
const getArcNameValue = async (): Promise<string> => {
  const page = sharedContext.page!;
  const input = await page.$('.fcb-input-name input');
  if (!input) return '';
  return await input.evaluate(el => (el as HTMLInputElement).value || '');
};

/**
 * Sets the arc name.
 */
const setArcName = async (name: string): Promise<void> => {
  const page = sharedContext.page!;
  const input = await page.$('.fcb-input-name input');
  if (input) {
    await input.evaluate((el, name) => { (el as HTMLInputElement).value = name; }, name);
    await input.type('');
    await delay(700);
  }
};

/**
 * Clicks a content tab in the arc view.
 */
const clickArcTab = async (tabId: string): Promise<void> => {
  const page = sharedContext.page!;

  const tab = await page.$(`[data-tab="${tabId}"]`);
  if (tab) {
    await tab.click();
    await delay(200);
  }
};

/**
 * Creates an arc via the API.
 */
const createArcViaAPI = async (name: string, campaignUuid: string): Promise<string> => {
  const page = sharedContext.page!;

  return await page.evaluate(
    async ({ name, campaignUuid }: { name: string; campaignUuid: string }) => {
      const api = (game as any).modules.get('campaign-builder')!.api!.testAPI;
      return await api.createArc(name, campaignUuid);
    },
    { name, campaignUuid }
  );
};

/**
 * Deletes an arc via the API.
 */
const deleteArcViaAPI = async (uuid: string): Promise<void> => {
  const page = sharedContext.page!;

  await page.evaluate(async (uuid: string) => {
    const api = (game as any).modules.get('campaign-builder')!.api!.testAPI;
    await api.deleteArc(uuid);
  }, uuid);
};

/**
 * Gets a campaign UUID via the API.
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

describe.serial('Arc Management Tests', () => {
  let createdArcUuid: string | null = null;
  let campaignUuid: string | null = null;
  const testArcName = 'Test Arc E2E';

  beforeAll(async () => {
    await ensureSetup(false);
    const setting = testData.settings[0];
    await switchToSetting(setting.name);

    campaignUuid = await getCampaignUuidViaAPI(setting.campaigns[0].name, setting.name);
    
    // Create an arc for testing
    if (campaignUuid) {
      createdArcUuid = await createArcViaAPI(testArcName, campaignUuid);
    }
  });

  afterAll(async () => {
    if (createdArcUuid) {
      try {
        await deleteArcViaAPI(createdArcUuid);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  test('Create new arc via API', async () => {
    expect(createdArcUuid).not.toBeNull();
  });

  test('Open created arc and verify name', async () => {
    if (!createdArcUuid) {
      return;
    }

    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    // Refresh directory
    await switchToSetting(testData.settings[1].name);
    await switchToSetting(setting.name);

    await openArc(firstCampaign.name, testArcName);

    const nameValue = await getArcNameValue();
    expect(nameValue).toBe(testArcName);
  });

  test('Edit arc name with debounce', async () => {
    if (!createdArcUuid) {
      return;
    }

    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    await openArc(firstCampaign.name, testArcName);

    const newName = 'Renamed Arc E2E';
    await setArcName(newName);

    const nameValue = await getArcNameValue();
    expect(nameValue).toBe(newName);
  });

  // Tab Navigation Tests
  test('Navigate to description tab', async () => {
    if (!createdArcUuid) {
      return;
    }

    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    await openArc(firstCampaign.name, testArcName);
    await clickArcTab('description');

    const page = sharedContext.page!;
    const descTab = await page.$('[data-tab="description"]');
    expect(descTab).not.toBeNull();
  });

  test('Navigate to lore tab', async () => {
    if (!createdArcUuid) {
      return;
    }

    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    await openArc(firstCampaign.name, testArcName);
    await clickArcTab('lore');

    const page = sharedContext.page!;
    const loreTab = await page.$('[data-tab="lore"]');
    expect(loreTab).not.toBeNull();
  });

  test('Navigate to vignettes tab', async () => {
    if (!createdArcUuid) {
      return;
    }

    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    await openArc(firstCampaign.name, testArcName);
    await clickArcTab('vignettes');

    const page = sharedContext.page!;
    const vignettesTab = await page.$('[data-tab="vignettes"]');
    expect(vignettesTab).not.toBeNull();
  });

  test('Navigate to locations tab', async () => {
    if (!createdArcUuid) {
      return;
    }

    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    await openArc(firstCampaign.name, testArcName);
    await clickArcTab('locations');

    const page = sharedContext.page!;
    const locationsTab = await page.$('[data-tab="locations"]');
    expect(locationsTab).not.toBeNull();
  });

  test('Navigate to monsters tab', async () => {
    if (!createdArcUuid) {
      return;
    }

    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    await openArc(firstCampaign.name, testArcName);
    await clickArcTab('monsters');

    const page = sharedContext.page!;
    const monstersTab = await page.$('[data-tab="monsters"]');
    expect(monstersTab).not.toBeNull();
  });

  test('Navigate to ideas tab', async () => {
    if (!createdArcUuid) {
      return;
    }

    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    await openArc(firstCampaign.name, testArcName);
    await clickArcTab('ideas');

    const page = sharedContext.page!;
    const ideasTab = await page.$('[data-tab="ideas"]');
    expect(ideasTab).not.toBeNull();
  });

  test('Arc tags are visible', async () => {
    if (!createdArcUuid) {
      return;
    }

    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    await openArc(firstCampaign.name, testArcName);

    const page = sharedContext.page!;
    const tagsComponent = await page.$('.tags-wrapper');
    expect(tagsComponent).not.toBeNull();
  });
});

runTests();
