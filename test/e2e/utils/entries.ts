/**
 * Test utilities for entry operations.
 */

import { sharedContext } from '../sharedContext';
import { Topics, ValidTopic } from '@/types';
import { Locator, getByTestId } from '../helpers';

const topicText: Record<ValidTopic, string> = {
  [Topics.Character]: 'Characters',
  [Topics.Location]: 'Locations',
  [Topics.Organization]: 'Organizations',
  [Topics.PC]: 'PCs',
};

/**
 * Helper delay function to replace deprecated page.waitForTimeout.
 */
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Opens an entry from the directory tree.
 * Assumes the topic folder is already expanded.
 */
export const openEntry = async (topic: ValidTopic, entryName: string): Promise<void> => {
  const page = sharedContext.page!;

  // Wait for entries to be visible
  await page.waitForSelector('.fcb-directory-entry', { timeout: 5000 });

  // Find the entry node with the name
  const entries = await page.$$('.fcb-directory-entry');
  let found = false;
  for (const entry of entries) {
    const text = await entry.evaluate(el => el.textContent);
    if (text?.includes(entryName)) {
      await entry.click();
      found = true;
      break;
    }
  }

  if (!found) {
    throw new Error(`Entry not found: ${entryName}`);
  }

  // Wait for the content to load
  await page.waitForSelector('[data-testid="entry-name-input"]', { timeout: 10000 });
};

/**
 * Gets the entry name input locator.
 */
export const getEntryNameInput = (): Locator => {
  return getByTestId(sharedContext.page!, 'entry-name-input');
};

/**
 * Gets the type select input locator (first typeahead on description tab).
 * Note: Uses a more specific selector to find the type input within the TypeSelect component.
 */
export const getTypeSelectInput = (): Locator => {
  const page = sharedContext.page!;
  // Type is the first typeahead in the description tab
  // Use a function to find it since :first-of-type doesn't work with class selectors
  return new Locator(page, '.fcb-description-content .fcb-typeahead input[data-testid="typeahead-input"]');
};

/**
 * Gets the species select input locator (second typeahead on description tab, for characters).
 * Note: Species input is within the SpeciesSelect component wrapper.
 */
export const getSpeciesSelectInput = (): Locator => {
  const page = sharedContext.page!;
  // Species is the second typeahead in the description tab (after type)
  // Find all typeaheads and return the second one
  return new Locator(page, '.fcb-description-content .fcb-typeahead:nth-child(2) input[data-testid="typeahead-input"]');
};

/**
 * Gets the tags input locator.
 */
export const getTagsInput = (): Locator => {
  return getByTestId(sharedContext.page!, 'tags-input');
};

/**
 * Gets the push to session button locator.
 * Returns null if button doesn't exist.
 */
export const getPushToSessionButton = async (): Promise<Locator | null> => {
  const page = sharedContext.page!;
  const btn = await page.$('[data-testid="entry-push-to-session-button"]');
  if (!btn) return null;
  return getByTestId(page, 'entry-push-to-session-button');
};

/**
 * Gets the generate button locator.
 * Returns null if button doesn't exist.
 */
export const getGenerateButton = async (): Promise<Locator | null> => {
  const page = sharedContext.page!;
  const btn = await page.$('[data-testid="entry-generate-button"]');
  if (!btn) return null;
  return getByTestId(page, 'entry-generate-button');
};

/**
 * Gets the foundry doc button locator.
 * Returns null if button doesn't exist.
 */
export const getFoundryDocButton = async (): Promise<Locator | null> => {
  const page = sharedContext.page!;
  const btn = await page.$('[data-testid="entry-foundry-doc-button"]');
  if (!btn) return null;
  return getByTestId(page, 'entry-foundry-doc-button');
};

/**
 * Gets the voice button locator.
 */
export const getVoiceButton = (): Locator => {
  return getByTestId(sharedContext.page!, 'entry-voice-button');
};

/**
 * Clicks on a tab in the content tab strip.
 */
export const clickContentTab = async (tabId: string): Promise<void> => {
  const page = sharedContext.page!;

  // Find the tab with the data-tab attribute
  const tab = await page.$(`[data-tab="${tabId}"]`);
  if (tab) {
    await tab.click();
    // Wait a bit for the tab to switch
    await delay(100);
  }
};

/**
 * Creates a new entry via the API (for test setup).
 */
export const createEntryViaAPI = async (
  topic: ValidTopic,
  name: string,
  settingName: string
): Promise<string> => {
  const page = sharedContext.page!;

  const uuid = await page.evaluate(
    async ({ topic, name, settingName }: { topic: ValidTopic; name: string; settingName: string }) => {
      const api = (game as any).modules.get('campaign-builder')!.api!.testAPI;
      return await api.createEntry(topic, name, settingName);
    },
    { topic, name, settingName }
  );

  return uuid;
};

/**
 * Deletes an entry via the API (for test cleanup).
 */
export const deleteEntryViaAPI = async (uuid: string): Promise<void> => {
  const page = sharedContext.page!;

  await page.evaluate(async (uuid: string) => {
    const api = (game as any).modules.get('campaign-builder')!.api!.testAPI;
    await api.deleteEntry(uuid);
  }, uuid);
};

/**
 * Gets the current entry name value.
 */
export const getEntryNameValue = async (): Promise<string> => {
  const input = getEntryNameInput();
  return await input.inputValue();
};

/**
 * Sets the entry name (types into the input).
 */
export const setEntryName = async (name: string): Promise<void> => {
  const input = getEntryNameInput();
  await input.fill(name);
  // Wait for debounce (500ms) plus a buffer
  await delay(700);
};

/**
 * Clears the type selection.
 */
export const clearType = async (): Promise<void> => {
  const input = getTypeSelectInput();
  await input.click();
  await input.fill('');
  await delay(200);
};

/**
 * Gets the current type value.
 */
export const getTypeValue = async (): Promise<string> => {
  const page = sharedContext.page!;
  // Get the first typeahead input value
  const input = await page.$('.fcb-typeahead input[data-testid="typeahead-input"]');
  if (!input) return '';
  return await input.evaluate(el => (el as HTMLInputElement).value);
};

/**
 * Selects a type from the type dropdown.
 */
export const selectType = async (typeName: string): Promise<void> => {
  const page = sharedContext.page!;

  // Click on the type input to open dropdown
  const input = getTypeSelectInput();
  await input.click();

  // Wait for dropdown to appear
  await page.waitForSelector('.fcb-ta-dropdown');

  // Find and click the option
  const options = await page.$$('.typeahead-entry');
  for (const option of options) {
    const text = await option.evaluate(el => el.textContent);
    if (text?.includes(typeName)) {
      await option.click();
      break;
    }
  }

  // Wait for save
  await delay(200);
};

/**
 * Adds a new type via the typeahead.
 */
export const addNewType = async (typeName: string): Promise<void> => {
  const page = sharedContext.page!;

  // Click on the type input and clear any existing value
  const input = getTypeSelectInput();
  await input.click();
  await input.fill('');  // Clear existing value
  await input.type(typeName);

  // Wait for dropdown to appear
  await page.waitForSelector('.fcb-ta-dropdown');

  // Click the add option
  const addOption = await page.$('[data-testid="typeahead-add-option"]');
  if (addOption) {
    await addOption.click();
  }

  // Wait for save
  await delay(200);
};

/**
 * Gets the current species value.
 */
export const getSpeciesValue = async (): Promise<string> => {
  const page = sharedContext.page!;
  // Get all typeahead inputs and return the second one (species)
  const inputs = await page.$$('.fcb-typeahead input[data-testid="typeahead-input"]');
  if (inputs.length < 2) return '';
  return await inputs[1].evaluate(el => (el as HTMLInputElement).value);
};

/**
 * Selects a species from the dropdown.
 */
export const selectSpecies = async (speciesName: string): Promise<void> => {
  const page = sharedContext.page!;

  // Click on the species input to open dropdown
  const input = getSpeciesSelectInput();
  await input.click();

  // Wait for dropdown to appear
  await page.waitForSelector('.fcb-ta-dropdown');

  // Find and click the option
  const options = await page.$$('.typeahead-entry');
  for (const option of options) {
    const text = await option.evaluate(el => el.textContent);
    if (text?.includes(speciesName)) {
      await option.click();
      break;
    }
  }

  // Wait for save
  await delay(200);
};

/**
 * Adds a tag to the entry.
 * Note: Tags component uses Tagify library which has a specific input structure.
 */
export const addTag = async (tagName: string): Promise<void> => {
  const page = sharedContext.page!;

  // Wait for tags component to be initialized (class is removed when ready)
  // Use a more robust check that waits for the tagify instance to be ready
  await page.waitForFunction(() => {
    const wrapper = document.querySelector('.tags-wrapper');
    return wrapper && !wrapper.classList.contains('uninitialized');
  }, { timeout: 5000 });

  // Small delay for Tagify to be fully interactive
  await delay(100);

  // Find the tagify input area and type the tag
  // Tagify creates a contenteditable element or input with class tagify__input
  const tagsInput = await page.$('.tagify__input');
  if (tagsInput) {
    await tagsInput.focus();
    await tagsInput.type(tagName);
    await tagsInput.press('Enter');
    // Wait for save
    await delay(500);
  }
};

/**
 * Removes a tag from the entry.
 */
export const removeTag = async (tagName: string): Promise<void> => {
  const page = sharedContext.page!;

  // Find the tag with the name and click its remove button (x)
  const tags = await page.$$('.tagify__tag');
  for (const tag of tags) {
    const text = await tag.evaluate(el => el.textContent);
    if (text?.includes(tagName)) {
      // Tagify uses an 'x' button inside the tag
      const removeBtn = await tag.$('tag-remove, .tagify__tag__removeBtn');
      if (removeBtn) {
        await removeBtn.click();
      } else {
        // Alternative: click the tag itself to trigger removal
        await tag.click();
      }
      break;
    }
  }

  // Wait for save
  await delay(500);
};

/**
 * Clicks a tag to open tag results.
 * Note: Waits for tags to be initialized before attempting to click.
 */
export const clickTag = async (tagName: string): Promise<void> => {
  const page = sharedContext.page!;

  // Wait for tags component to be initialized
  await page.waitForFunction(() => {
    const wrapper = document.querySelector('.tags-wrapper');
    return wrapper && !wrapper.classList.contains('uninitialized');
  }, { timeout: 5000 });

  // Find the tag with the name and click it
  const tags = await page.$$('.tagify__tag');
  for (const tag of tags) {
    const text = await tag.evaluate(el => el.textContent);
    if (text?.includes(tagName)) {
      await tag.click();
      break;
    }
  }

  // Wait for new tab to open
  await delay(200);
};

/**
 * Closes the active tab by clicking its close button.
 */
export const closeActiveTab = async (): Promise<void> => {
  const page = sharedContext.page!;

  // Find the active tab's close button
  const activeTab = await page.$('.fcb-tab.active [data-testid="tab-close-button"]');
  if (activeTab) {
    await activeTab.click();
    await delay(200);
  }
};

/**
 * Closes the tab with the given name.
 */
export const closeTabByName = async (tabName: string): Promise<void> => {
  const page = sharedContext.page!;

  // Find the tab with the name and click its close button
  const tabs = await page.$$('.fcb-tab');
  for (const tab of tabs) {
    const text = await tab.evaluate(el => el.textContent);
    if (text?.includes(tabName)) {
      const closeBtn = await tab.$('[data-testid="tab-close-button"]');
      if (closeBtn) {
        await closeBtn.click();
        await delay(200);
      }
      break;
    }
  }
};

/**
 * Gets the parent typeahead input.
 */
export const getParentInput = (): Locator => {
  return getByTestId(sharedContext.page!, 'typeahead-input');
};

/**
 * Selects a parent for the entry.
 */
export const selectParent = async (parentName: string): Promise<void> => {
  const page = sharedContext.page!;

  // Find the parent input (it's the last typeahead-input on the description tab)
  const inputs = await page.$$('.fcb-typeahead input[data-testid="typeahead-input"]');
  // The parent input should be the last one after type and species
  const parentInput = inputs[inputs.length - 1];
  if (parentInput) {
    await parentInput.click();
    await parentInput.type(parentName);

    // Wait for dropdown
    await page.waitForSelector('.fcb-ta-dropdown');

    // Click the matching option
    const options = await page.$$('.typeahead-entry');
    for (const option of options) {
      const text = await option.evaluate(el => el.textContent);
      if (text?.includes(parentName)) {
        await option.click();
        break;
      }
    }
  }

  // Wait for save
  await delay(200);
};

/**
 * Clicks the push to session button.
 * Returns true if successful, false if button not found or disabled.
 */
export const clickPushToSession = async (): Promise<boolean> => {
  const btn = await getPushToSessionButton();
  if (!btn) return false;
  
  const isDisabled = await btn.evaluate(el => (el as HTMLButtonElement).disabled);
  if (isDisabled) return false;
  
  await btn.click();
  return true;
};

/**
 * Clicks a context menu item by label.
 */
export const clickContextMenuItem = async (label: string): Promise<void> => {
  const page = sharedContext.page!;

  // Wait for context menu to appear
  await page.waitForSelector('.mx-context-menu');

  // Find and click the menu item
  const items = await page.$$('.mx-context-menu-item');
  for (const item of items) {
    const text = await item.evaluate(el => el.textContent);
    if (text?.includes(label)) {
      await item.click();
      break;
    }
  }

  // Wait for action to complete
  await delay(200);
};

/**
 * Gets the player name input (for PCs).
 */
export const getPlayerNameInput = (): Locator => {
  // This is the input for player name in PCContent
  return new Locator(sharedContext.page!, '.fcb-input-name');
};

/**
 * Sets the player name (for PCs).
 */
export const setPlayerName = async (name: string): Promise<void> => {
  const page = sharedContext.page!;

  // Find the player name input (it's the second input after the PC name which is disabled)
  const inputs = await page.$$('.fcb-description-content .fcb-input-name');
  if (inputs.length > 0) {
    await inputs[0].click();
    await inputs[0].evaluate((el, name) => { (el as HTMLInputElement).value = name; }, name);
    await inputs[0].type(''); // Trigger input event
    // Wait for debounce
    await delay(700);
  }
};

/**
 * Gets the current player name value.
 */
export const getPlayerNameValue = async (): Promise<string> => {
  const page = sharedContext.page!;

  const inputs = await page.$$('.fcb-description-content .fcb-input-name');
  if (inputs.length > 0) {
    return await inputs[0].evaluate(el => (el as HTMLInputElement).value);
  }
  return '';
};

/**
 * Waits for a notification to appear.
 */
export const waitForNotification = async (text: string): Promise<void> => {
  const page = sharedContext.page!;

  await page.waitForFunction((text: string) => {
    const notifications = document.querySelectorAll('#notifications .notification');
    return Array.from(notifications).some(n => n.textContent?.includes(text));
  }, {}, text);
};

/**
 * Checks if a notification appeared.
 */
export const hasNotification = async (text: string): Promise<boolean> => {
  const page = sharedContext.page!;

  const notifications = await page.$$('#notifications .notification');
  for (const notif of notifications) {
    const content = await notif.evaluate(el => el.textContent);
    if (content?.includes(text)) {
      return true;
    }
  }
  return false;
};

////////////////////
// Editor utilities
////////////////////

/**
 * Gets the description editor content.
 * Uses page.evaluate to access ProseMirror editor state.
 */
export const getDescriptionEditorContent = async (): Promise<string> => {
  const page = sharedContext.page!;

  return await page.evaluate(() => {
    const editorEl = document.querySelector('.ProseMirror');
    if (!editorEl) return '';
    return editorEl.innerHTML;
  });
};

/**
 * Sets the description editor content.
 * Uses page.evaluate to directly manipulate ProseMirror editor state.
 */
export const setDescriptionEditorContent = async (content: string): Promise<void> => {
  const page = sharedContext.page!;

  await page.evaluate((html: string) => {
    const editorEl = document.querySelector('.ProseMirror');
    if (!editorEl) return;

    // Create a temporary div to parse the HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Dispatch a transaction to replace content
    const view = (editorEl as any).__vue__?.$proseMirrorView;
    if (view) {
      const { EditorState, PluginKey } = (window as any).ProseMirror;
      const { DOMParser } = (window as any).ProseMirror.model;
      const doc = DOMParser.fromSchema(view.state.schema).parse(temp);
      view.dispatch(view.state.tr.replaceWith(0, view.state.doc.content.size, doc.content));
    } else {
      // Fallback: just set innerHTML
      editorEl.innerHTML = html;
    }
  }, content);

  await delay(200);
};

/**
 * Triggers a save on the description editor (Ctrl+S).
 */
export const saveDescriptionEditor = async (): Promise<void> => {
  const page = sharedContext.page!;

  // Focus the editor first
  await page.click('.ProseMirror');

  // Trigger save with Ctrl+S
  await page.keyboard.down('Control');
  await page.keyboard.press('s');
  await page.keyboard.up('Control');

  // Wait for save debounce
  await delay(500);
};

/**
 * Gets the editor's dirty state.
 */
export const isEditorDirty = async (): Promise<boolean> => {
  const page = sharedContext.page!;

  return await page.evaluate(() => {
    const editorEl = document.querySelector('.ProseMirror');
    if (!editorEl) return false;

    const vueComponent = (editorEl as any).__vue__;
    return vueComponent?.isDirty?.() || false;
  });
};

////////////////////
// Journal utilities
////////////////////

/**
 * Clicks the add journal button to show the picker.
 */
export const clickAddJournalButton = async (): Promise<void> => {
  const page = sharedContext.page!;

  const addBtn = await page.$('.fcb-base-table-add-button');
  if (addBtn) {
    await addBtn.click();
    await delay(200);
  }
};

/**
 * Adds a journal via the picker dialog.
 * @param journalName The name of the journal to add
 */
export const addJournalViaPicker = async (journalName: string): Promise<void> => {
  const page = sharedContext.page!;

  // Open the picker
  await clickAddJournalButton();

  // Wait for dialog
  await page.waitForSelector('.related-documents-dialog');

  // Find and click the journal
  const rows = await page.$$('.related-documents-dialog .fcb-table-row');
  for (const row of rows) {
    const text = await row.evaluate(el => el.textContent);
    if (text?.includes(journalName)) {
      await row.click();
      break;
    }
  }

  // Wait for add
  await delay(300);
};

/**
 * Removes a journal by clicking its delete button.
 * @param journalName The name of the journal to remove
 */
export const removeJournal = async (journalName: string): Promise<void> => {
  const page = sharedContext.page!;

  // Find the row with the journal name
  const rows = await page.$$('.fcb-base-table tbody tr');
  for (const row of rows) {
    const text = await row.evaluate(el => el.textContent);
    if (text?.includes(journalName)) {
      // Click the delete button in this row
      const deleteBtn = await row.$('.fa-trash');
      if (deleteBtn) {
        await deleteBtn.click();

        // Confirm the deletion dialog if it appears
        await page.waitForSelector('.fcb-confirm-dialog', { timeout: 2000 }).catch(() => {});
        const confirmBtn = await page.$('.fcb-confirm-dialog .confirm-button');
        if (confirmBtn) {
          await confirmBtn.click();
        }

        await delay(300);
      }
      break;
    }
  }
};

/**
 * Clicks a journal row to open the journal sheet.
 * @param journalName The name of the journal to click
 */
export const clickJournalRow = async (journalName: string): Promise<void> => {
  const page = sharedContext.page!;

  const rows = await page.$$('.fcb-base-table tbody tr');
  for (const row of rows) {
    const text = await row.evaluate(el => el.textContent);
    if (text?.includes(journalName)) {
      // Click the journal name cell (second column)
      const cells = await row.$$('td');
      if (cells.length >= 2) {
        await cells[1].click();
      }
      break;
    }
  }

  await delay(200);
};

/**
 * Gets the count of journals in the journals tab.
 */
export const getJournalCount = async (): Promise<number> => {
  const page = sharedContext.page!;

  const rows = await page.$$('.fcb-base-table tbody tr');
  return rows.length;
};

////////////////////
// Drag-drop utilities
////////////////////

/**
 * Simulates a drag-drop operation using page.evaluate.
 * @param sourceUuid The UUID of the dragged item
 * @param sourceType The document type (JournalEntry, Actor, etc.)
 * @param targetSelector CSS selector for the drop target
 */
export const simulateDragDrop = async (
  sourceUuid: string,
  sourceType: string,
  targetSelector: string
): Promise<void> => {
  const page = sharedContext.page!;

  await page.evaluate(
    ({ sourceUuid, sourceType, targetSelector }: { sourceUuid: string; sourceType: string; targetSelector: string }) => {
      const target = document.querySelector(targetSelector);
      if (!target) return;

      // Create a mock data transfer object
      const dataTransfer = {
        data: {} as Record<string, string>,
        setData(format: string, data: string) {
          this.data[format] = data;
        },
        getData(format: string) {
          return this.data[format] || '';
        },
      };

      // Set the drag data
      const dragData = JSON.stringify({
        type: sourceType,
        uuid: sourceUuid,
      });
      dataTransfer.setData('text/plain', dragData);

      // Create and dispatch the drop event
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dataTransfer as unknown as DataTransfer,
      });

      target.dispatchEvent(dropEvent);
    },
    { sourceUuid, sourceType, targetSelector }
  );

  await delay(300);
};

/**
 * Simulates dropping a journal onto the journals tab.
 * @param journalUuid The UUID of the journal to drop
 */
export const dropJournalOnJournalsTab = async (journalUuid: string): Promise<void> => {
  await simulateDragDrop(journalUuid, 'JournalEntry', '.fcb-base-table');
};

/**
 * Simulates dropping an actor onto a PC (for PC tests).
 * @param actorUuid The UUID of the actor to drop
 */
export const dropActorOnPC = async (actorUuid: string): Promise<void> => {
  await simulateDragDrop(actorUuid, 'Actor', '.fcb-pc-image-container');
};

////////////////////
// Related entries utilities
////////////////////

/**
 * Adds a relationship via drag-drop.
 * @param entryUuid The UUID of the entry to add
 * @param tabId The relationship tab (characters, locations, organizations, pcs)
 */
export const dropEntryOnRelationshipTab = async (entryUuid: string, tabId: string): Promise<void> => {
  const page = sharedContext.page!;

  // Switch to the relationship tab first
  await clickContentTab(tabId);
  await delay(100);

  await simulateDragDrop(entryUuid, 'JournalEntryPage', '.fcb-related-entry-table');
};

/**
 * Gets the count of related entries in a relationship tab.
 */
export const getRelatedEntryCount = async (): Promise<number> => {
  const page = sharedContext.page!;

  const rows = await page.$$('.fcb-related-entry-table tbody tr');
  return rows.length;
};

/**
 * Removes a related entry by clicking its delete button.
 * @param entryName The name of the entry to remove
 */
export const removeRelatedEntry = async (entryName: string): Promise<void> => {
  const page = sharedContext.page!;

  const rows = await page.$$('.fcb-related-entry-table tbody tr');
  for (const row of rows) {
    const text = await row.evaluate(el => el.textContent);
    if (text?.includes(entryName)) {
      const deleteBtn = await row.$('.fa-trash');
      if (deleteBtn) {
        await deleteBtn.click();

        // Confirm the deletion dialog
        await page.waitForSelector('.fcb-confirm-dialog', { timeout: 2000 }).catch(() => {});
        const confirmBtn = await page.$('.fcb-confirm-dialog .confirm-button');
        if (confirmBtn) {
          await confirmBtn.click();
        }

        await delay(300);
      }
      break;
    }
  }
};

////////////////////
// Related documents utilities (actors/scenes)
////////////////////

/**
 * Gets the count of related documents in a documents tab.
 */
export const getRelatedDocumentCount = async (): Promise<number> => {
  const page = sharedContext.page!;

  const rows = await page.$$('.fcb-related-document-table tbody tr, .fcb-base-table tbody tr');
  return rows.length;
};

/**
 * Clicks a document row to open it.
 * @param docName The name of the document to click
 */
export const clickDocumentRow = async (docName: string): Promise<void> => {
  const page = sharedContext.page!;

  const rows = await page.$$('.fcb-base-table tbody tr');
  for (const row of rows) {
    const text = await row.evaluate(el => el.textContent);
    if (text?.includes(docName)) {
      // Click the name cell
      const cells = await row.$$('td');
      if (cells.length >= 2) {
        await cells[1].click();
      }
      break;
    }
  }

  await delay(200);
};

////////////////////
// Sessions tab utilities
////////////////////

/**
 * Gets the count of sessions in the sessions tab.
 */
export const getSessionCount = async (): Promise<number> => {
  const page = sharedContext.page!;

  const rows = await page.$$('.tab[data-tab="sessions"] tbody tr');
  return rows.length;
};

/**
 * Clicks a session row to open the session.
 * @param sessionName The name of the session to click
 */
export const clickSessionRow = async (sessionName: string): Promise<void> => {
  const page = sharedContext.page!;

  const rows = await page.$$('.tab[data-tab="sessions"] tbody tr');
  for (const row of rows) {
    const text = await row.evaluate(el => el.textContent);
    if (text?.includes(sessionName)) {
      // Click the name cell
      const cells = await row.$$('td');
      if (cells.length >= 3) {
        await cells[2].click(); // Name is typically 3rd column
      }
      break;
    }
  }

  await delay(200);
};

////////////////////
// Hierarchy utilities
////////////////////

/**
 * Gets the current parent value.
 */
export const getParentValue = async (): Promise<string> => {
  const page = sharedContext.page!;

  // Find the parent typeahead input
  const inputs = await page.$$('.fcb-typeahead input[data-testid="typeahead-input"]');
  // Parent is typically the last typeahead on the description tab
  if (inputs.length > 0) {
    const lastInput = inputs[inputs.length - 1];
    return await lastInput.evaluate(el => (el as HTMLInputElement).value);
  }
  return '';
};

/**
 * Gets the parent selector dropdown options.
 */
export const getParentOptions = async (): Promise<string[]> => {
  const page = sharedContext.page!;

  // Find the parent typeahead and click to open dropdown
  const inputs = await page.$$('.fcb-typeahead input[data-testid="typeahead-input"]');
  if (inputs.length === 0) return [];

  const parentInput = inputs[inputs.length - 1];
  await parentInput.click();

  // Wait for dropdown
  await page.waitForSelector('.fcb-ta-dropdown');

  // Get all options
  const options = await page.$$('.typeahead-entry');
  const optionTexts: string[] = [];

  for (const option of options) {
    const text = await option.evaluate(el => el.textContent);
    if (text) {
      optionTexts.push(text.trim());
    }
  }

  // Close dropdown by clicking elsewhere
  await page.evaluate(() => document.body.click());

  return optionTexts;
};

////////////////////
// Image utilities
////////////////////

/**
 * Gets the image picker element.
 */
export const getImagePicker = async (): Promise<import('puppeteer').ElementHandle<Element> | null> => {
  const page = sharedContext.page!;
  return await page.$('.fcb-image-picker');
};

/**
 * Clicks the image picker to open file picker.
 */
export const clickImagePicker = async (): Promise<void> => {
  const page = sharedContext.page!;

  const imagePicker = await page.$('.fcb-image-picker img, .fcb-image-picker .fcb-image-placeholder');
  if (imagePicker) {
    await imagePicker.click();
    await delay(200);
  }
};

/**
 * Gets the image URL from the image picker.
 */
export const getImageUrl = async (): Promise<string> => {
  const page = sharedContext.page!;

  const img = await page.$('.fcb-image-picker img');
  if (img) {
    return await img.evaluate(el => (el as HTMLImageElement).src);
  }
  return '';
};

////////////////////
// Scene utilities (for locations)
////////////////////

/**
 * Gets the scenes count in the scenes tab.
 */
export const getSceneCount = async (): Promise<number> => {
  const page = sharedContext.page!;

  // Switch to scenes tab first
  await clickContentTab('scenes');
  await delay(100);

  const rows = await page.$$('.tab[data-tab="scenes"] tbody tr');
  return rows.length;
};

/**
 * Checks if the Foundry doc button is disabled.
 */
export const isFoundryDocButtonDisabled = async (): Promise<boolean> => {
  const page = sharedContext.page!;

  const btn = await page.$('[data-testid="entry-foundry-doc-button"]');
  if (!btn) return true;

  return await btn.evaluate(el => (el as HTMLButtonElement).disabled);
};

/**
 * Clicks the Foundry doc button (opens scene for locations).
 */
export const clickFoundryDocButton = async (): Promise<void> => {
  const page = sharedContext.page!;

  const btn = await page.$('[data-testid="entry-foundry-doc-button"]');
  if (btn) {
    await btn.click();
    await delay(300);
  }
};

////////////////////
// Test data creation via API
////////////////////

/**
 * Creates a journal entry via the API for testing.
 * @param name The name of the journal
 * @returns The UUID of the created journal
 */
export const createJournalViaAPI = async (name: string): Promise<string> => {
  const page = sharedContext.page!;

  const uuid = await page.evaluate(
    async (name: string) => {
      // Create a journal entry using Foundry's API
      const journal = await JournalEntry.create({
        name,
      });
      return journal?.uuid || '';
    },
    name
  );

  return uuid;
};

/**
 * Deletes a journal entry via the API.
 * @param uuid The UUID of the journal to delete
 */
export const deleteJournalViaAPI = async (uuid: string): Promise<void> => {
  const page = sharedContext.page!;

  await page.evaluate(async (uuid: string) => {
    const doc = await fromUuid(uuid);
    if (doc) {
      await doc.delete();
    }
  }, uuid);
};

/**
 * Adds a journal to an entry via the API.
 * @param entryUuid The entry UUID
 * @param journalUuid The journal UUID
 */
export const addJournalToEntryViaAPI = async (entryUuid: string, journalUuid: string): Promise<void> => {
  const page = sharedContext.page!;

  await page.evaluate(
    async ({ entryUuid, journalUuid }: { entryUuid: string; journalUuid: string }) => {
      const api = (game as any).modules.get('campaign-builder')!.api!.testAPI;
      // Get the entry and add the journal
      const entry = await api.getEntry(entryUuid);
      if (entry) {
        entry.journals = entry.journals || [];
        entry.journals.push({
          uuid: `${journalUuid}||`,
          journalUuid,
          pageUuid: null,
          anchor: null,
          packId: null,
          packName: null,
          groupId: null,
        });
        await entry.save();
      }
    },
    { entryUuid, journalUuid }
  );
};

/**
 * Gets an entry by UUID via the API.
 */
export const getEntryViaAPI = async (uuid: string): Promise<{ uuid: string; name: string; type: string } | null> => {
  const page = sharedContext.page!;

  return await page.evaluate(async (uuid: string) => {
    const api = (game as any).modules.get('campaign-builder')!.api!.testAPI;
    const entry = await api.getEntry?.(uuid);
    if (entry) {
      return { uuid: entry.uuid, name: entry.name, type: entry.type };
    }
    return null;
  }, uuid);
};

/**
 * Sets the parent of an entry via the API.
 * @param entryUuid The entry UUID
 * @param parentUuid The parent entry UUID
 */
export const setEntryParentViaAPI = async (entryUuid: string, parentUuid: string): Promise<void> => {
  const page = sharedContext.page!;

  await page.evaluate(
    async ({ entryUuid, parentUuid }: { entryUuid: string; parentUuid: string }) => {
      const api = (game as any).modules.get('campaign-builder')!.api!.testAPI;
      await api.setEntryParent?.(entryUuid, parentUuid);
    },
    { entryUuid, parentUuid }
  );
};

/**
 * Adds a scene to a location via the API.
 * @param locationUuid The location UUID
 * @param sceneUuid The scene UUID
 */
export const addSceneToLocationViaAPI = async (locationUuid: string, sceneUuid: string): Promise<void> => {
  const page = sharedContext.page!;

  await page.evaluate(
    async ({ locationUuid, sceneUuid }: { locationUuid: string; sceneUuid: string }) => {
      const entry = await fromUuid(locationUuid) as any;
      if (entry && 'scenes' in entry && Array.isArray(entry.scenes)) {
        entry.scenes.push(sceneUuid);
        await entry.save?.();
      }
    },
    { locationUuid, sceneUuid }
  );
};

/**
 * Creates a scene via the API.
 * @param name The name of the scene
 * @returns The UUID of the created scene
 */
export const createSceneViaAPI = async (name: string): Promise<string> => {
  const page = sharedContext.page!;

  const uuid = await page.evaluate(async (name: string) => {
    const scene = await Scene.create({
      name,
      navigation: true,
    });
    return scene?.uuid || '';
  }, name);

  return uuid;
};
