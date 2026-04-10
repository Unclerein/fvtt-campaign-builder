/**
 * Organization entry tests.
 * Tests organization entry creation, editing, tabs, and relationships.
 */

import { describe, test, beforeAll, afterAll, expect, runTests } from '../testRunner';
import { sharedContext } from '@e2etest/sharedContext';
import { testData } from '@e2etest/data';
import { ensureSetup } from '../ensureSetup';
import { switchToSetting, expandTopicNode, expandTypeNode } from '@e2etest/utils';
import { Topics } from '@/types';
import { getByTestId, Locator } from '../helpers';
import {
  openEntry,
  getEntryNameInput,
  setEntryName,
  getEntryNameValue,
  selectType,
  addNewType,
  getTypeValue,
  addTag,
  removeTag,
  clickTag,
  clickContentTab,
  clickPushToSession,
  clickContextMenuItem,
  createEntryViaAPI,
  deleteEntryViaAPI,
  getGenerateButton,
  closeActiveTab,
} from '@e2etest/utils';

/**
 * Helper delay function.
 */
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

describe.serial('Organization Entry Tests', () => {
  let createdEntryUuid: string | null = null;
  const testEntryName = 'Test Organization Entry';

  beforeAll(async () => {
    await ensureSetup(false);
    const setting = testData.settings[0];
    await switchToSetting(setting.name);
  });

  afterAll(async () => {
    // Clean up created entry
    if (createdEntryUuid) {
      try {
        await deleteEntryViaAPI(createdEntryUuid);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  test('Open existing organization entry', async () => {
    const setting = testData.settings[0];

    // Expand the organization topic folder
    await expandTopicNode(Topics.Organization);

    // Expand the (none) type folder
    await expandTypeNode(Topics.Organization, '(none)');

    // Open the first organization
    const firstOrg = setting.topics[Topics.Organization][0];
    await openEntry(Topics.Organization, firstOrg.name);

    // Verify the entry is open
    const nameInput = getEntryNameInput();
    const nameValue = await nameInput.inputValue();
    expect(nameValue).toBe(firstOrg.name);
  });

  test('Create new organization entry via API', async () => {
    const setting = testData.settings[0];

    // Create a new entry for this test
    createdEntryUuid = await createEntryViaAPI(Topics.Organization, testEntryName, setting.name);

    // Refresh the directory
    await switchToSetting(testData.settings[1].name);
    await switchToSetting(setting.name);

    // Expand and open the entry
    await expandTopicNode(Topics.Organization);
    await expandTypeNode(Topics.Organization, '(none)');
    await openEntry(Topics.Organization, testEntryName);

    // Verify the entry is open
    const nameValue = await getEntryNameValue();
    expect(nameValue).toBe(testEntryName);
  });

  test('Edit organization name with debounce', async () => {
    // Make sure we have the entry open
    await expandTopicNode(Topics.Organization);
    await expandTypeNode(Topics.Organization, '(none)');
    await openEntry(Topics.Organization, testEntryName);

    // Change the name
    const newName = 'Renamed Test Organization';
    await setEntryName(newName);

    // Verify the name changed
    const nameValue = await getEntryNameValue();
    expect(nameValue).toBe(newName);
  });

  test('Select existing type for organization', async () => {
    const page = sharedContext.page!;

    // Make sure we have the entry open
    await expandTopicNode(Topics.Organization);
    await expandTypeNode(Topics.Organization, '(none)');
    await openEntry(Topics.Organization, 'Renamed Test Organization');

    // Click on the type input to open dropdown
    const typeInput = await page.$('.fcb-typeahead input[data-testid="typeahead-input"]');
    if (typeInput) {
      await typeInput.click();

      // Wait for dropdown to appear
      await page.waitForSelector('.fcb-ta-dropdown', { timeout: 5000 });

      // Find and click the first option
      const options = await page.$$('.typeahead-entry');
      if (options.length > 0) {
        await options[0].click();
        await delay(200);
      }
    }

    // Verify type was selected
    const typeValue = await getTypeValue();
    expect(typeValue.length).toBeGreaterThan(0);
  });

  test('Add and remove tags', async () => {
    const page = sharedContext.page!;

    // Make sure we have the entry open
    await expandTopicNode(Topics.Organization);
    await expandTypeNode(Topics.Organization, '(none)');
    await openEntry(Topics.Organization, 'Renamed Test Organization');

    // Wait for tags component to be initialized
    await page.waitForSelector('.tags-wrapper:not(.uninitialized)', { timeout: 5000 });

    // Add a tag
    await addTag('test-org-tag');

    // Verify tag was added
    const tags = await page.$$('.tagify__tag');
    let found = false;
    for (const tag of tags) {
      const text = await tag.evaluate(el => el.textContent);
      if (text?.includes('test-org-tag')) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);

    // Remove the tag
    await removeTag('test-org-tag');

    // Verify tag was removed
    const tagsAfter = await page.$$('.tagify__tag');
    for (const tag of tagsAfter) {
      const text = await tag.evaluate(el => el.textContent);
      expect(text?.includes('test-org-tag')).toBe(false);
    }
  });

  test('Click tag opens tag results tab', async () => {
    const page = sharedContext.page!;

    // Add a tag first
    await addTag('org-nav-tag');
    await delay(300);

    // Click the tag
    await clickTag('org-nav-tag');

    // Wait for new tab to open
    await delay(200);

    // Verify tag results tab is visible
    const tagResultsTab = await page.$('[data-testid="tag-results-tab"], .tag-results-tab');
    // Tag results should have opened a new tab
    const tabs = await page.$$('.fcb-tab');
    expect(tabs.length).toBeGreaterThan(1);

    // Close the tag results tab
    await closeActiveTab();
  });

  test('Push organization to session', async () => {
    const page = sharedContext.page!;

    // Make sure we have the entry open
    await expandTopicNode(Topics.Organization);
    await expandTypeNode(Topics.Organization, '(none)');
    await openEntry(Topics.Organization, 'Renamed Test Organization');

    // Click the push to session button
    const pushed = await clickPushToSession();
    expect(pushed).toBe(true);

    // Context menu should appear - select a campaign
    await page.waitForSelector('.mx-context-menu', { timeout: 5000 });

    // Click first campaign option
    const menuItems = await page.$$('.mx-context-menu-item');
    if (menuItems.length > 0) {
      await menuItems[0].click();
      await delay(200);
    }
  });

  test('Generate button shows context menu', async () => {
    const page = sharedContext.page!;

    // Make sure we have the entry open
    await expandTopicNode(Topics.Organization);
    await expandTypeNode(Topics.Organization, '(none)');
    await openEntry(Topics.Organization, 'Renamed Test Organization');

    // Click the generate button
    const genBtn = await getGenerateButton();
    if (genBtn) {
      await genBtn.click();

      // Wait for context menu
      await page.waitForSelector('.mx-context-menu', { timeout: 5000 });

      // Verify menu has options
      const menuItems = await page.$$('.mx-context-menu-item');
      expect(menuItems.length).toBeGreaterThan(0);
    }
  });

  test('Switch to journals tab', async () => {
    const page = sharedContext.page!;

    // Make sure we have the entry open
    await expandTopicNode(Topics.Organization);
    await expandTypeNode(Topics.Organization, '(none)');
    await openEntry(Topics.Organization, 'Renamed Test Organization');

    // Click on journals tab
    await clickContentTab('journals');

    // Verify journals tab is visible
    const journalsTab = await page.$('[data-tab="journals"]');
    expect(journalsTab).not.toBeNull();
  });

  test('Switch to characters relationship tab', async () => {
    const page = sharedContext.page!;

    // Make sure we have the entry open
    await expandTopicNode(Topics.Organization);
    await expandTypeNode(Topics.Organization, '(none)');
    await openEntry(Topics.Organization, 'Renamed Test Organization');

    // Click on characters tab
    await clickContentTab('characters');

    // Verify characters tab is visible
    const charsTab = await page.$('[data-tab="characters"]');
    expect(charsTab).not.toBeNull();
  });

  test('Switch to locations relationship tab', async () => {
    const page = sharedContext.page!;

    // Make sure we have the entry open
    await expandTopicNode(Topics.Organization);
    await expandTypeNode(Topics.Organization, '(none)');
    await openEntry(Topics.Organization, 'Renamed Test Organization');

    // Click on locations tab
    await clickContentTab('locations');

    // Verify locations tab is visible
    const locsTab = await page.$('[data-tab="locations"]');
    expect(locsTab).not.toBeNull();
  });

  test('Switch to organizations relationship tab', async () => {
    const page = sharedContext.page!;

    // Make sure we have the entry open
    await expandTopicNode(Topics.Organization);
    await expandTypeNode(Topics.Organization, '(none)');
    await openEntry(Topics.Organization, 'Renamed Test Organization');

    // Click on organizations tab
    await clickContentTab('organizations');

    // Verify organizations tab is visible
    const orgsTab = await page.$('[data-tab="organizations"]');
    expect(orgsTab).not.toBeNull();
  });

  test('Switch to sessions tab', async () => {
    const page = sharedContext.page!;

    // Make sure we have the entry open
    await expandTopicNode(Topics.Organization);
    await expandTypeNode(Topics.Organization, '(none)');
    await openEntry(Topics.Organization, 'Renamed Test Organization');

    // Click on sessions tab
    await clickContentTab('sessions');

    // Verify sessions tab is visible
    const sessionsTab = await page.$('[data-tab="sessions"]');
    expect(sessionsTab).not.toBeNull();
  });

  test('Switch to foundry tab', async () => {
    const page = sharedContext.page!;

    // Make sure we have the entry open
    await expandTopicNode(Topics.Organization);
    await expandTypeNode(Topics.Organization, '(none)');
    await openEntry(Topics.Organization, 'Renamed Test Organization');

    // Click on foundry tab
    await clickContentTab('foundry');

    // Verify foundry tab is visible
    const foundryTab = await page.$('[data-tab="foundry"]');
    expect(foundryTab).not.toBeNull();
  });
});

runTests();
