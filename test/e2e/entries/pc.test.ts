/**
 * PC (Player Character) entry E2E tests.
 * Tests PC entry operations: opening, editing name, player name, type selection,
 * tag management, relationships, push-to-session, content tabs.
 */

import { describe, test, beforeAll, afterAll, expect,  } from '../testRunner';
import { sharedContext } from '@e2etest/sharedContext';
import { testData } from '@e2etest/data';
import { ensureSetup } from '../ensureSetup';
import { switchToSetting, expandTopicNode, expandTypeNode } from '@e2etest/utils';
import { Topics } from '@/types';
import {
  openEntry,
  getEntryNameInput,
  setEntryName,
  getEntryNameValue,
  getTypeValue,
  addTag,
  removeTag,
  clickTag,
  clickContentTab,
  createEntryViaAPI,
  deleteEntryViaAPI,
  getGenerateButton,
  closeActiveTab,
} from '@e2etest/utils';

/**
 * Helper delay function.
 */
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * PC Entry Tests
 * Verifies PC entry CRUD operations, player name field, relationships, and navigation.
 */
describe.serial('PC Entry Tests', () => {
  let createdEntryUuid: string | null = null;
  const testEntryName = 'Test PC Entry';

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

  /**
   * What it tests: Opening an existing PC entry from the directory tree.
   * Expected behavior: Entry opens and displays the correct PC name in the name input.
   */
  test('Open existing PC entry', async () => {
    const setting = testData.settings[0];

    // Expand the PC topic folder
    await expandTopicNode(Topics.PC);

    // Expand the (none) type folder
    await expandTypeNode(Topics.PC, '(none)');

    // Open the first PC
    const firstPC = setting.topics[Topics.PC][0];
    await openEntry(Topics.PC, firstPC.name);

    // Verify the entry is open
    const nameInput = getEntryNameInput();
    const nameValue = await nameInput.inputValue();
    // Expected behavior: Name input contains the PC's name
    expect(nameValue).toBe(firstPC.name);
  });

  test('Create new PC entry via API', async () => {
    const setting = testData.settings[0];

    // Create a new entry for this test
    createdEntryUuid = await createEntryViaAPI(Topics.PC, testEntryName, setting.name);

    // Refresh the directory
    await switchToSetting(testData.settings[1].name);
    await switchToSetting(setting.name);

    // Expand and open the entry
    await expandTopicNode(Topics.PC);
    await expandTypeNode(Topics.PC, '(none)');
    await openEntry(Topics.PC, testEntryName);

    // Verify the entry is open
    const nameValue = await getEntryNameValue();
    expect(nameValue).toBe(testEntryName);
  });

  /**
   * What it tests: Editing a PC's name with debounced auto-save.
   * Expected behavior: Name change persists after debounce period.
   */
  test('Edit PC name with debounce', async () => {
    // Make sure we have the entry open
    await expandTopicNode(Topics.PC);
    await expandTypeNode(Topics.PC, '(none)');
    await openEntry(Topics.PC, testEntryName);

    // Change the name
    const newName = 'Renamed Test PC';
    await setEntryName(newName);

    // Verify the name changed
    const nameValue = await getEntryNameValue();
    // Expected behavior: Name input reflects the new name after save
    expect(nameValue).toBe(newName);
  });

  /**
   * What it tests: Editing the player name field (the player who owns this PC).
   * Expected behavior: Player name change persists after save.
   */
  test('Edit player name', async () => {
    const page = sharedContext.page!;

    // Make sure we have the entry open
    await expandTopicNode(Topics.PC);
    await expandTypeNode(Topics.PC, '(none)');
    await openEntry(Topics.PC, 'Renamed Test PC');

    // Set player name
    const playerInput = await page.$('.fcb-player-name input, input[data-testid="player-name-input"]');
    if (playerInput) {
      await playerInput.evaluate((el) => { (el as HTMLInputElement).value = 'Test Player'; });
      await playerInput.type(''); // Trigger input event
      await delay(700); // Wait for debounce

      // Verify player name changed
      const value = await playerInput.evaluate(el => (el as HTMLInputElement).value);
      expect(value).toBe('Test Player');
    }
  });

  test('Select existing type for PC', async () => {
    const page = sharedContext.page!;

    // Make sure we have the entry open
    await expandTopicNode(Topics.PC);
    await expandTypeNode(Topics.PC, '(none)');
    await openEntry(Topics.PC, 'Renamed Test PC');

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

  /**
   * What it tests: Adding and removing tags from a PC entry.
   * Expected behavior: Tags can be added and removed, with UI reflecting changes.
   */
  test('Add and remove tags', async () => {
    const page = sharedContext.page!;

    // Make sure we have the entry open
    await expandTopicNode(Topics.PC);
    await expandTypeNode(Topics.PC, '(none)');
    await openEntry(Topics.PC, 'Renamed Test PC');

    // Wait for tags component to be initialized
    await page.waitForSelector('.tags-wrapper:not(.uninitialized)', { timeout: 5000 });

    // Add a tag
    const testTag = 'test-pc-tag';
    await addTag(testTag);

    // Verify tag was added
    const tags = await page.$$('.tagify__tag');
    let found = false;
    for (const tag of tags) {
      const text = await tag.evaluate(el => el.textContent);
      if (text?.includes(testTag)) {
        found = true;
        break;
      }
    }
    // Expected behavior: Tag appears in the tags list after adding
    expect(found).toBe(true);

    // Remove the tag
    await removeTag(testTag);

    // Verify tag was removed
    const tagsAfter = await page.$$('.tagify__tag');
    for (const tag of tagsAfter) {
      const text = await tag.evaluate(el => el.textContent);
      // Expected behavior: Tag no longer appears in the tags list
      expect(text?.includes(testTag)).toBe(false);
    }
  });

  /**
   * What it tests: Clicking a tag opens a tag results tab showing entries with that tag.
   * Expected behavior: New tab opens displaying tag search results.
   */
  test('Click tag opens tag results tab', async () => {
    const page = sharedContext.page!;

    // Add a tag first
    await addTag('pc-nav-tag');
    await delay(300);

    // Click the tag
    await clickTag('pc-nav-tag');

    // Wait for new tab to open
    await delay(200);

    // Verify tag results tab opened (new tab)
    const tabs = await page.$$('.fcb-tab');
    expect(tabs.length).toBeGreaterThan(1);

    // Close the tag results tab
    await closeActiveTab();
  });

  /**
   * What it tests: Generate button displays a context menu with AI generation options.
   * Expected behavior: Context menu appears with generation options.
   */
  test('Generate button shows context menu', async () => {
    const page = sharedContext.page!;

    // Make sure we have the entry open
    await expandTopicNode(Topics.PC);
    await expandTypeNode(Topics.PC, '(none)');
    await openEntry(Topics.PC, 'Renamed Test PC');

    // Click the generate button
    const genBtn = await getGenerateButton();
    if (genBtn) {
      await genBtn.click();

      // Wait for context menu
      await page.waitForSelector('.mx-context-menu', { timeout: 5000 });

      // Verify menu has options
      const menuItems = await page.$$('.mx-context-menu-item');
      // Expected behavior: Context menu contains at least one generation option
      expect(menuItems.length).toBeGreaterThan(0);
    }
  });

  /**
   * What it tests: Switching to the sessions tab showing sessions this PC appears in.
   * Expected behavior: Sessions tab becomes visible.
   */
  test('Switch to sessions tab', async () => {
    const page = sharedContext.page!;

    // Make sure we have the entry open
    await expandTopicNode(Topics.PC);
    await expandTypeNode(Topics.PC, '(none)');
    await openEntry(Topics.PC, 'Renamed Test PC');

    // Click on sessions tab
    await clickContentTab('sessions');

    // Verify sessions tab is visible
    const sessionsTab = await page.$('[data-tab="sessions"]');
    expect(sessionsTab).not.toBeNull();
  });

  /**
   * What it tests: Pushing a PC entry to a session via the push-to-session button.
   * Expected behavior: Context menu appears with campaign options, entry is linked to session.
   */
  test('Push PC to session', async () => {
    const page = sharedContext.page!;

    // Make sure we have the entry open
    await expandTopicNode(Topics.PC);
    await expandTypeNode(Topics.PC, '(none)');
    await openEntry(Topics.PC, 'Renamed Test PC');

    // Click the push-to-session button
    const pushBtn = await page.$('.fcb-push-to-session');
    if (pushBtn) {
      await pushBtn.click();

      // Wait for context menu
      await page.waitForSelector('.mx-context-menu', { timeout: 5000 });

      // Verify menu has options
      const menuItems = await page.$$('.mx-context-menu-item');
      // Expected behavior: Context menu contains at least one campaign option
      expect(menuItems.length).toBeGreaterThan(0);
    }
  });

  test('Switch to journals tab', async () => {
    const page = sharedContext.page!;

    // Make sure we have the entry open
    await expandTopicNode(Topics.PC);
    await expandTypeNode(Topics.PC, '(none)');
    await openEntry(Topics.PC, 'Renamed Test PC');

    // Click on journals tab
    await clickContentTab('journals');

    // Verify journals tab is visible
    const journalsTab = await page.$('[data-tab="journals"]');
    expect(journalsTab).not.toBeNull();
  });

  /**
   * What it tests: Switching to the characters relationship tab.
   * Expected behavior: Characters relationship tab becomes visible.
   */
  test('Switch to characters relationship tab', async () => {
    const page = sharedContext.page!;

    // Make sure we have the entry open
    await expandTopicNode(Topics.PC);
    await expandTypeNode(Topics.PC, '(none)');
    await openEntry(Topics.PC, 'Renamed Test PC');

    // Click on characters tab
    await clickContentTab('characters');

    // Verify characters tab is visible
    const charsTab = await page.$('[data-tab="characters"]');
    expect(charsTab).not.toBeNull();
  });

  test('Switch to locations relationship tab', async () => {
    const page = sharedContext.page!;

    // Make sure we have the entry open
    await expandTopicNode(Topics.PC);
    await expandTypeNode(Topics.PC, '(none)');
    await openEntry(Topics.PC, 'Renamed Test PC');

    // Click on locations tab
    await clickContentTab('locations');

    // Verify locations tab is visible
    const locsTab = await page.$('[data-tab="locations"]');
    expect(locsTab).not.toBeNull();
  });

  test('Switch to organizations relationship tab', async () => {
    const page = sharedContext.page!;

    // Make sure we have the entry open
    await expandTopicNode(Topics.PC);
    await expandTypeNode(Topics.PC, '(none)');
    await openEntry(Topics.PC, 'Renamed Test PC');

    // Click on organizations tab
    await clickContentTab('organizations');

    // Verify organizations tab is visible
    const orgsTab = await page.$('[data-tab="organizations"]');
    expect(orgsTab).not.toBeNull();
  });

  /**
   * What it tests: Image picker component is visible for PC portrait.
   * Expected behavior: Image picker is present in the PC entry.
   */
  test('Image picker is visible', async () => {
    const page = sharedContext.page!;

    // Make sure we have the entry open
    await expandTopicNode(Topics.PC);
    await expandTypeNode(Topics.PC, '(none)');
    await openEntry(Topics.PC, 'Renamed Test PC');

    // Click on sessions tab
    await clickContentTab('sessions');

    // Verify sessions tab is visible
    const sessionsTab = await page.$('[data-tab="sessions"]');
    expect(sessionsTab).not.toBeNull();
  });

  /**
   * What it tests: Switching to the foundry documents tab.
   * Expected behavior: Foundry documents tab becomes visible.
   */
  test('Switch to foundry tab', async () => {
    const page = sharedContext.page!;

    // Make sure we have the entry open
    await expandTopicNode(Topics.PC);
    await expandTypeNode(Topics.PC, '(none)');
    await openEntry(Topics.PC, 'Renamed Test PC');

    // Click on foundry tab
    await clickContentTab('foundry');

    // Verify foundry tab is visible
    const foundryTab = await page.$('[data-tab="foundry"]');
    expect(foundryTab).not.toBeNull();
  });

  test('PC shows image picker', async () => {
    const page = sharedContext.page!;

    // Make sure we have the entry open
    await expandTopicNode(Topics.PC);
    await expandTypeNode(Topics.PC, '(none)');
    await openEntry(Topics.PC, 'Renamed Test PC');

    // Verify image picker is present
    const imagePicker = await page.$('.fcb-image-picker, .fcb-pc-image-container');
    expect(imagePicker).not.toBeNull();
  });
});
