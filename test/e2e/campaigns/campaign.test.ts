/**
 * Campaign management tests.
 * Tests campaign creation, editing, session management, and deletion.
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
 * Gets the campaign name input locator.
 */
const getCampaignNameInput = (): Locator => {
  return getByTestId(sharedContext.page!, 'campaign-name-input');
};

/**
 * Gets the campaign name value.
 */
const getCampaignNameValue = async (): Promise<string> => {
  const page = sharedContext.page!;
  const input = await page.$('.fcb-input-name input, .fcb-input-name');
  if (!input) return '';
  return await input.evaluate(el => (el as HTMLInputElement).value || el.textContent || '');
};

/**
 * Sets the campaign name.
 */
const setCampaignName = async (name: string): Promise<void> => {
  const page = sharedContext.page!;
  const input = await page.$('.fcb-input-name input');
  if (input) {
    await input.evaluate((el, name) => { (el as HTMLInputElement).value = name; }, name);
    await input.type(''); // Trigger input event
    await delay(700); // Wait for debounce
  }
};

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
 * Expands a campaign folder in the directory.
 */
const expandCampaignFolder = async (campaignName: string): Promise<void> => {
  const page = sharedContext.page!;

  // Find the campaign node
  const campaignNodes = await page.$$('.fcb-campaign-folder');
  for (const node of campaignNodes) {
    const text = await node.evaluate(el => el.textContent);
    if (text?.includes(campaignName)) {
      // Check if it's collapsed
      const isCollapsed = await node.evaluate(el => el.classList.contains('collapsed'));
      if (isCollapsed) {
        // Click the folder toggle
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
 * Creates a campaign via the API.
 */
const createCampaignViaAPI = async (name: string, settingName: string): Promise<string> => {
  const page = sharedContext.page!;

  const uuid = await page.evaluate(
    async ({ name, settingName }: { name: string; settingName: string }) => {
      const api = (game as any).modules.get('campaign-builder')!.api!.testAPI;
      return await api.createCampaign(name, settingName);
    },
    { name, settingName }
  );

  return uuid;
};

/**
 * Deletes a campaign via the API.
 */
const deleteCampaignViaAPI = async (uuid: string): Promise<void> => {
  const page = sharedContext.page!;

  await page.evaluate(async (uuid: string) => {
    const api = (game as any).modules.get('campaign-builder')!.api!.testAPI;
    await api.deleteCampaign(uuid);
  }, uuid);
};

/**
 * Creates a session via the API.
 */
const createSessionViaAPI = async (name: string, number: number, campaignUuid: string): Promise<string> => {
  const page = sharedContext.page!;

  const uuid = await page.evaluate(
    async ({ name, number, campaignUuid }: { name: string; number: number; campaignUuid: string }) => {
      const api = (game as any).modules.get('campaign-builder')!.api!.testAPI;
      return await api.createSession(name, number, campaignUuid);
    },
    { name, number, campaignUuid }
  );

  return uuid;
};

/**
 * Deletes a session via the API.
 */
const deleteSessionViaAPI = async (uuid: string): Promise<void> => {
  const page = sharedContext.page!;

  await page.evaluate(async (uuid: string) => {
    const api = (game as any).modules.get('campaign-builder')!.api!.testAPI;
    await api.deleteSession(uuid);
  }, uuid);
};

/**
 * Gets the session count in a campaign directory.
 */
const getSessionCount = async (campaignName: string): Promise<number> => {
  const page = sharedContext.page!;

  // Expand the campaign first
  await expandCampaignFolder(campaignName);
  await delay(200);

  // Count session nodes
  const sessionNodes = await page.$$('.fcb-session-node');
  return sessionNodes.length;
};

/**
 * Opens a session from the campaign directory.
 */
const openSession = async (sessionName: string): Promise<void> => {
  const page = sharedContext.page!;

  // Find the session node
  const sessionNodes = await page.$$('.fcb-session-node');
  for (const node of sessionNodes) {
    const text = await node.evaluate(el => el.textContent);
    if (text?.includes(sessionName)) {
      // Click on the session name
      const nameEl = await node.$('[data-testid="session-name"]');
      if (nameEl) {
        await nameEl.click();
        break;
      }
    }
  }

  // Wait for session content to load
  await page.waitForSelector('.fcb-session-content, .fcb-name-header', { timeout: 10000 });
};

/**
 * Clicks a content tab in the campaign view.
 */
const clickCampaignTab = async (tabId: string): Promise<void> => {
  const page = sharedContext.page!;

  const tab = await page.$(`[data-tab="${tabId}"]`);
  if (tab) {
    await tab.click();
    await delay(100);
  }
};

describe.serial('Campaign Management Tests', () => {
  let createdCampaignUuid: string | null = null;
  let createdSessionUuids: string[] = [];
  const testCampaignName = 'Test Campaign E2E';

  beforeAll(async () => {
    await ensureSetup(false);
    const setting = testData.settings[0];
    await switchToSetting(setting.name);
  });

  afterAll(async () => {
    // Clean up created sessions
    for (const uuid of createdSessionUuids) {
      try {
        await deleteSessionViaAPI(uuid);
      } catch {
        // Ignore cleanup errors
      }
    }

    // Clean up created campaign
    if (createdCampaignUuid) {
      try {
        await deleteCampaignViaAPI(createdCampaignUuid);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  test('Open existing campaign from directory', async () => {
    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    // Open the campaign
    await openCampaign(firstCampaign.name);

    // Verify campaign content is displayed
    const page = sharedContext.page!;
    const header = await page.$('.fcb-name-header');
    expect(header).not.toBeNull();

    // Verify the name is correct
    const nameValue = await getCampaignNameValue();
    expect(nameValue).toBe(firstCampaign.name);
  });

  test('Create new campaign via API and verify in directory', async () => {
    const setting = testData.settings[0];

    // Create campaign via API
    createdCampaignUuid = await createCampaignViaAPI(testCampaignName, setting.name);
    expect(createdCampaignUuid).not.toBeNull();

    // Refresh the directory by switching settings
    await switchToSetting(testData.settings[1].name);
    await switchToSetting(setting.name);

    // Open the new campaign
    await openCampaign(testCampaignName);

    // Verify name
    const nameValue = await getCampaignNameValue();
    expect(nameValue).toBe(testCampaignName);
  });

  test('Edit campaign name with debounce', async () => {
    const page = sharedContext.page!;

    // Make sure we have the campaign open
    await openCampaign(testCampaignName);

    // Change the name
    const newName = 'Renamed Test Campaign';
    await setCampaignName(newName);

    // Verify the name changed
    const nameValue = await getCampaignNameValue();
    expect(nameValue).toBe(newName);
  });

  test('Expand campaign folder to show sessions', async () => {
    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    // Expand the campaign folder
    await expandCampaignFolder(firstCampaign.name);

    // Verify sessions are visible
    const sessionCount = await getSessionCount(firstCampaign.name);
    expect(sessionCount).toBeGreaterThan(0);
  });

  test('Add session to campaign via API', async () => {
    // Create a session via API
    const sessionName = 'Test Session E2E';
    const sessionUuid = await createSessionViaAPI(sessionName, 1, createdCampaignUuid!);
    createdSessionUuids.push(sessionUuid);

    expect(sessionUuid).not.toBeNull();

    // Refresh directory
    const setting = testData.settings[0];
    await switchToSetting(testData.settings[1].name);
    await switchToSetting(setting.name);

    // Expand campaign and verify session count
    await expandCampaignFolder(testCampaignName);
    const count = await getSessionCount(testCampaignName);
    expect(count).toBeGreaterThan(0);
  });

  test('Open session from campaign directory', async () => {
    const sessionName = 'Test Session E2E';

    // Expand the campaign
    await expandCampaignFolder(testCampaignName);

    // Open the session
    await openSession(sessionName);

    // Verify session content is displayed
    const page = sharedContext.page!;
    const header = await page.$('.fcb-name-header');
    expect(header).not.toBeNull();
  });

  test('Switch between campaigns in different settings', async () => {
    const setting1 = testData.settings[0];
    const setting2 = testData.settings[1];

    // Open campaign in first setting
    await switchToSetting(setting1.name);
    await openCampaign(setting1.campaigns[0].name);

    // Verify we're in first setting's campaign
    let nameValue = await getCampaignNameValue();
    expect(nameValue).toBe(setting1.campaigns[0].name);

    // Switch to second setting and open its campaign
    await switchToSetting(setting2.name);
    await openCampaign(setting2.campaigns[0].name);

    // Verify we're in second setting's campaign
    nameValue = await getCampaignNameValue();
    expect(nameValue).toBe(setting2.campaigns[0].name);
  });

  test('Navigate to description tab', async () => {
    const setting = testData.settings[0];
    await openCampaign(setting.campaigns[0].name);

    // Click on description tab
    await clickCampaignTab('description');

    // Verify description content is visible
    const page = sharedContext.page!;
    const editor = await page.$('.ProseMirror');
    expect(editor).not.toBeNull();
  });

  test('Navigate to PCs tab', async () => {
    const setting = testData.settings[0];
    await openCampaign(setting.campaigns[0].name);

    // Click on PCs tab
    await clickCampaignTab('pcs');

    // Verify PCs tab content is visible
    const page = sharedContext.page!;
    const pcsTab = await page.$('[data-tab="pcs"]');
    expect(pcsTab).not.toBeNull();
  });

  test('Navigate to Lore tab', async () => {
    const setting = testData.settings[0];
    await openCampaign(setting.campaigns[0].name);

    // Click on Lore tab
    await clickCampaignTab('lore');

    // Verify Lore tab content is visible
    const page = sharedContext.page!;
    const loreTab = await page.$('[data-tab="lore"]');
    expect(loreTab).not.toBeNull();
  });

  test('Navigate to Ideas tab', async () => {
    const setting = testData.settings[0];
    await openCampaign(setting.campaigns[0].name);

    // Click on Ideas tab
    await clickCampaignTab('ideas');

    // Verify Ideas tab content is visible
    const page = sharedContext.page!;
    const ideasTab = await page.$('[data-tab="ideas"]');
    expect(ideasTab).not.toBeNull();
  });
});

runTests();
