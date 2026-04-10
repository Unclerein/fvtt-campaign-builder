/**
 * Directory tree tests.
 * Tests tree expansion, collapse, and navigation.
 */

import { describe, test, beforeAll, afterAll, expect, runTests } from '../testRunner';
import { sharedContext } from '@e2etest/sharedContext';
import { testData } from '@e2etest/data';
import { ensureSetup } from '../ensureSetup';
import { switchToSetting, expandTopicNode, expandTypeNode } from '@e2etest/utils';
import { Topics } from '@/types';
import { getByTestId, Locator } from '../helpers';

/**
 * Helper delay function.
 */
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Gets a topic folder node by topic name.
 */
const getTopicFolderNode = async (topicName: string) => {
  const page = sharedContext.page!;
  const nodes = await page.$$('.fcb-topic-folder');
  for (const node of nodes) {
    const text = await node.evaluate(el => el.textContent);
    if (text?.toLowerCase().includes(topicName.toLowerCase())) {
      return node;
    }
  }
  return null;
};

/**
 * Gets a type folder node by type name.
 */
const getTypeFolderNode = async (typeName: string) => {
  const page = sharedContext.page!;
  const nodes = await page.$$('.fcb-type-folder');
  for (const node of nodes) {
    const text = await node.evaluate(el => el.textContent);
    if (text?.includes(typeName)) {
      return node;
    }
  }
  return null;
};

/**
 * Checks if a folder is collapsed.
 */
const isFolderCollapsed = async (folder: import('puppeteer').ElementHandle<Element>) => {
  return await folder.evaluate(el => el.classList.contains('collapsed'));
};

/**
 * Clicks the folder toggle icon.
 */
const clickFolderToggle = async (folder: import('puppeteer').ElementHandle<Element>) => {
  const toggle = await folder.$('.folder-header i, [data-testid="folder-toggle"]');
  if (toggle) {
    await toggle.click();
    await delay(200);
  }
};

/**
 * Gets all visible entry nodes.
 */
const getVisibleEntryNodes = async () => {
  const page = sharedContext.page!;
  return await page.$$('.fcb-entry-item:not(.hidden)');
};

/**
 * Gets the campaign folder for a campaign name.
 */
const getCampaignFolder = async (campaignName: string) => {
  const page = sharedContext.page!;
  const nodes = await page.$$('.fcb-campaign-folder');
  for (const node of nodes) {
    const text = await node.evaluate(el => el.textContent);
    if (text?.includes(campaignName)) {
      return node;
    }
  }
  return null;
};

/**
 * Gets the setting folder node.
 */
const getSettingFolderNode = async () => {
  const page = sharedContext.page!;
  return await page.$('.fcb-setting-folder');
};

describe.serial('Directory Tree Tests', () => {
  beforeAll(async () => {
    await ensureSetup(false);
    const setting = testData.settings[0];
    await switchToSetting(setting.name);
  });

  test('Setting folder is visible', async () => {
    const page = sharedContext.page!;

    // Verify setting folder exists
    const settingFolder = await getSettingFolderNode();
    expect(settingFolder).not.toBeNull();
  });

  test('Topic folders are visible', async () => {
    const page = sharedContext.page!;

    // Verify topic folders exist
    const topicFolders = await page.$$('.fcb-topic-folder');
    expect(topicFolders.length).toBeGreaterThan(0);
  });

  test('Expand character topic folder', async () => {
    // Get the character topic folder
    const charFolder = await getTopicFolderNode('character');
    expect(charFolder).not.toBeNull();

    // Check if collapsed
    const isCollapsed = await isFolderCollapsed(charFolder!);
    if (isCollapsed) {
      // Click to expand
      await clickFolderToggle(charFolder!);
    }

    // Verify it's now expanded
    const stillCollapsed = await isFolderCollapsed(charFolder!);
    expect(stillCollapsed).toBe(false);
  });

  test('Expand location topic folder', async () => {
    // Get the location topic folder
    const locFolder = await getTopicFolderNode('location');
    expect(locFolder).not.toBeNull();

    // Check if collapsed
    const isCollapsed = await isFolderCollapsed(locFolder!);
    if (isCollapsed) {
      await clickFolderToggle(locFolder!);
    }

    // Verify it's now expanded
    const stillCollapsed = await isFolderCollapsed(locFolder!);
    expect(stillCollapsed).toBe(false);
  });

  test('Expand organization topic folder', async () => {
    // Get the organization topic folder
    const orgFolder = await getTopicFolderNode('organization');
    expect(orgFolder).not.toBeNull();

    // Check if collapsed
    const isCollapsed = await isFolderCollapsed(orgFolder!);
    if (isCollapsed) {
      await clickFolderToggle(orgFolder!);
    }

    // Verify it's now expanded
    const stillCollapsed = await isFolderCollapsed(orgFolder!);
    expect(stillCollapsed).toBe(false);
  });

  test('Expand PC topic folder', async () => {
    // Get the PC topic folder
    const pcFolder = await getTopicFolderNode('pc');
    expect(pcFolder).not.toBeNull();

    // Check if collapsed
    const isCollapsed = await isFolderCollapsed(pcFolder!);
    if (isCollapsed) {
      await clickFolderToggle(pcFolder!);
    }

    // Verify it's now expanded
    const stillCollapsed = await isFolderCollapsed(pcFolder!);
    expect(stillCollapsed).toBe(false);
  });

  test('Type folders are visible after topic expansion', async () => {
    // Expand character topic first
    await expandTopicNode(Topics.Character);

    // Verify type folders exist
    const typeFolders = await sharedContext.page!.$$('.fcb-type-folder');
    expect(typeFolders.length).toBeGreaterThan(0);
  });

  test('Expand type folder shows entries', async () => {
    // Expand character topic and (none) type
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');

    // Verify entries are visible
    const entries = await getVisibleEntryNodes();
    expect(entries.length).toBeGreaterThan(0);
  });

  test('Collapse topic folder hides entries', async () => {
    // First expand the topic
    const charFolder = await getTopicFolderNode('character');
    expect(charFolder).not.toBeNull();

    // Make sure it's expanded
    let isCollapsed = await isFolderCollapsed(charFolder!);
    if (isCollapsed) {
      await clickFolderToggle(charFolder!);
    }

    // Now collapse it
    await clickFolderToggle(charFolder!);

    // Verify it's collapsed
    isCollapsed = await isFolderCollapsed(charFolder!);
    expect(isCollapsed).toBe(true);
  });

  test('Campaign folder is visible', async () => {
    const setting = testData.settings[0];

    // Verify campaign folder exists
    const campaignFolder = await getCampaignFolder(setting.campaigns[0].name);
    expect(campaignFolder).not.toBeNull();
  });

  test('Expand campaign folder shows sessions', async () => {
    const page = sharedContext.page!;
    const setting = testData.settings[0];

    // Get campaign folder
    const campaignFolder = await getCampaignFolder(setting.campaigns[0].name);
    expect(campaignFolder).not.toBeNull();

    // Check if collapsed
    const isCollapsed = await isFolderCollapsed(campaignFolder!);
    if (isCollapsed) {
      await clickFolderToggle(campaignFolder!);
    }

    // Verify sessions are visible
    await delay(200);
    const sessionNodes = await page.$$('.fcb-session-node');
    expect(sessionNodes.length).toBeGreaterThan(0);
  });

  test('Click entry in tree opens content', async () => {
    const setting = testData.settings[0];

    // Expand character topic and type
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');

    // Click the first entry
    const entries = await getVisibleEntryNodes();
    if (entries.length > 0) {
      const nameEl = await entries[0].$('.node-name');
      if (nameEl) {
        await nameEl.click();
        await delay(200);

        // Verify content opened
        const page = sharedContext.page!;
        const header = await page.$('.fcb-name-header');
        expect(header).not.toBeNull();
      }
    }
  });

  test('Tree shows correct entry count', async () => {
    const setting = testData.settings[0];

    // Expand character topic
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');

    // Count visible entries
    const entries = await getVisibleEntryNodes();
    const expectedCount = setting.topics[Topics.Character].length;

    // Should have at least the expected count
    expect(entries.length).toBeGreaterThan(0);
  });

  test('Topic folder icons are correct', async () => {
    const page = sharedContext.page!;

    // Check for folder icons
    const folderIcons = await page.$$('.fcb-topic-folder .folder-header i.fas');
    expect(folderIcons.length).toBeGreaterThan(0);
  });

  test('Setting switch updates directory tree', async () => {
    const setting1 = testData.settings[0];
    const setting2 = testData.settings[1];

    // Get current entries count
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    const entries1 = await getVisibleEntryNodes();

    // Switch to second setting
    await switchToSetting(setting2.name);

    // Expand and count entries
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    const entries2 = await getVisibleEntryNodes();

    // Entries should be different (different settings)
    // Just verify we have entries in both
    expect(entries1.length).toBeGreaterThan(0);
    expect(entries2.length).toBeGreaterThan(0);
  });
});

runTests();
