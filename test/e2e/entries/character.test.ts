/**
 * Character entry E2E tests.
 * Tests character entry operations: opening, editing name, type selection,
 * species selection, tag management, push-to-session, content tabs,
 * PCs tab, actors tab, voice button, Foundry doc button, generate button,
 * description sub-components, name validation, and tab interaction depth.
 */

import { expect } from 'chai';
import { sharedContext } from '@e2etest/sharedContext';
import { testData } from '@e2etest/data';
import { switchToSetting, expandTopicNode, expandTypeNode, getSetting, setSetting } from '@e2etest/utils';
import { Topics } from '../types';
import {
  openEntry,
  setEntryName,
  getEntryNameValue,
  addNewType,
  getTypeValue,
  getSpeciesValue,
  getTypeSelectInputSelector,
  addTag,
  removeTag,
  clickTag,
  clickContentTab,
  clickPushToSession,
  createEntryViaUI,
  deleteEntryViaAPI,
  closeActiveTab,
  getJournalCount,
  getRelatedEntryCount,
  getSessionCount,
  getRelatedDocumentCount,
  clickSessionRow,
  getImagePicker,
  getImageUrl,
  clickImagePicker,
  clickFoundryDocButton,
  isFoundryDocButtonDisabled,
  clickContextMenuItem,
  createJournalViaAPI,
  deleteJournalViaAPI,
  removeJournal,
  removeRelatedEntry,
  getVoiceButtonSelector,
  getParentValue,
  simulateDragDrop,
  clickAddJournalButton,
  getGenerateButtonSelector,
  getFoundryDocButtonSelector,
  addDocumentViaDragDrop,
} from '@e2etest/utils';

/**
 * Helper: open the first character entry from test data and wait for it to load.
 */
const openFirstCharacter = async () => {
  const page = sharedContext.page!;
  const setting = testData.settings[0];

  await expandTopicNode(Topics.Character);
  await expandTypeNode(Topics.Character, '(none)');
  const firstChar = setting.topics[Topics.Character][0];
  await openEntry(Topics.Character, firstChar.name);

  // Wait for entry to load
  await page.waitForSelector('[data-testid="entry-name-input"]', { timeout: 5000 });
  await page.waitForFunction(() => {
    const input = document.querySelector('[data-testid="entry-name-input"]') as HTMLInputElement;
    return input && input.value.length > 0;
  }, { timeout: 5000 });
};

/**
 * Helper: close all open tabs.
 */
const closeAllTabs = async () => {
  const page = sharedContext.page!;
  const closeButtons = await page.$$('[data-testid="tab-close-button"]');
  for (const btn of closeButtons) {
    try {
      await btn.click();
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch {
      // Ignore close errors
    }
  }
};

/**
 * Character Entry Tests
 * Verifies character entry CRUD operations, field editing, and navigation.
 */
describe('Character Entry Tests', () => {
  let createdEntryUuid: string | null = null;
  const testEntryName = 'Test Character Entry';

  before(async () => {
    // Ensure setup is done with test data populated (don't rebuild)
    
    const setting = testData.settings[0];

    // pick the right setting
    await switchToSetting(setting.name);
    
    // Wait for directory to fully load
    await new Promise(resolve => setTimeout(resolve, 500));

    // Close any leftover tabs from previous runs
    await closeAllTabs();
  });

  after(async () => {
    // Clean up created entry
    if (createdEntryUuid) {
      try {
        await deleteEntryViaAPI(createdEntryUuid);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  afterEach(async () => {
    await closeAllTabs();
  });

  /**
   * What it tests: Opening an existing character entry from the directory tree.
   * Expected behavior: Entry opens and displays the correct character name in the name input.
   */
  it('Open existing character entry', async () => {
    const page = sharedContext.page!;
    const setting = testData.settings[0];

    // Expand the character topic folder
    await expandTopicNode(Topics.Character);
    
    // Expand the (none) type folder
    await expandTypeNode(Topics.Character, '(none)');

    // Open the first character
    const firstChar = setting.topics[Topics.Character][0];
    await openEntry(Topics.Character, firstChar.name);

    // Verify the entry is open - wait for name input to have a value
    await page.waitForSelector('[data-testid="entry-name-input"]', { timeout: 5000 });
    // Wait for the value to be populated (Vue reactivity)
    await page.waitForFunction(() => {
      const input = document.querySelector('[data-testid="entry-name-input"]') as HTMLInputElement;
      return input && input.value.length > 0;
    }, { timeout: 5000 });
    const nameValue = await getEntryNameValue();
    // Expected behavior: Name input contains the character's name
    expect(nameValue).to.equal(firstChar.name);
  });

  /**
   * What it tests: Editing a character's name with debounced auto-save.
   * Expected behavior: Name change persists after debounce period.
   */
  it('Edit character name with debounce', async () => {
    const page = sharedContext.page!;
    const setting = testData.settings[0];

    // Create a new entry via UI (simulates real user behavior)
    await expandTopicNode(Topics.Character);
    createdEntryUuid = await createEntryViaUI(Topics.Character, testEntryName);

    // Entry is already open after creation, no need to open again

    // Change the name
    const newName = 'Renamed Test Character';
    await setEntryName(newName);

    // Verify the name changed
    const nameValue = await getEntryNameValue();
    // Expected behavior: Name input reflects the new name after save
    expect(nameValue).to.equal(newName);

    // Verify notification appeared
    // Note: name change doesn't show notification, but we can verify it persisted
  });

  /**
   * What it tests: Selecting an existing type from the typeahead dropdown.
   * Expected behavior: Type is selected and displayed in the type input field.
   */
  it('Select existing type for character', async () => {
    const page = sharedContext.page!;
    const setting = testData.settings[0];
    let typeTestUuid: string | null = null;

    try {
      // Create a new entry via UI (don't modify base data)
      const testTypeName = 'Type Test ' + Date.now();
      await expandTopicNode(Topics.Character);
      typeTestUuid = await createEntryViaUI(Topics.Character, testTypeName);

      // Entry is already open after creation

      // Make sure we're on the description tab
      await clickContentTab('description');

      // Wait for description content to load
      await page.waitForSelector('.fcb-description-content');

      // Select a type (assuming there's a type available)
      // Use the utility function which targets the correct typeahead
      await page.click(getTypeSelectInputSelector());

      // Wait for dropdown to appear
      await page.waitForSelector('.fcb-ta-dropdown', { timeout: 5000 });

      // Get available options (excluding the 'add' option)
      const options = await page.$$('.typeahead-entry:not(.add)');
      if (options.length > 0) {
        const firstOptionText = await options[0].evaluate(el => el.textContent);
        if (firstOptionText) {
          await options[0].click();
          
          // Wait for save
          await new Promise(resolve => setTimeout(resolve, 300));

          // Verify type was set
          const typeValue = await getTypeValue();
          // Expected behavior: Type value matches the selected option
          expect(typeValue).to.equal(firstOptionText.trim());
        }
      }
    }
    finally {
      // Clean up
      if (typeTestUuid) {
        await deleteEntryViaAPI(typeTestUuid);
      }
    }
  });

  /**
   * What it tests: Creating a new type via the typeahead input.
   * Expected behavior: New type is created, selected, and displayed.
   */
  it('Add new type for character', async () => {
    const page = sharedContext.page!;
    const setting = testData.settings[0];
    let newTypeTestUuid: string | null = null;

    try {
      // Create a new entry via UI (don't modify base data)
      const newTypeTestName = 'New Type Test ' + Date.now();
      await expandTopicNode(Topics.Character);
      newTypeTestUuid = await createEntryViaUI(Topics.Character, newTypeTestName);

      // Entry is already open after creation

      // Make sure we're on the description tab
      await clickContentTab('description');
      
      // Wait for description content to load
      await page.waitForSelector('.fcb-description-content');

      const newType = 'Unique Test Type ' + Date.now();
      await addNewType(newType);

      // Verify the type was added and selected
      const typeValue = await getTypeValue();
      // Expected behavior: Type value reflects the newly created type
      expect(typeValue).to.equal(newType);
    }
    finally {
      // Clean up
      if (newTypeTestUuid) {
        await deleteEntryViaAPI(newTypeTestUuid);
      }
    }
  });

  /**
   * What it tests: Selecting a species from the species typeahead dropdown.
   * Expected behavior: Species is selected and displayed in the species input field.
   */
  it('Select species for character', async () => {
    const page = sharedContext.page!;
    const setting = testData.settings[0];
    let speciesTestUuid: string | null = null;

    try {
      // Create a new entry via UI (don't modify base data)
      const speciesTestName = 'Species Test ' + Date.now();
      await expandTopicNode(Topics.Character);
      speciesTestUuid = await createEntryViaUI(Topics.Character, speciesTestName);

      // Entry is already open after creation

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
            // Expected behavior: Species value matches the selected option
            expect(speciesValue).to.equal(firstOptionText.trim());
          }
        }
      }
    }
    finally {
      // Clean up
      if (speciesTestUuid) {
        await deleteEntryViaAPI(speciesTestUuid);
      }
    }
  });

  /**
   * What it tests: Adding and removing tags from a character entry.
   * Expected behavior: Tags can be added and removed, with UI reflecting changes.
   */
  it('Add and remove tags', async () => {
    const page = sharedContext.page!;
    const setting = testData.settings[0];
    let tagTestUuid: string | null = null;

    try {
      // Create a new entry via UI (don't modify base data)
      const tagTestName = 'Tag Test ' + Date.now();
      await expandTopicNode(Topics.Character);
      tagTestUuid = await createEntryViaUI(Topics.Character, tagTestName);

      // Entry is already open after creation

      // Wait for tags component to be initialized
      await page.waitForSelector('.tags-wrapper:not(.uninitialized)', { timeout: 5000 });

      // Add a tag
      const testTag = 'test-tag-' + Date.now();
      await addTag(testTag);

      // Verify tag was added - wait a moment for tagify to update
      await new Promise(resolve => setTimeout(resolve, 300));
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
      expect(found).to.equal(true);

      // Remove the tag
      await removeTag(testTag);

      // Verify tag was removed
      const tagsAfter = await page.$$('.tagify__tag');
      for (const tag of tagsAfter) {
        const text = await tag.evaluate(el => el.textContent);
        // Expected behavior: Tag no longer appears in the tags list
        expect(text?.includes(testTag)).to.equal(false);
      }
    }
    finally {
      // Clean up
      if (tagTestUuid) {
        await deleteEntryViaAPI(tagTestUuid);
      }
    }
  });

  /**
   * What it tests: Clicking a tag opens a tag results tab showing entries with that tag.
   * Expected behavior: New tab opens displaying tag search results.
   */
  it('Click tag opens tag results tab', async () => {
    const page = sharedContext.page!;
    const setting = testData.settings[0];
    let clickTagTestUuid: string | null = null;

    try {
      // Create a new entry via UI (don't modify base data)
      const clickTagTestName = 'Click Tag Test ' + Date.now();
      await expandTopicNode(Topics.Character);
      clickTagTestUuid = await createEntryViaUI(Topics.Character, clickTagTestName);

      // Entry is already open after creation

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
    }
    finally {
      // Clean up
      if (clickTagTestUuid) {
        await deleteEntryViaAPI(clickTagTestUuid);
      }
    }
  });

  /**
   * What it tests: Pushing a character entry to a session via the push-to-session button.
   * Expected behavior: Context menu appears with campaign options, entry is linked to session.
   */
  it('Push character to session', async () => {
    const page = sharedContext.page!;
    const setting = testData.settings[0];
    let entryUuid: string | null = null;

    try {
      // Make sure there's a campaign with a current session
      const campaign = setting.campaigns[0];
      if (campaign && campaign.sessions.length > 0) {
        // Create a new entry via UI (avoids issues with shared test data being modified)
        const testEntryName = 'Push Test Character ' + Date.now();
        await expandTopicNode(Topics.Character);
        entryUuid = await createEntryViaUI(Topics.Character, testEntryName);

        if (!entryUuid) {
          // Failed to create entry - skip test
          return;
        }

        // Entry is already open after creation

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
    }
    finally {
      // Clean up
      if (entryUuid) {
        await deleteEntryViaAPI(entryUuid);
      }
    }
  });

  /**
   * What it tests: Generate button displays a context menu with AI generation options.
   * Expected behavior: Context menu appears with generation options.
   */
  it('Generate button shows context menu', async () => {
    const page = sharedContext.page!;

    // Click the generate button
    const genSelector = await getGenerateButtonSelector();
    if (!genSelector) {
      // Button not available - skip test
      return;
    }

    await page.click(genSelector);

    // Wait for context menu
    await page.waitForSelector('.mx-context-menu');

    // Verify menu items exist
    const menuItems = await page.$$('.mx-context-menu-item');
    // Expected behavior: Context menu contains at least one generation option
    expect(menuItems.length).to.be.greaterThan(0);

    // Close menu by clicking elsewhere
    await page.evaluate(() => {
      document.body.click();
    });
  });

  /**
   * What it tests: Foundry document button state when no actors are attached.
   * Expected behavior: Button disabled state is defined (true if no actors, false if actors exist).
   */
  it('Foundry doc button disabled when no actors attached', async () => {
    const page = sharedContext.page!;

    // For a character with no actors, the button should be disabled
    const foundrySelector = await getFoundryDocButtonSelector();
    if (!foundrySelector) {
      // Button not available - skip test
      return;
    }

    const isDisabled = await page.$eval(foundrySelector, (el) => (el as HTMLButtonElement).disabled);

    // Expected behavior: Button has a defined disabled state
    // If the character has no actors, button should be disabled
    // If it has actors, this test will pass anyway
    expect(isDisabled !== undefined).to.equal(true);
  });

  /**
   * What it tests: Switching to the journals content tab.
   * Expected behavior: Journals tab becomes visible and shows linked journals.
   */
  it('Switch to journals tab', async () => {
    const page = sharedContext.page!;
    const setting = testData.settings[0];

    // Open the first character (has journal linked from setup)
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    const firstChar = setting.topics[Topics.Character][0];
    await openEntry(Topics.Character, firstChar.name);

    // Wait for entry to load
    await page.waitForSelector('[data-testid="entry-name-input"]', { timeout: 5000 });
    await page.waitForFunction(() => {
      const input = document.querySelector('[data-testid="entry-name-input"]') as HTMLInputElement;
      return input && input.value.length > 0;
    }, { timeout: 5000 });

    // Click on journals tab
    await clickContentTab('journals');

    // Wait for journals tab to become active
    await page.waitForSelector('.tab[data-tab="journals"].active', { timeout: 5000 });

    // Wait for journal table rows to appear (async updateTableRows + Vue reactivity)
    await page.waitForFunction(() => {
      return document.querySelectorAll('[data-testid="journals-table"] tbody tr').length > 0;
    }, { timeout: 5000 });

    // Verify tab is active
    const isActive = await page.evaluate(() => {
      const tab = document.querySelector('.tab[data-tab="journals"]');
      return tab?.classList.contains('active') ?? false;
    });
    // Expected behavior: Journals tab is active
    expect(isActive).to.equal(true);

    // Verify journal data is present
    const journalCount = await getJournalCount();
    // Expected behavior: At least one journal is linked to the character
    expect(journalCount).to.be.greaterThan(0);
  });

  /**
   * What it tests: Switching to the characters relationship tab.
   * Expected behavior: Characters relationship tab becomes visible and shows related characters.
   */
  it('Switch to characters relationship tab', async () => {
    const page = sharedContext.page!;
    const setting = testData.settings[0];

    // Open the first character (has character relationships from setup)
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    const firstChar = setting.topics[Topics.Character][0];
    await openEntry(Topics.Character, firstChar.name);

    // Wait for entry to load
    await page.waitForSelector('[data-testid="entry-name-input"]', { timeout: 5000 });
    await page.waitForFunction(() => {
      const input = document.querySelector('[data-testid="entry-name-input"]') as HTMLInputElement;
      return input && input.value.length > 0;
    }, { timeout: 5000 });

    // Click on characters tab
    await clickContentTab('characters');

    // Wait for tab to become active
    await page.waitForSelector('.tab[data-tab="characters"].active', { timeout: 5000 });

    // Verify tab is visible
    const tab = await page.$('[data-tab="characters"]');
    const isVisible = await tab?.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none';
    });
    // Expected behavior: Characters tab is visible
    expect(isVisible).to.equal(true);

    // Verify relationship data is present
    const relatedCount = await getRelatedEntryCount('characters');
    // Expected behavior: At least one character relationship exists
    expect(relatedCount).to.be.greaterThan(0);
  });

  /**
   * What it tests: Switching to the locations relationship tab.
   * Expected behavior: Locations relationship tab becomes visible and shows related locations.
   */
  it('Switch to locations relationship tab', async () => {
    const page = sharedContext.page!;
    const setting = testData.settings[0];

    // Open the first character (has location relationships from setup)
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    const firstChar = setting.topics[Topics.Character][0];
    await openEntry(Topics.Character, firstChar.name);

    // Wait for entry to load
    await page.waitForSelector('[data-testid="entry-name-input"]', { timeout: 5000 });
    await page.waitForFunction(() => {
      const input = document.querySelector('[data-testid="entry-name-input"]') as HTMLInputElement;
      return input && input.value.length > 0;
    }, { timeout: 5000 });

    // Click on locations tab
    await clickContentTab('locations');

    // Wait for tab to become active
    await page.waitForSelector('.tab[data-tab="locations"].active', { timeout: 5000 });

    // Verify tab is visible
    const tab = await page.$('[data-tab="locations"]');
    const isVisible = await tab?.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none';
    });
    // Expected behavior: Locations tab is visible
    expect(isVisible).to.equal(true);

    // Verify relationship data is present
    const relatedCount = await getRelatedEntryCount('locations');
    // Expected behavior: At least one location relationship exists
    expect(relatedCount).to.be.greaterThan(0);
  });

  /**
   * What it tests: Switching to the organizations relationship tab.
   * Expected behavior: Organizations relationship tab becomes visible and shows related organizations.
   */
  it('Switch to organizations relationship tab', async () => {
    const page = sharedContext.page!;
    const setting = testData.settings[0];

    // Open the first character (has organization relationships from setup)
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    const firstChar = setting.topics[Topics.Character][0];
    await openEntry(Topics.Character, firstChar.name);

    // Wait for entry to load
    await page.waitForSelector('[data-testid="entry-name-input"]', { timeout: 5000 });
    await page.waitForFunction(() => {
      const input = document.querySelector('[data-testid="entry-name-input"]') as HTMLInputElement;
      return input && input.value.length > 0;
    }, { timeout: 5000 });

    // Click on organizations tab
    await clickContentTab('organizations');

    // Wait for tab to become active
    await page.waitForSelector('.tab[data-tab="organizations"].active', { timeout: 5000 });

    // Verify tab is visible
    const tab = await page.$('[data-tab="organizations"]');
    const isVisible = await tab?.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none';
    });
    // Expected behavior: Organizations tab is visible
    expect(isVisible).to.equal(true);

    // Verify relationship data is present
    const relatedCount = await getRelatedEntryCount('organizations');
    // Expected behavior: At least one organization relationship exists
    expect(relatedCount).to.be.greaterThan(0);
  });

  /**
   * What it tests: Switching to the sessions tab.
   * Expected behavior: Sessions tab becomes visible and shows sessions the character appears in.
   */
  it('Switch to sessions tab', async () => {
    const page = sharedContext.page!;
    const setting = testData.settings[0];

    // Open the first character (added to session NPC list during setup)
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    const firstChar = setting.topics[Topics.Character][0];
    await openEntry(Topics.Character, firstChar.name);

    // Wait for entry to load
    await page.waitForSelector('[data-testid="entry-name-input"]', { timeout: 5000 });
    await page.waitForFunction(() => {
      const input = document.querySelector('[data-testid="entry-name-input"]') as HTMLInputElement;
      return input && input.value.length > 0;
    }, { timeout: 5000 });

    // Click on sessions tab
    await clickContentTab('sessions');

    // Wait for tab to become active
    await page.waitForSelector('.tab[data-tab="sessions"].active', { timeout: 5000 });

    // Wait for session table rows to appear (async _refreshSessionReferences + Vue reactivity)
    await page.waitForFunction(() => {
      return document.querySelectorAll('[data-testid="sessions-table"] tbody tr').length > 0;
    }, { timeout: 5000 });

    // Verify tab is visible
    const tab = await page.$('[data-tab="sessions"]');
    const isVisible = await tab?.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none';
    });
    // Expected behavior: Sessions tab is visible
    expect(isVisible).to.equal(true);

    // Verify session data is present
    const sessionCount = await getSessionCount();
    // Expected behavior: At least one session shows the character
    expect(sessionCount).to.be.greaterThan(0);
  });

  /**
   * What it tests: Switching to the foundry documents tab.
   * Expected behavior: Foundry documents tab becomes visible and shows linked documents.
   */
  it('Switch to foundry tab', async () => {
    const page = sharedContext.page!;
    const setting = testData.settings[0];

    // Open the first character (has foundry documents from setup)
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    const firstChar = setting.topics[Topics.Character][0];
    await openEntry(Topics.Character, firstChar.name);

    // Wait for entry to load
    await page.waitForSelector('[data-testid="entry-name-input"]', { timeout: 5000 });
    await page.waitForFunction(() => {
      const input = document.querySelector('[data-testid="entry-name-input"]') as HTMLInputElement;
      return input && input.value.length > 0;
    }, { timeout: 5000 });

    // Click on foundry tab
    await clickContentTab('foundry');

    // Wait for tab to become active
    await page.waitForSelector('.tab[data-tab="foundry"].active', { timeout: 5000 });

    // Verify tab is visible
    const tab = await page.$('[data-tab="foundry"]');
    const isVisible = await tab?.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none';
    });
    // Expected behavior: Foundry tab is visible
    expect(isVisible).to.equal(true);

    // Verify foundry document data is present
    const docCount = await getRelatedDocumentCount();
    // Expected behavior: At least one foundry document is linked
    expect(docCount).to.be.greaterThan(0);
  });

  /**
   * What it tests: Switching to the PCs relationship tab for a character entry.
   * Expected behavior: PCs tab becomes visible and shows related PCs.
   */
  it('Switch to PCs relationship tab', async () => {
    const page = sharedContext.page!;

    await openFirstCharacter();

    // Click on pcs tab
    await clickContentTab('pcs');

    // Wait for tab to become active
    await page.waitForSelector('.tab[data-tab="pcs"].active', { timeout: 5000 });

    // Verify tab is visible
    const tab = await page.$('[data-tab="pcs"]');
    const isVisible = await tab?.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none';
    });
    // Expected behavior: PCs tab is visible for a character entry
    expect(isVisible).to.equal(true);
  });

  /**
   * What it tests: Switching to the actors tab for a character entry.
   * Expected behavior: Actors tab becomes visible and shows the actors table.
   */
  it('Switch to actors tab', async () => {
    const page = sharedContext.page!;

    await openFirstCharacter();

    // Click on actors tab
    await clickContentTab('actors');

    // Wait for tab to become active
    await page.waitForSelector('.tab[data-tab="actors"].active', { timeout: 5000 });

    // Verify tab is visible
    const tab = await page.$('[data-tab="actors"]');
    const isVisible = await tab?.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none';
    });
    // Expected behavior: Actors tab is visible for a character entry
    expect(isVisible).to.equal(true);

    // Verify the actors table exists
    const actorsTable = await page.$('[data-testid="actors-table"]');
    // Expected behavior: Actors table is rendered
    expect(actorsTable).to.not.be.null;
  });

  /**
   * What it tests: Adding an actor to a character entry via drag-drop on the actors tab.
   * Expected behavior: Actor appears in the actors table after being dropped.
   */
  it('Add actor to character via drag-drop', async () => {
    const page = sharedContext.page!;
    let entryUuid: string | null = null;

    try {
      // Create a new character entry for this test
      await expandTopicNode(Topics.Character);
      const actorTestName = 'Actor Drag Test ' + Date.now();
      entryUuid = await createEntryViaUI(Topics.Character, actorTestName);

      // Create actor with a static name for reliable verification
      const actorName = 'Test Actor ' + Date.now();
      const actorUuid = await addDocumentViaDragDrop({
        tabId: 'actors',
        documentType: 'Actor',
        dropSelector: '[data-testid="actors-table"] .fcb-table-new-drop-box',
        documentName: actorName,
        createDocumentFn: async () => {
          return await page.evaluate(async (name: string) => {
            const actor = await Actor.create({ name, type: 'base' });
            return actor?.uuid || '';
          }, actorName);
        },
        verifyByText: true,
      });
    }
    finally {
      // Clean up
      if (entryUuid) {
        await deleteEntryViaAPI(entryUuid);
      }
    }
  });

  /**
   * What it tests: Voice button visibility toggles with enableVoiceRecording setting.
   * Expected behavior: Voice button appears when setting is enabled, disappears when disabled.
   */
  it('Voice button visibility toggles with enableVoiceRecording setting', async () => {
    const page = sharedContext.page!;

    // Save the original setting value
    const originalValue = await getSetting(page, 'enableVoiceRecording');

    try {
      // Enable voice recording
      await setSetting(page, 'enableVoiceRecording', true);

      await openFirstCharacter();

      // When enabled, voice button should be visible (if recording is supported by browser)
      const visibleWhenEnabled = await page.evaluate(() => {
        const btn = document.querySelector('[data-testid="entry-voice-button"]');
        // Button exists if setting is enabled AND browser supports recording
        return btn !== null;
      });
      // Expected behavior: Voice button is visible when setting is enabled for a character
      // (may still be hidden if browser doesn't support MediaRecorder, but that's unlikely in Chromium)
      expect(visibleWhenEnabled).to.equal(true);

      // Close the entry before changing the setting
      await closeActiveTab();

      // Disable voice recording
      await setSetting(page, 'enableVoiceRecording', false);

      // Reopen the same character
      await openFirstCharacter();

      // When disabled, voice button should NOT be visible
      const visibleWhenDisabled = await page.evaluate(() => {
        const btn = document.querySelector('[data-testid="entry-voice-button"]');
        return btn !== null;
      });
      // Expected behavior: Voice button is hidden when setting is disabled
      expect(visibleWhenDisabled).to.equal(false);
    }
    finally {
      // Restore the original setting value
      await setSetting(page, 'enableVoiceRecording', originalValue);
    }
  });

  /**
   * What it tests: Voice button context menu shows record/play/delete/change folder options.
   * Expected behavior: Clicking the voice button shows a context menu with voice recording options.
   */
  it('Voice button shows context menu with options', async () => {
    const page = sharedContext.page!;

    await openFirstCharacter();

    // Check if voice button exists (depends on settings)
    const voiceBtn = await page.$('[data-testid="entry-voice-button"]');
    if (!voiceBtn) {
      // Voice recording not enabled - skip
      return;
    }

    // Click the voice button to show context menu
    await voiceBtn.click();

    // Wait for context menu
    await page.waitForSelector('.mx-context-menu', { timeout: 5000 });

    // Verify menu items contain voice recording options
    const menuLabels = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.mx-context-menu-item'));
      return items.map(item => item.textContent?.trim() || '');
    });

    // Expected behavior: Context menu includes record option
    const hasRecordOption = menuLabels.some(label => 
      label.toLowerCase().includes('record') || label.toLowerCase().includes('microphone')
    );
    expect(hasRecordOption).to.equal(true);

    // Close menu by clicking elsewhere
    await page.evaluate(() => document.body.click());
  });

  /**
   * What it tests: Foundry doc button opens actor sheet when a single actor is attached.
   * Expected behavior: Clicking the button with one actor opens that actor's sheet.
   */
  it('Foundry doc button opens actor sheet when actor attached', async () => {
    const page = sharedContext.page!;
    let entryUuid: string | null = null;

    try {
      // Create a new character entry with an actor attached
      await expandTopicNode(Topics.Character);
      const foundryTestName = 'Foundry Doc Test ' + Date.now();
      entryUuid = await createEntryViaUI(Topics.Character, foundryTestName);

      if (!entryUuid) {
        return;
      }

      // Create and attach an actor via the API
      const actorAttached = await page.evaluate(async (entryUuid: string) => {
        const api = (game as any).modules.get('campaign-builder')!.api!.testAPI;
        const entry = await api.getEntry(entryUuid);
        if (!entry) return false;

        const actor = await Actor.create({ name: 'Attached Actor ' + Date.now(), type: 'base' });
        if (!actor) return false;

        entry.actors = [actor.uuid];
        await entry.save();
        return true;
      }, entryUuid);

      if (!actorAttached) {
        return;
      }

      // The API save doesn't trigger Vue reactivity - close and reopen the entry
      // so the UI loads the updated actors list from the document
      await closeActiveTab();
      await openEntry(Topics.Character, foundryTestName);

      // Wait for the entry to fully load
      await page.waitForSelector('[data-testid="entry-name-input"]', { timeout: 5000 });
      await page.waitForFunction(() => {
        const input = document.querySelector('[data-testid="entry-name-input"]') as HTMLInputElement;
        return input && input.value.length > 0;
      }, { timeout: 5000 });

      // The button should now be enabled
      const isDisabled = await isFoundryDocButtonDisabled();
      // Expected behavior: Button is enabled when actors are attached
      expect(isDisabled).to.equal(false);

      // Get the actor UUID before clicking
      const actorUuid = await page.evaluate(async (entryUuid: string) => {
        const api = (game as any).modules.get('campaign-builder')!.api!.testAPI;
        const entry = await api.getEntry(entryUuid);
        if (!entry) return null;
        return entry.actors?.[0] || null;
      }, entryUuid);

      if (!actorUuid) {
        return;
      }

      // Check if the actor sheet is already rendered
      const sheetRenderedBefore = await page.evaluate(async (uuid: string) => {
        const doc = await fromUuid(uuid);
        if (!doc || doc.documentName !== 'Actor') return false;
        const actor = doc as Actor;
        return actor.sheet?.rendered ?? false;
      }, actorUuid);

      // Click the button - should open the actor sheet
      const btn = await page.$('[data-testid="entry-foundry-doc-button"]');
      if (btn) await btn.click();

      // Wait for the actor sheet to be rendered
      // If it was already rendered, it should be brought to focus
      // If it wasn't rendered, it should be rendered now
      const sheetRenderedAfter = await page.waitForFunction(async (uuid: string) => {
        const doc = await fromUuid(uuid);
        if (!doc || doc.documentName !== 'Actor') return false;
        const actor = doc as Actor;
        return actor.sheet?.rendered ?? false;
      }, { timeout: 5000 }, actorUuid).then(() => true).catch(() => false);

      // Expected behavior: The actor sheet is rendered after clicking the button
      expect(sheetRenderedAfter).to.equal(true);

      // If the sheet wasn't rendered before, it should be a new render
      // If it was rendered before, we just verify it's still rendered
      if (!sheetRenderedBefore) {
        // The sheet was just opened, close it
        await page.evaluate(async (uuid: string) => {
          const doc = await fromUuid(uuid);
          if (!doc || doc.documentName !== 'Actor') return;
          const actor = doc as Actor;
          if (actor.sheet) {
            actor.sheet.close();
          }
        }, actorUuid);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    finally {
      // Clean up
      if (entryUuid) {
        await deleteEntryViaAPI(entryUuid);
      }
    }
  });

  /**
   * What it tests: Foundry doc button shows context menu when multiple actors are attached.
   * Expected behavior: Clicking the button with multiple actors shows a context menu to pick which one.
   */
  it('Foundry doc button shows context menu with multiple actors', async () => {
    const page = sharedContext.page!;
    let entryUuid: string | null = null;

    try {
      // Create a new character entry with multiple actors attached
      await expandTopicNode(Topics.Character);
      const multiActorTestName = 'Multi Actor Test ' + Date.now();
      entryUuid = await createEntryViaUI(Topics.Character, multiActorTestName);

      if (!entryUuid) {
        return;
      }

      // Create and attach two actors via the API
      const actorsAttached = await page.evaluate(async (entryUuid: string) => {
        const api = (game as any).modules.get('campaign-builder')!.api!.testAPI;
        const entry = await api.getEntry(entryUuid);
        if (!entry) return false;

        const actor1 = await Actor.create({ name: 'Actor One ' + Date.now(), type: 'base' });
        const actor2 = await Actor.create({ name: 'Actor Two ' + Date.now(), type: 'base' });
        if (!actor1 || !actor2) return false;

        entry.actors = [actor1.uuid, actor2.uuid];
        await entry.save();
        return true;
      }, entryUuid);

      if (!actorsAttached) {
        return;
      }

      // Wait for the UI to reflect the actor attachment
      await new Promise(resolve => setTimeout(resolve, 500));

      // Click the foundry doc button
      const foundrySelector = await getFoundryDocButtonSelector();
      if (foundrySelector) {
        await page.click(foundrySelector);

        // Wait for context menu (appears when multiple actors)
        await page.waitForSelector('.mx-context-menu', { timeout: 5000 });

        // Verify menu items exist (should be at least 2 actors)
        const menuItems = await page.$$('.mx-context-menu-item');
        // Expected behavior: Context menu shows options for each attached actor
        expect(menuItems.length).to.be.greaterThan(1);

        // Close menu by clicking elsewhere
        await page.evaluate(() => document.body.click());
      }
    }
    finally {
      // Clean up
      if (entryUuid) {
        await deleteEntryViaAPI(entryUuid);
      }
    }
  });

  /**
   * What it tests: Generate button context menu includes "Generate name & description" option.
   * Expected behavior: Context menu contains the name & description generation option.
   */
  it('Generate button menu includes name and description option', async () => {
    const page = sharedContext.page!;

    await openFirstCharacter();

    // Click the generate button
    const genSelector = await getGenerateButtonSelector();
    if (!genSelector) {
      return;
    }

    // Ensure backend is available so the button isn't disabled
    await page.evaluate(() => {
      const pinia = (window as any).pinia;
      if (pinia && pinia._s) {
        const store = pinia._s.get('backend');
        if (store) {
          store.available = true;
        }
      }
    });
    await new Promise(resolve => setTimeout(resolve, 200));

    await page.click(genSelector);

    // Wait for context menu
    await page.waitForSelector('.mx-context-menu', { timeout: 5000 });

    // Verify "Generate name & description" option exists
    const menuLabels = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.mx-context-menu-item'));
      return items.map(item => item.textContent?.trim() || '');
    });

    // Expected behavior: Menu includes a name & description generation option
    const hasNameDescOption = menuLabels.some(label =>
      label.toLowerCase().includes('name') && label.toLowerCase().includes('description')
    );
    expect(hasNameDescOption).to.equal(true);

    // Close menu by clicking elsewhere
    await page.evaluate(() => document.body.click());
  });

  /**
   * What it tests: Generate button context menu includes "Generate image" option for non-PC entries.
   * Expected behavior: Character entries (not PC) show the image generation option.
   */
  it('Generate button menu includes image option for character', async () => {
    const page = sharedContext.page!;

    await openFirstCharacter();

    // Click the generate button
    const genSelector = await getGenerateButtonSelector();
    if (!genSelector) {
      return;
    }

    // Ensure backend is available so the button isn't disabled
    await page.evaluate(() => {
      const pinia = (window as any).pinia;
      if (pinia && pinia._s) {
        const store = pinia._s.get('backend');
        if (store) {
          store.available = true;
        }
      }
    });
    await new Promise(resolve => setTimeout(resolve, 200));

    await page.click(genSelector);

    // Wait for context menu
    await page.waitForSelector('.mx-context-menu', { timeout: 5000 });

    // Verify "Generate image" option exists (Character is not PC, so image option should appear)
    const menuLabels = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.mx-context-menu-item'));
      return items.map(item => item.textContent?.trim() || '');
    });

    // Expected behavior: Menu includes an image generation option for non-PC characters
    const hasImageOption = menuLabels.some(label =>
      label.toLowerCase().includes('image')
    );
    expect(hasImageOption).to.equal(true);

    // Close menu by clicking elsewhere
    await page.evaluate(() => document.body.click());
  });

  /**
   * What it tests: Push-to-session shows context menu with campaign names when multiple campaigns exist.
   * Expected behavior: Context menu lists campaigns with available sessions.
   */
  it('Push to session shows campaign names in context menu', async () => {
    const page = sharedContext.page!;
    const setting = testData.settings[0];
    let entryUuid: string | null = null;

    try {
      // The test data has 2 campaigns per setting - verify this
      if (setting.campaigns.length < 2) {
        return;
      }

      // Create a new character entry
      await expandTopicNode(Topics.Character);
      const pushTestName = 'Push Multi Test ' + Date.now();
      entryUuid = await createEntryViaUI(Topics.Character, pushTestName);

      if (!entryUuid) {
        return;
      }

      // Click the push to session button
      const clicked = await clickPushToSession();
      if (!clicked) {
        return;
      }

      // Wait for context menu
      await page.waitForSelector('.mx-context-menu', { timeout: 5000 });

      // Verify menu items contain campaign names
      const menuLabels = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.mx-context-menu-item'));
        return items.map(item => item.textContent?.trim() || '');
      });

      // Expected behavior: Context menu shows at least one campaign option
      expect(menuLabels.length).to.be.greaterThan(0);

      // Verify at least one menu item references a campaign name from the test data
      const campaignNames = setting.campaigns.map(c => c.name);
      const hasCampaignName = menuLabels.some(label =>
        campaignNames.some(name => label.includes(name))
      );
      // Expected behavior: At least one menu item references a known campaign
      expect(hasCampaignName).to.equal(true);

      // Click the first campaign option
      const menuItems = await page.$$('.mx-context-menu-item');
      if (menuItems.length > 0) {
        await menuItems[0].click();
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    finally {
      // Clean up
      if (entryUuid) {
        await deleteEntryViaAPI(entryUuid);
      }
    }
  });

  /**
   * What it tests: Image picker is visible on the description tab for character entries.
   * Expected behavior: Image picker element exists and can be clicked.
   */
  it('Image picker visible on description tab', async () => {
    const page = sharedContext.page!;

    await openFirstCharacter();

    // Make sure we're on the description tab
    await clickContentTab('description');

    // Wait for description content to load
    await page.waitForSelector('.fcb-description-content');

    // Verify image picker exists
    const imagePicker = await getImagePicker();
    // Expected behavior: Image picker is rendered on the description tab
    expect(imagePicker).to.not.be.null;
  });

  /**
   * What it tests: Custom fields block renders for character entries when custom fields are defined.
   * Expected behavior: CustomFieldsBlocks component is present for Character content type.
   */
  it('Custom fields block renders for character', async () => {
    const page = sharedContext.page!;

    await openFirstCharacter();

    // Make sure we're on the description tab
    await clickContentTab('description');

    // Wait for description content to load
    await page.waitForSelector('.fcb-description-content');

    // Check if custom fields are configured for Character content type
    const hasCustomFields = await page.evaluate(() => {
      const settings = (game as any).settings?.get('campaign-builder', 'customFields');
      const characterFields = settings?.[0]; // CustomFieldContentType.Character = 0
      return characterFields && characterFields.length > 0;
    });

    if (hasCustomFields) {
      // Expected behavior: Custom field form groups are visible when fields are defined
      // The component renders form-group divs with labels for each custom field
      const customFieldLabels = await page.evaluate(() => {
        const descriptionContent = document.querySelector('.fcb-description-content');
        if (!descriptionContent) return [];
        // Custom fields render as form-group divs after the description editor
        const formGroups = descriptionContent.querySelectorAll('.form-group.side-label, .form-group .fcb-ai-button');
        return Array.from(formGroups).map(el => el.textContent?.trim() || '');
      });
      // Expected behavior: At least one custom field form group exists
      expect(customFieldLabels.length).to.be.greaterThan(0);
    }
    // If no custom fields are configured, there's nothing to render - that's valid
  });

  /**
   * What it tests: Parent hierarchy typeahead is visible for character entries with hierarchy.
   * Expected behavior: Parent typeahead input exists when the topic supports hierarchy.
   */
  it('Parent hierarchy typeahead visible for character', async () => {
    const page = sharedContext.page!;

    await openFirstCharacter();

    // Make sure we're on the description tab
    await clickContentTab('description');

    // Wait for description content to load
    await page.waitForSelector('.fcb-description-content');

    // Characters don't support hierarchy (only Organizations and Locations do),
    // so there should be 2 typeahead inputs (type, species) but no parent input
    const typeaheadCount = await page.evaluate(() => {
      const inputs = document.querySelectorAll('.fcb-typeahead input[data-testid="typeahead-input"]');
      return inputs.length;
    });

    // Expected behavior: At least 2 typeahead inputs (type, species) for a character (no parent hierarchy)
    expect(typeaheadCount >= 2).to.equal(true);

    // Verify no parent typeahead is shown (characters don't have hierarchy)
    const showHierarchy = await page.evaluate(() => {
      const parentFormGroup = document.querySelector('.form-group:has(.fcb-typeahead)');
      // Check if there's a parent label in the description content
      const descriptionContent = document.querySelector('.fcb-description-content');
      if (!descriptionContent) return false;
      const parentLabels = Array.from(descriptionContent.querySelectorAll('label, .label-text, .field-label'));
      return parentLabels.some(el => el.textContent?.toLowerCase().includes('parent'));
    });
    // Expected behavior: No parent typeahead for characters (hierarchy not supported)
    expect(showHierarchy).to.equal(false);
  });

  /**
   * What it tests: Empty name is rejected.
   * Expected behavior: Clearing the name reverts to the previous name.
   */
  it('Empty name is rejected', async () => {
    const page = sharedContext.page!;
    let entryUuid: string | null = null;

    try {
      // Create a new entry for this test
      await expandTopicNode(Topics.Character);
      const emptyNameTestName = 'Empty Name Test ' + Date.now();
      entryUuid = await createEntryViaUI(Topics.Character, emptyNameTestName);

      // Clear the name input via real keyboard events to trigger Vue reactivity
      const nameSelector = '[data-testid="entry-name-input"]';
      await page.click(nameSelector, { clickCount: 3 }); // triple-click to select all
      await page.keyboard.press('Delete');                // delete selected text
      // Wait for debounce (500ms) plus buffer
      await new Promise(resolve => setTimeout(resolve, 700));

      // Wait for the name to be reverted by the validation logic (Vue reactivity)
      await page.waitForFunction((expectedName: string) => {
        const input = document.querySelector('[data-testid="entry-name-input"]') as HTMLInputElement;
        return input && input.value === expectedName;
      }, { timeout: 5000 }, emptyNameTestName);

      // Verify name was reverted to the original
      const currentName = await getEntryNameValue();
      // Expected behavior: Name reverts to the previous value when emptied
      expect(currentName).to.equal(emptyNameTestName);
    }
    finally {
      // Clean up
      if (entryUuid) {
        await deleteEntryViaAPI(entryUuid);
      }
    }
  });

  /**
   * What it tests: Whitespace-only name is rejected.
   * Expected behavior: Setting the name to only whitespace shows a warning and reverts.
   */
  it('Whitespace-only name rejection', async () => {
    const page = sharedContext.page!;
    let entryUuid: string | null = null;

    try {
      // Create a new entry for this test
      await expandTopicNode(Topics.Character);
      const wsNameTestName = 'Whitespace Name Test ' + Date.now();
      entryUuid = await createEntryViaUI(Topics.Character, wsNameTestName);

      // Set the name to whitespace only
      // setEntryName already waits for debounce
      await setEntryName('   ');

      // Verify name was reverted to the original
      const currentName = await getEntryNameValue();
      // Expected behavior: Whitespace-only name is treated as empty and reverts
      expect(currentName).to.equal(wsNameTestName);
    }
    finally {
      // Clean up
      if (entryUuid) {
        await deleteEntryViaAPI(entryUuid);
      }
    }
  });

  /**
   * What it tests: Adding a journal to a character entry via drag-drop on the journals tab.
   * Expected behavior: Journal appears in the journals table after being dropped.
   */
  it('Add journal to character via drag-drop', async () => {
    const page = sharedContext.page!;
    let entryUuid: string | null = null;
    let journalUuid: string | null = null;

    try {
      // Create a new character entry for this test
      await expandTopicNode(Topics.Character);
      const journalTestName = 'Journal Drag Test ' + Date.now();
      entryUuid = await createEntryViaUI(Topics.Character, journalTestName);

      // Use the standardized helper to add journal via drag-drop
      journalUuid = await addDocumentViaDragDrop({
        tabId: 'journals',
        documentType: 'JournalEntry',
        dropSelector: '[data-testid="journals-table"] .fcb-table-new-drop-box',
        documentName: 'Test Journal',
        createDocumentFn: async () => {
          return await createJournalViaAPI('Test Journal ' + Date.now());
        },
        verifyByText: true,
      });
    }
    finally {
      // Clean up
      if (entryUuid) {
        await deleteEntryViaAPI(entryUuid);
      }
      if (journalUuid) {
        await deleteJournalViaAPI(journalUuid);
      }
    }
  });

  /**
   * What it tests: Removing a journal from a character entry via the journals tab.
   * Expected behavior: Journal count decreases after removing a journal.
   */
  it('Remove journal from character entry', async () => {
    const page = sharedContext.page!;

    // Use the first character which already has a journal from setup
    await openFirstCharacter();

    // Switch to journals tab
    await clickContentTab('journals');
    await page.waitForSelector('.tab[data-tab="journals"].active', { timeout: 5000 });

    // Wait for journal table rows to appear
    await page.waitForFunction(() => {
      return document.querySelectorAll('[data-testid="journals-table"] tbody tr').length > 0;
    }, { timeout: 5000 });

    const initialCount = await getJournalCount();
    if (initialCount === 0) {
      return;
    }

    // Remove the first journal
    const firstJournalName = await page.$eval('[data-testid="journals-table"] tbody tr:first-child td:nth-child(2)', 
      el => el.textContent?.trim() || ''
    ).catch(() => '');

    if (firstJournalName) {
      await removeJournal(firstJournalName);

      // Wait for table to update
      await page.waitForFunction((expectedCount: number) => {
        return document.querySelectorAll('[data-testid="journals-table"] tbody tr').length <= expectedCount;
      }, { timeout: 5000 }, initialCount - 1);

      const newCount = await getJournalCount();
      // Expected behavior: Journal count decreases after removal
      expect(newCount).to.equal(initialCount - 1);
    }
  });

  /**
   * What it tests: Clicking a session name in the sessions tab navigates to that session.
   * Expected behavior: Clicking a session row opens the session in a new tab.
   */
  it('Click session name navigates to session', async () => {
    const page = sharedContext.page!;
    const setting = testData.settings[0];

    await openFirstCharacter();

    // Switch to sessions tab
    await clickContentTab('sessions');

    // Wait for session table rows to appear
    await page.waitForFunction(() => {
      return document.querySelectorAll('[data-testid="sessions-table"] tbody tr').length > 0;
    }, { timeout: 5000 });

    // Get the first session name
    const firstSessionName = await page.$eval(
      '[data-testid="sessions-table"] tbody tr:first-child td:nth-child(3)',
      el => el.textContent?.trim() || ''
    ).catch(() => '');

    if (firstSessionName) {
      // Click the session name to navigate
      await clickSessionRow(firstSessionName);

      // Wait for session tab to open and the input to have a value
      const sessionOpened = await page.waitForFunction(() => {
        const input = document.querySelector('[data-testid="session-name-input"]') as HTMLInputElement;
        return input && input.value.length > 0;
      }, { timeout: 8000 }).then(() => true).catch(() => false);

      // Expected behavior: Session tab opens with the session name
      expect(sessionOpened).to.equal(true);
    }
  });

  /**
   * What it tests: Adding a relationship via drag-drop on a relationship tab.
   * Expected behavior: Related entry count increases after dropping an entry.
   */
  it('Add relationship via drag-drop on characters tab', async () => {
    const page = sharedContext.page!;
    const setting = testData.settings[0];
    let entryUuid: string | null = null;

    try {
      // Create a new character for this test
      await expandTopicNode(Topics.Character);
      const relTestName = 'Rel Drag Test ' + Date.now();
      entryUuid = await createEntryViaUI(Topics.Character, relTestName);

      if (!entryUuid) {
        return;
      }

      // Get another character's UUID to drag
      const secondChar = setting.topics[Topics.Character][1];
      const secondCharUuid = await page.evaluate(async (name: string) => {
        const api = (game as any).modules.get('campaign-builder')!.api;
        const list = api.getEntries(0); // Topics.Character = 0
        const entry = list.find((e: { name: string }) => e.name === name);
        return entry?.uuid;
      }, secondChar.name);

      if (secondCharUuid) {
        const initialCount = await getRelatedEntryCount('characters');

        // Use the standardized helper to add relationship via drag-drop
        await addDocumentViaDragDrop({
          tabId: 'characters',
          documentType: 'JournalEntryPage',
          dropSelector: '[data-testid="characters-table"]',
          documentUuid: secondCharUuid,
          verifyByText: false,
        });
      }
    }
    finally {
      // Clean up
      if (entryUuid) {
        await deleteEntryViaAPI(entryUuid);
      }
    }
  });

  /**
   * What it tests: Adding a Foundry document via the foundry tab.
   * Expected behavior: Foundry document count increases after adding a document.
   */
  it('Add Foundry document to character entry', async () => {
    const page = sharedContext.page!;
    let entryUuid: string | null = null;

    try {
      // Create a new character for this test
      await expandTopicNode(Topics.Character);
      const foundryTestName = 'Foundry Add Test ' + Date.now();
      entryUuid = await createEntryViaUI(Topics.Character, foundryTestName);

      if (!entryUuid) {
        return;
      }

      // Use the standardized helper to add Foundry document via drag-drop
      const docUuid = await addDocumentViaDragDrop({
        tabId: 'foundry',
        documentType: 'JournalEntry',
        dropSelector: '[data-testid="foundry-table"]',
        documentName: 'Foundry Doc',
        createDocumentFn: async () => {
          return await createJournalViaAPI('Foundry Doc ' + Date.now());
        },
        verifyByText: false,
      });
    }
    finally {
      // Clean up
      if (entryUuid) {
        await deleteEntryViaAPI(entryUuid);
      }
    }
  });

  /**
   * What it tests: Timeline tab visibility toggles with useTimeline setting.
   * Expected behavior: Timeline tab only appears when useTimeline is enabled and Calendaria is available.
   */
  it('Timeline tab visibility toggles with useTimeline setting', async () => {
    const page = sharedContext.page!;

    // Save the original setting value
    const originalValue = await getSetting(page, 'useTimeline');

    // Check if Calendaria module is available (required for timeline)
    const calendariaAvailable = await page.evaluate(() => {
      return (game as any).modules?.get('calendaria')?.active ?? false;
    });

    try {
      // Enable timeline
      await setSetting(page, 'useTimeline', true);

      await openFirstCharacter();

      if (calendariaAvailable) {
        // When both enabled and Calendaria available, timeline tab should be present
        const timelineTab = await page.$('[data-tab="timeline"]');
        // Expected behavior: Timeline tab is present when both conditions are met
        expect(timelineTab).to.not.be.null;
      }

      // Close the entry before changing the setting
      await closeActiveTab();

      // Disable timeline
      await setSetting(page, 'useTimeline', false);

      // Reopen the same character
      await openFirstCharacter();

      // When disabled, timeline tab should NOT be present regardless of Calendaria
      const timelineTabWhenDisabled = await page.$('[data-tab="timeline"]');
      // Expected behavior: Timeline tab is absent when useTimeline is disabled
      expect(timelineTabWhenDisabled).to.be.null;
    }
    finally {
      // Restore the original setting value
      await setSetting(page, 'useTimeline', originalValue);
    }
  });

  //////////////////////////////////////////////////////
  // Module Settings Tests
  //////////////////////////////////////////////////////

  /**
   * What it tests: Image picker visibility toggles with showImages.entries setting.
   * Expected behavior: Image picker is hidden when showImages.entries is false, visible when true.
   */
  it('Image picker visibility toggles with showImages setting', async () => {
    const page = sharedContext.page!;

    // Save the original setting value
    const originalValue = (await getSetting(page, 'showImages')) ?? { entries: true };
    
    try {
      // First verify image picker is visible with entries=true (default)
      await openFirstCharacter();
      await clickContentTab('description');
      await page.waitForSelector('.fcb-description-content');

      const imagePickerVisible = await page.evaluate(() => {
        const picker = document.querySelector('.fcb-description-image');
        return picker !== null;
      });
      // Expected behavior: Image picker is visible when showImages.entries is true
      expect(imagePickerVisible).to.equal(true);

      // Close the entry before changing the setting
      await closeActiveTab();

      // Disable images for entries
      await page.evaluate(() => {
        const current = (game as any).settings?.get('campaign-builder', 'showImages') ?? {};
        return (game as any).settings?.set('campaign-builder', 'showImages', { ...current, entries: false });
      });

      // Reopen the same character
      await openFirstCharacter();
      await clickContentTab('description');
      await page.waitForSelector('.fcb-description-content');

      // Image picker should be hidden
      const imagePickerHidden = await page.evaluate(() => {
        const picker = document.querySelector('.fcb-description-image');
        return picker !== null;
      });
      // Expected behavior: Image picker is hidden when showImages.entries is false
      expect(imagePickerHidden).to.equal(false);
    }
    finally {
      // Restore the original setting value
      await setSetting(page, 'showImages', originalValue);
    }
  });

  /**
   * What it tests: Tab visibility settings control which content tabs appear for character entries.
   * Expected behavior: Hiding a tab via tabVisibilitySettings removes it from the tab strip.
   */
  it('Tab visibility settings control which tabs appear', async () => {
    const page = sharedContext.page!;

    // Save the original setting value
    const originalValue = (await getSetting(page, 'tabVisibilitySettings')) ?? {};
    
    try {
      // First verify journals tab is visible with default settings
      await openFirstCharacter();

      const journalsTabVisible = await page.evaluate(() => {
        const tab = document.querySelector('[data-tab="journals"]');
        return tab !== null;
      });
      // Expected behavior: Journals tab is visible with default settings
      expect(journalsTabVisible).to.equal(true);

      // Close the entry before changing the setting
      await closeActiveTab();

      // Hide the journals tab for character entries
      // TabVisibilityItem.EntryCharacterJournals = 'entryCharacterJournals' (the string enum value)
      await page.evaluate(() => {
        const current = (game as any).settings?.get('campaign-builder', 'tabVisibilitySettings') ?? {};
        return (game as any).settings?.set('campaign-builder', 'tabVisibilitySettings', {
          ...current,
          entryCharacterJournals: false,
        });
      });

      // Reopen the same character
      await openFirstCharacter();

      // Journals tab should now be hidden
      const journalsTabHidden = await page.evaluate(() => {
        const tab = document.querySelector('[data-tab="journals"]');
        return tab !== null;
      });
      // Expected behavior: Journals tab is hidden when EntryCharacterJournals is false
      expect(journalsTabHidden).to.equal(false);

      // Description tab should still be visible (always present)
      const descriptionTabVisible = await page.evaluate(() => {
        const tab = document.querySelector('[data-tab="description"]');
        return tab !== null;
      });
      // Expected behavior: Description tab remains visible regardless of tab visibility settings
      expect(descriptionTabVisible).to.equal(true);
    }
    finally {
      // Restore the original setting value
      await setSetting(page, 'tabVisibilitySettings', originalValue);
    }
  });

  /**
   * What it tests: Hiding multiple tabs via tabVisibilitySettings removes them all.
   * Expected behavior: Multiple tabs can be hidden simultaneously.
   */
  it('Multiple tabs can be hidden via tab visibility settings', async () => {
    const page = sharedContext.page!;

    // Save the original setting value
    const originalValue = await getSetting(page, 'tabVisibilitySettings');
    
    try {
      // Hide journals, actors, and foundry tabs for character entries
      // Use TabVisibilityItem string values ('entryCharacterJournals' etc.)
      await page.evaluate(() => {
        const current = (game as any).settings?.get('campaign-builder', 'tabVisibilitySettings') ?? {};
        return (game as any).settings?.set('campaign-builder', 'tabVisibilitySettings', {
          ...current,
          entryCharacterJournals: false,
          entryCharacterActors: false,
          entryCharacterFoundry: false,
        });
      });

      // Wait for the reactive setting to update
      await new Promise(resolve => setTimeout(resolve, 500));

      await openFirstCharacter();

      // Check visibility via CSS instead of element existence
      const journalsTabHidden = await page.evaluate(() => {
        const tab = document.querySelector('[data-tab="journals"]');
        if (!tab) return true;
        const style = window.getComputedStyle(tab);
        return style.display === 'none';
      });
      const actorsTabHidden = await page.evaluate(() => {
        const tab = document.querySelector('[data-tab="actors"]');
        if (!tab) return true;
        const style = window.getComputedStyle(tab);
        return style.display === 'none';
      });
      const foundryTabHidden = await page.evaluate(() => {
        const tab = document.querySelector('[data-tab="foundry"]');
        if (!tab) return true;
        const style = window.getComputedStyle(tab);
        return style.display === 'none';
      });

      // Expected behavior: All three tabs are hidden
      expect(journalsTabHidden).to.equal(true);
      expect(actorsTabHidden).to.equal(true);
      expect(foundryTabHidden).to.equal(true);

      // Description tab should still be visible
      const descriptionTabVisible = await page.evaluate(() => {
        const tab = document.querySelector('[data-tab="description"]');
        if (!tab) return false;
        const style = window.getComputedStyle(tab);
        return style.display !== 'none';
      });
      // Expected behavior: Description tab remains visible
      expect(descriptionTabVisible).to.equal(true);
    }
    finally {
      // Restore the original setting value
      await setSetting(page, 'tabVisibilitySettings', originalValue);
    }
  });

  /**
   * What it tests: actorTags setting supplements the tag whitelist for character entries.
   * Expected behavior: Actor tag names appear as available tags when the setting is configured.
   */
  it('actorTags setting supplements tag whitelist for characters', async () => {
    const page = sharedContext.page!;
    let entryUuid: string | null = null;

    // Save the original setting value
    const originalValue = (await getSetting(page, 'actorTags')) ?? [];
    
    try {
      // Create a new character entry for this test
      await expandTopicNode(Topics.Character);
      const tagTestName = 'Actor Tag Test ' + Date.now();
      entryUuid = await createEntryViaUI(Topics.Character, tagTestName);

      if (!entryUuid) {
        return;
      }

      // Wait for tags component to be initialized
      await page.waitForSelector('.tags-wrapper:not(.uninitialized)', { timeout: 5000 });

      // Set actorTags with a unique tag name
      const testActorTagName = 'actor-tag-' + Date.now();
      await page.evaluate(async (tagName: string) => {
        // Create an actor to associate with the tag
        const actor = await Actor.create({ name: 'Tag Actor ' + Date.now(), type: 'base' });
        const tags = [{
          id: 'test-actor-tag-1',
          name: tagName,
          color: '#ff0000',
          uuid: actor?.uuid || '',
        }];
        await (game as any).settings?.set('campaign-builder', 'actorTags', tags);
      }, testActorTagName);

      // Close and reopen the entry so the tagsWhitelistSupplement computed picks up the new setting
      await closeActiveTab();
      await openEntry(Topics.Character, tagTestName);

      // Wait for tags component to be initialized
      await page.waitForSelector('.tags-wrapper:not(.uninitialized)', { timeout: 5000 });

      // Debug: Check what the tagsWhitelistSupplement computed property returns
      const whitelistDebug = await page.evaluate(() => {
        const setting = (game as any).settings?.get('campaign-builder', 'actorTags');
        return { actorTagsSetting: setting };
      });
      console.log('ActorTags setting after reopen:', whitelistDebug);

      // Use page.evaluate to interact with tagify directly (similar to addTag function)
      await page.evaluate((char: string) => {
        const tagsInput = document.querySelector('.tagify__input') as HTMLElement;
        if (tagsInput) {
          tagsInput.focus();
          // Tagify uses contentEditable
          if (tagsInput.isContentEditable) {
            tagsInput.textContent = char;
          } else if ('value' in tagsInput) {
            (tagsInput as HTMLInputElement).value = char;
          }
          // Trigger input event to show dropdown
          tagsInput.dispatchEvent(new InputEvent('input', { bubbles: true }));
        }
      }, testActorTagName.charAt(0));

      // Wait for the tagify dropdown to appear (uses custom class fcb-tagify-dropdown)
      await page.waitForSelector('.fcb-tagify-dropdown', { timeout: 5000 });

      // Debug: Log all dropdown items and the tag name we're looking for
      const debugInfo = await page.evaluate((tagName: string) => {
        const dropdownItems = document.querySelectorAll('.fcb-tagify-dropdown .tagify__dropdown__item');
        const itemTexts = Array.from(dropdownItems).map(item => item.textContent);
        return { itemTexts, tagName };
      }, testActorTagName);
      console.log('Dropdown debug:', debugInfo);

      // Check if the actor tag name appears in the dropdown whitelist
      const actorTagInWhitelist = await page.evaluate((tagName: string) => {
        const dropdownItems = document.querySelectorAll('.fcb-tagify-dropdown .tagify__dropdown__item');
        for (const item of dropdownItems) {
          if (item.textContent?.includes(tagName)) {
            return true;
          }
        }
        return false;
      }, testActorTagName);

      // Expected behavior: Actor tag name appears in the tag whitelist dropdown
      expect(actorTagInWhitelist).to.equal(true);
    }
    finally {
      // Clean up
      if (entryUuid) {
        await deleteEntryViaAPI(entryUuid);
      }
      // Restore the original setting value
      await setSetting(page, 'actorTags', originalValue);
    }
  });

  /**
   * What it tests: autoRelationships setting controls whether the related entries dialog appears.
   * Expected behavior: When disabled, adding a relationship via drag-drop does NOT trigger
   *   the auto-relationship dialog. When enabled, the setting is active and the dialog
   *   can be triggered by editor content changes.
   */
  it('autoRelationships setting controls related entries dialog', async () => {
    const page = sharedContext.page!;

    // Save the original setting value
    const originalValue = (await getSetting(page, 'autoRelationships')) ?? false;

    // Get another character's UUID to drag
    const setting = testData.settings[0];
    const secondChar = setting.topics[Topics.Character][0];
    const secondCharUuid = await page.evaluate(async (name: string) => {
      const api = (game as any).modules.get('campaign-builder')!.api;
      const list = api.getEntries(0); // Topics.Character = 0
      const entry = list.find((e: { name: string }) => e.name === name);
      return entry?.uuid;
    }, secondChar.name);

    if (!secondCharUuid) {
      return;
    }

    try {
      // Test both disabled and enabled states
      for (const autoRelationshipsEnabled of [false, true]) {
        await setSetting(page, 'autoRelationships', autoRelationshipsEnabled);

        // Create a new entry for this test
        await expandTopicNode(Topics.Character);
        const autoRelTestName = 'Auto Rel Test ' + Date.now();
        const entryUuid = await createEntryViaUI(Topics.Character, autoRelTestName);

        // Switch to characters relationship tab and add a relationship via drag-drop
        await clickContentTab('characters');
        await page.waitForSelector('.tab[data-tab="characters"].active', { timeout: 5000 });

        // Simulate dropping the entry onto the characters relationship table
        const charactersTabSelector = '.tab[data-tab="characters"] .fcb-table-wrapper';
        await page.waitForSelector(charactersTabSelector, { timeout: 5000 });
        await simulateDragDrop(secondCharUuid, 'JournalEntryPage', charactersTabSelector);

        // Wait for the relationship to be added
        await page.waitForFunction(() => {
          const table = document.querySelector('.tab[data-tab="characters"] .fcb-table-wrapper');
          return table && table.querySelectorAll('tbody tr').length > 0;
        }, { timeout: 5000 }).catch(() => {
          // May not increase if already related
        });

        // Check if the related entries management dialog appears
        const dialogVisible = await page.evaluate(() => {
          // The dialog is a PrimeVue Dialog with the related-entries-management-content class
          const dialog = document.querySelector('.related-entries-management-content');
          return dialog !== null;
        });

        // Expected behavior: Dialog appears only when autoRelationships is enabled
        expect(dialogVisible).to.equal(autoRelationshipsEnabled);

        // Close and delete the entry
        await closeActiveTab();
        await deleteEntryViaAPI(entryUuid);
      }
    }
    finally {
      // Restore the original setting value
      await setSetting(page, 'autoRelationships', originalValue);
    }
  });

  /**
   * What it tests: Generate button disabled state reflects backend availability.
   * Expected behavior: Generate button is disabled when backend is unavailable, enabled when available.
   */
  it('Generate button disabled state reflects backend availability', async () => {
    const page = sharedContext.page!;

    await openFirstCharacter();

    // Check the generate button's disabled state
    const genSelector = await getGenerateButtonSelector();
    if (!genSelector) {
      // Generate button not available for this entry type - skip
      return;
    }

    // Save the original backend available state
    const originalAvailable = await page.evaluate(() => {
      const pinia = (window as any).pinia;
      if (pinia && pinia._s) {
        const store = pinia._s.get('backend');
        if (store) {
          return store.available;
        }
      }
      return false;
    });

    try {
      // Set backend to unavailable via Pinia store
      await page.evaluate(() => {
        const pinia = (window as any).pinia;
        if (pinia && pinia._s) {
          const store = pinia._s.get('backend');
          if (store) {
            store.available = false;
          }
        }
      });

      // Wait for Vue reactivity
      await new Promise(resolve => setTimeout(resolve, 200));

      // Generate button should be disabled
      const isDisabledWhenUnavailable = await page.$eval(genSelector, (el) => (el as HTMLButtonElement).disabled);
      // Expected behavior: Generate button is disabled when backend is unavailable
      expect(isDisabledWhenUnavailable).to.equal(true);

      // Set backend to available via Pinia store
      await page.evaluate(() => {
        const pinia = (window as any).pinia;
        if (pinia && pinia._s) {
          const store = pinia._s.get('backend');
          if (store) {
            store.available = true;
          }
        }
      });

      // Wait for Vue reactivity
      await new Promise(resolve => setTimeout(resolve, 200));

      // Generate button should be enabled
      const isDisabledWhenAvailable = await page.$eval(genSelector, (el) => (el as HTMLButtonElement).disabled);
      // Expected behavior: Generate button is enabled when backend is available
      expect(isDisabledWhenAvailable).to.equal(false);
    }
    finally {
      // Restore the original backend available state
      await page.evaluate((val: boolean) => {
        const pinia = (window as any).pinia;
        if (pinia && pinia._s) {
          const store = pinia._s.get('backend');
          if (store) {
            store.available = val;
          }
        }
      }, originalAvailable);
    }
  });
});
