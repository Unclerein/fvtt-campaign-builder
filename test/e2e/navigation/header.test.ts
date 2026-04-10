/**
 * Header navigation E2E tests.
 * Tests tab operations: switching, closing, bookmarks,
 * and tab management in the application header.
 */

import { describe, test, beforeAll, afterAll, expect, runTests } from '../testRunner';
import { sharedContext } from '@e2etest/sharedContext';
import { testData } from '@e2etest/data';
import { ensureSetup } from '../ensureSetup';
import { switchToSetting, expandTopicNode, expandTypeNode } from '@e2etest/utils';
import { Topics } from '@/types';
import { getByTestId, Locator } from '../helpers';
import { openEntry, closeActiveTab } from '@e2etest/utils';

/**
 * Helper delay function.
 */
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Gets the active tab element.
 */
const getActiveTab = async () => {
  const page = sharedContext.page!;
  return await page.$('.fcb-tab.active');
};

/**
 * Gets all tabs in the header.
 */
const getAllTabs = async () => {
  const page = sharedContext.page!;
  return await page.$$('.fcb-tab');
};

/**
 * Clicks a tab by name.
 */
const clickTabByName = async (tabName: string): Promise<void> => {
  const page = sharedContext.page!;

  const tabs = await getAllTabs();
  for (const tab of tabs) {
    const text = await tab.evaluate(el => el.textContent);
    if (text?.includes(tabName)) {
      await tab.click();
      await delay(100);
      break;
    }
  }
};

/**
 * Gets the bookmark button for a tab.
 */
const getBookmarkButton = async (tabName: string) => {
  const page = sharedContext.page!;

  const tabs = await getAllTabs();
  for (const tab of tabs) {
    const text = await tab.evaluate(el => el.textContent);
    if (text?.includes(tabName)) {
      return await tab.$('[data-testid="bookmark-button"], .bookmark-button');
    }
  }
  return null;
};

/**
 * Gets all bookmarks in the bookmark bar.
 */
const getAllBookmarks = async () => {
  const page = sharedContext.page!;
  return await page.$$('.fcb-bookmark');
};

/**
 * Clicks the close button on a tab by name.
 */
const closeTabByName = async (tabName: string): Promise<void> => {
  const page = sharedContext.page!;

  const tabs = await getAllTabs();
  for (const tab of tabs) {
    const text = await tab.evaluate(el => el.textContent);
    if (text?.includes(tabName)) {
      const closeBtn = await tab.$('[data-testid="tab-close-button"], .tab-close-button');
      if (closeBtn) {
        await closeBtn.click();
        await delay(100);
      }
      break;
    }
  }
};

/**
 * Gets the forward navigation button.
 */
const getForwardButton = async () => {
  const page = sharedContext.page!;
  return await page.$('[data-testid="nav-forward-button"], .nav-forward-button');
};

/**
 * Gets the back navigation button.
 */
const getBackButton = async () => {
  const page = sharedContext.page!;
  return await page.$('[data-testid="nav-back-button"], .nav-back-button');
};

/**
 * Header Navigation Tests
 * Verifies tab switching, closing, and bookmark functionality.
 */
describe.serial('Header Navigation Tests', () => {
  beforeAll(async () => {
    await ensureSetup(false);
    const setting = testData.settings[0];
    await switchToSetting(setting.name);
  });

  test('Open entry creates new tab', async () => {
    const setting = testData.settings[0];

    // Open a character entry
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    const firstChar = setting.topics[Topics.Character][0];
    await openEntry(Topics.Character, firstChar.name);

    // Verify tab was created
    const tabs = await getAllTabs();
    expect(tabs.length).toBeGreaterThan(0);

    // Verify active tab shows the entry name
    const activeTab = await getActiveTab();
    expect(activeTab).not.toBeNull();
    const activeText = await activeTab!.evaluate(el => el.textContent);
    expect(activeText?.includes(firstChar.name)).toBe(true);
  });

  test('Open second entry creates additional tab', async () => {
    const setting = testData.settings[0];

    // Open another character entry
    const secondChar = setting.topics[Topics.Character][1];
    await openEntry(Topics.Character, secondChar.name);

    // Verify additional tab was created
    const tabs = await getAllTabs();
    expect(tabs.length).toBeGreaterThan(1);

    // Verify active tab shows the new entry
    const activeTab = await getActiveTab();
    const activeText = await activeTab!.evaluate(el => el.textContent);
    expect(activeText?.includes(secondChar.name)).toBe(true);
  });

  /**
   * What it tests: Switching between open tabs in the header.
   * Expected behavior: Active tab changes when clicking a different tab.
   */
  test('Switch between open tabs', async () => {
    const setting = testData.settings[0];
    const firstChar = setting.topics[Topics.Character][0];

    // Click on the first tab
    await clickTabByName(firstChar.name);

    // Verify the tab is now active
    const activeTab = await getActiveTab();
    const activeText = await activeTab!.evaluate(el => el.textContent);
    expect(activeText?.includes(firstChar.name)).toBe(true);
  });

  /**
   * What it tests: Closing a tab removes it from the header.
   * Expected behavior: Tab is removed from the header after closing.
   */
  test('Close tab removes it from header', async () => {
    const setting = testData.settings[0];
    const secondChar = setting.topics[Topics.Character][1];

    // Get current tab count
    const tabsBefore = await getAllTabs();
    const countBefore = tabsBefore.length;

    // Close the second character's tab
    await closeTabByName(secondChar.name);

    // Verify tab was removed
    const tabsAfter = await getAllTabs();
    expect(tabsAfter.length).toBe(countBefore - 1);
  });

  /**
   * What it tests: Opening a location entry creates a new tab.
   * Expected behavior: New tab is visible in the header.
   */
  test('Open location entry creates new tab', async () => {
    const setting = testData.settings[0];

    // Open a location entry
    await expandTopicNode(Topics.Location);
    await expandTypeNode(Topics.Location, '(none)');
    const firstLoc = setting.topics[Topics.Location][0];
    await openEntry(Topics.Location, firstLoc.name);

    // Verify tab was created
    const tabs = await getAllTabs();
    expect(tabs.length).toBeGreaterThan(0);
  });

  /**
   * What it tests: Tab close button is visible.
   * Expected behavior: Close button is visible on the active tab.
   */
  test('Tab close button is visible', async () => {
    const setting = testData.settings[0];
    const firstLoc = setting.topics[Topics.Location][0];

    // Make sure we have a tab open
    const tabs = await getAllTabs();
    expect(tabs.length).toBeGreaterThan(0);

    // Verify close button exists on active tab
    const activeTab = await getActiveTab();
    const closeBtn = await activeTab!.$('[data-testid="tab-close-button"], .tab-close-button');
    expect(closeBtn).not.toBeNull();
  });

  /**
   * What it tests: Multiple tabs can be open simultaneously.
   * Expected behavior: Opening multiple entries creates multiple tabs.
   */
  test('Multiple tabs can be open', async () => {
    const setting = testData.settings[0];

    // Open multiple entries
    await expandTopicNode(Topics.Organization);
    await expandTypeNode(Topics.Organization, '(none)');
    const firstOrg = setting.topics[Topics.Organization][0];
    await openEntry(Topics.Organization, firstOrg.name);

    // Verify we have multiple tabs
    const tabs = await getAllTabs();
    expect(tabs.length).toBeGreaterThan(1);
  });

  test('Tab shows correct icon for entry type', async () => {
    const page = sharedContext.page!;
    const setting = testData.settings[0];

    // Open a character entry
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    const firstChar = setting.topics[Topics.Character][0];
    await openEntry(Topics.Character, firstChar.name);

    // Verify tab has an icon
    const activeTab = await getActiveTab();
    const icon = await activeTab!.$('i.fas, i.far');
    expect(icon).not.toBeNull();
  });

  test('Switch between tabs preserves content', async () => {
    const setting = testData.settings[0];

    // Open two entries
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    const firstChar = setting.topics[Topics.Character][0];
    await openEntry(Topics.Character, firstChar.name);

    await expandTopicNode(Topics.Location);
    await expandTypeNode(Topics.Location, '(none)');
    const firstLoc = setting.topics[Topics.Location][0];
    await openEntry(Topics.Location, firstLoc.name);

    // Switch back to character tab
    await clickTabByName(firstChar.name);

    // Verify character content is shown
    const page = sharedContext.page!;
    const nameInput = await page.$('[data-testid="entry-name-input"]');
    expect(nameInput).not.toBeNull();
    const nameValue = await nameInput!.evaluate(el => (el as HTMLInputElement).value);
    expect(nameValue).toBe(firstChar.name);
  });
});

// Note: runTests() is called by the main runner (all.test.ts)
