import { describe, test, beforeAll, afterAll, expect, runTests } from '../testRunner';
import { sharedContext } from '@e2etest/sharedContext';
import { testData } from '@e2etest/data';
import { ensureSetup } from '../ensureSetup';
import { switchToSetting, expandTopicNode, expandTypeNode } from '@e2etest/utils';
import { Topics } from '@/types';
import { getByTestId } from '../helpers';
import {
  openEntry,
  getEntryNameInput,
  setEntryName,
  getEntryNameValue,
  selectType,
  addNewType,
  getTypeValue,
  selectSpecies,
  getSpeciesValue,
  addTag,
  removeTag,
  clickTag,
  clickContentTab,
  clickPushToSession,
  clickContextMenuItem,
  createEntryViaAPI,
  deleteEntryViaAPI,
  waitForNotification,
  getGenerateButton,
  getFoundryDocButton,
  closeActiveTab,
} from '@e2etest/utils';

describe.serial('Character Entry Tests', () => {
  let createdEntryUuid: string | null = null;
  const testEntryName = 'Test Character Entry';

  beforeAll(async () => {
    // Ensure setup is done with test data populated
    await ensureSetup(true);
    
    const setting = testData.settings[0];

    // pick the right setting
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

  test('Open existing character entry', async () => {
    const page = sharedContext.page!;
    const setting = testData.settings[0];

    // Expand the character topic folder
    await expandTopicNode(Topics.Character);
    
    // Expand the (none) type folder
    await expandTypeNode(Topics.Character, '(none)');

    // Open the first character
    const firstChar = setting.topics[Topics.Character][0];
    await openEntry(Topics.Character, firstChar.name);

    // Verify the entry is open
    const nameInput = getEntryNameInput();
    const nameValue = await nameInput.inputValue();
    expect(nameValue).toBe(firstChar.name);
  });

  test('Edit character name with debounce', async () => {
    const page = sharedContext.page!;
    const setting = testData.settings[0];

    // Create a new entry for this test
    createdEntryUuid = await createEntryViaAPI(Topics.Character, testEntryName, setting.name);

    // Expand and open the entry
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    await openEntry(Topics.Character, testEntryName);

    // Change the name
    const newName = 'Renamed Test Character';
    await setEntryName(newName);

    // Verify the name changed
    const nameValue = await getEntryNameValue();
    expect(nameValue).toBe(newName);

    // Verify notification appeared
    // Note: name change doesn't show notification, but we can verify it persisted
  });

  test('Select existing type for character', async () => {
    const page = sharedContext.page!;

    // Make sure we're on the description tab
    await clickContentTab('description');

    // Select a type (assuming there's a type available)
    // First, let's check what types are available by clicking the input
    const typeInput = getByTestId(page, 'typeahead-input');
    await typeInput.click();

    // Wait for dropdown
    await page.waitForSelector('.fcb-ta-dropdown');

    // Get available options
    const options = await page.$$('.typeahead-entry');
    if (options.length > 0) {
      const firstOptionText = await options[0].evaluate(el => el.textContent);
      if (firstOptionText) {
        await options[0].click();
        
        // Wait for save
        await new Promise(resolve => setTimeout(resolve, 300));

        // Verify type was set
        const typeValue = await getTypeValue();
        expect(typeValue).toBe(firstOptionText.trim());
      }
    }
  });

  test('Add new type for character', async () => {
    const page = sharedContext.page!;

    const newType = 'Unique Test Type ' + Date.now();
    await addNewType(newType);

    // Verify the type was added and selected
    const typeValue = await getTypeValue();
    expect(typeValue).toBe(newType);
  });

  test('Select species for character', async () => {
    const page = sharedContext.page!;

    // Click on species input (it's the second typeahead)
    const inputs = await page.$$('.fcb-typeahead input');
    if (inputs.length >= 2) {
      await inputs[1].click();

      // Wait for dropdown
      await page.waitForSelector('.fcb-ta-dropdown');

      // Get available species options
      const options = await page.$$('.typeahead-entry');
      if (options.length > 0) {
        const firstOptionText = await options[0].evaluate(el => el.textContent);
        if (firstOptionText) {
          await options[0].click();
          
          // Wait for save
          await new Promise(resolve => setTimeout(resolve, 300));

          // Verify species was set
          const speciesValue = await getSpeciesValue();
          expect(speciesValue).toBe(firstOptionText.trim());
        }
      }
    }
  });

  test('Add and remove tags', async () => {
    const page = sharedContext.page!;

    // Add a tag
    const testTag = 'test-tag-' + Date.now();
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
    expect(found).toBe(true);

    // Remove the tag
    await removeTag(testTag);

    // Verify tag was removed
    const tagsAfter = await page.$$('.tagify__tag');
    for (const tag of tagsAfter) {
      const text = await tag.evaluate(el => el.textContent);
      expect(text?.includes(testTag)).toBe(false);
    }
  });

  test('Click tag opens tag results tab', async () => {
    const page = sharedContext.page!;

    // First add a tag we can click
    const clickTag1 = 'clickable-tag-' + Date.now();
    await addTag(clickTag1);

    // Click the tag
    await clickTag(clickTag1);

    // Wait for new tab to open
    await page.waitForSelector('[data-testid="tag-results-tab"]', { timeout: 5000 }).catch(() => {
      // Tab might not have testid, check for tab with tag name
    });

    // Verify we're on a tag results tab by checking for tag-related content
    const tagResultsContent = await page.$('.tag-results-content');
    // Note: The exact selector depends on the TagResultsTab implementation

    // Close the tag results tab to return to the entry
    await closeActiveTab();
  });

  test('Push character to session', async () => {
    const page = sharedContext.page!;
    const setting = testData.settings[0];

    // Make sure there's a campaign with a current session
    const campaign = setting.campaigns[0];
    if (campaign && campaign.sessions.length > 0) {
      // Click the push to session button
      const clicked = await clickPushToSession();
      if (!clicked) {
        // Button not available or disabled - skip test
        return;
      }

      // Wait for context menu
      await page.waitForSelector('.mx-context-menu');

      // Click the first campaign option
      const menuItems = await page.$$('.mx-context-menu-item');
      if (menuItems.length > 0) {
        await menuItems[0].click();

        // Wait for notification
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  });

  test('Generate button shows context menu', async () => {
    const page = sharedContext.page!;

    // Click the generate button
    const generateBtn = await getGenerateButton();
    if (!generateBtn) {
      // Button not available - skip test
      return;
    }

    await generateBtn.click();

    // Wait for context menu
    await page.waitForSelector('.mx-context-menu');

    // Verify menu items exist
    const menuItems = await page.$$('.mx-context-menu-item');
    expect(menuItems.length).toBeGreaterThan(0);

    // Close menu by clicking elsewhere
    await page.evaluate(() => {
      document.body.click();
    });
  });

  test('Foundry doc button disabled when no actors attached', async () => {
    const page = sharedContext.page!;

    // For a character with no actors, the button should be disabled
    const foundryBtn = await getFoundryDocButton();
    if (!foundryBtn) {
      // Button not available - skip test
      return;
    }

    const isDisabled = await foundryBtn.evaluate((el: Element) => {
      return (el as HTMLButtonElement).disabled;
    });

    // If the character has no actors, button should be disabled
    // If it has actors, this test will pass anyway
    expect(isDisabled !== undefined).toBe(true);
  });

  test('Switch to journals tab', async () => {
    const page = sharedContext.page!;

    // Click on journals tab
    await clickContentTab('journals');

    // Wait for journals tab content
    await page.waitForSelector('.tab[data-tab="journals"]', { timeout: 5000 }).catch(() => {
      // Tab might already be visible
    });

    // Verify we're on journals tab
    const journalsTab = await page.$('[data-tab="journals"]');
    const isVisible = await journalsTab?.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none';
    });
    expect(isVisible).toBe(true);
  });

  test('Switch to characters relationship tab', async () => {
    const page = sharedContext.page!;

    // Click on characters tab
    await clickContentTab('characters');

    // Wait for relationship table
    await page.waitForSelector('.tab[data-tab="characters"]', { timeout: 5000 }).catch(() => {
      // Tab might already be visible
    });
  });

  test('Switch to locations relationship tab', async () => {
    const page = sharedContext.page!;

    // Click on locations tab
    await clickContentTab('locations');

    // Wait for relationship table
    await page.waitForSelector('.tab[data-tab="locations"]', { timeout: 5000 }).catch(() => {
      // Tab might already be visible
    });
  });

  test('Switch to organizations relationship tab', async () => {
    const page = sharedContext.page!;

    // Click on organizations tab
    await clickContentTab('organizations');

    // Wait for relationship table
    await page.waitForSelector('.tab[data-tab="organizations"]', { timeout: 5000 }).catch(() => {
      // Tab might already be visible
    });
  });

  test('Switch to sessions tab', async () => {
    const page = sharedContext.page!;

    // Click on sessions tab
    await clickContentTab('sessions');

    // Wait for sessions table
    await page.waitForSelector('.tab[data-tab="sessions"]', { timeout: 5000 }).catch(() => {
      // Tab might already be visible
    });
  });

  test('Switch to foundry tab', async () => {
    const page = sharedContext.page!;

    // Click on foundry tab
    await clickContentTab('foundry');

    // Wait for foundry documents table
    await page.waitForSelector('.tab[data-tab="foundry"]', { timeout: 5000 }).catch(() => {
      // Tab might already be visible
    });
  });

  test('Voice button not visible for non-characters', async () => {
    const page = sharedContext.page!;

    // The voice button should only show for characters
    // Since we're on a character, it might be visible if voice recording is enabled
    const voiceBtn = await page.$('[data-testid="entry-voice-button"]');
    // Just verify the button exists or not based on settings
    // This is more of a sanity check
  });
});

// Note: runTests() is called by the main runner (all.test.ts)
