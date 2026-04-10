/**
 * Dialog tests.
 * Tests create entry dialog, relationship dialogs, and utility dialogs.
 */

import { describe, test, beforeAll, afterAll, expect, runTests } from '../testRunner';
import { sharedContext } from '@e2etest/sharedContext';
import { testData } from '@e2etest/data';
import { ensureSetup } from '../ensureSetup';
import { switchToSetting, openEntry } from '@e2etest/utils';
import { getByTestId, Locator } from '../helpers';

/**
 * Helper delay function.
 */
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Opens the create entry dialog via the directory header button.
 */
const openCreateEntryDialog = async (): Promise<void> => {
  const page = sharedContext.page!;

  // Find the create entry button in the directory header
  const createBtn = await page.$('[data-testid="create-entry-button"], .fcb-directory-header .fa-plus');
  if (createBtn) {
    await createBtn.click();
    await delay(300);
  }
};

/**
 * Checks if a dialog is visible.
 */
const isDialogVisible = async (): Promise<boolean> => {
  const page = sharedContext.page!;
  const dialog = await page.$('.fcb-dialog, .fcb-dialog-wrapper');
  return dialog !== null;
};

/**
 * Closes any open dialog.
 */
const closeDialog = async (): Promise<void> => {
  const page = sharedContext.page!;

  // Try clicking cancel button first
  const cancelBtn = await page.$('.fcb-dialog-button:not(.primary), button:has-text("Cancel")');
  if (cancelBtn) {
    await cancelBtn.click();
    await delay(200);
    return;
  }

  // Try pressing Escape
  await page.keyboard.press('Escape');
  await delay(200);
};

/**
 * Gets the dialog title.
 */
const getDialogTitle = async (): Promise<string> => {
  const page = sharedContext.page!;
  const titleEl = await page.$('.fcb-dialog-title, .fcb-dialog h3, .fcb-dialog .dialog-title');
  if (!titleEl) return '';
  return await titleEl.evaluate(el => el.textContent || '');
};

/**
 * Clicks the add relationship button in an entry.
 */
const clickAddRelationshipButton = async (): Promise<void> => {
  const page = sharedContext.page!;

  // Find the add relationship button
  const addBtn = await page.$('[data-testid="add-relationship-button"], .fcb-relationship-add, .fa-user-plus');
  if (addBtn) {
    await addBtn.click();
    await delay(300);
  }
};

/**
 * Creates an entry via the API.
 */
const createEntryViaAPI = async (name: string, topic: number, settingName: string): Promise<string> => {
  const page = sharedContext.page!;

  return await page.evaluate(
    async ({ name, topic, settingName }: { name: string; topic: number; settingName: string }) => {
      const api = (game as any).modules.get('campaign-builder')!.api!.testAPI;
      return await api.createEntry(name, topic, settingName);
    },
    { name, topic, settingName }
  );
};

/**
 * Deletes an entry via the API.
 */
const deleteEntryViaAPI = async (uuid: string): Promise<void> => {
  const page = sharedContext.page!;

  await page.evaluate(async (uuid: string) => {
    const api = (game as any).modules.get('campaign-builder')!.api!.testAPI;
    await api.deleteEntry(uuid);
  }, uuid);
};

describe.serial('Dialog Tests', () => {
  let createdEntryUuid: string | null = null;
  const testEntryName = 'Test Dialog Entry';

  beforeAll(async () => {
    await ensureSetup(false);
    const setting = testData.settings[0];
    await switchToSetting(setting.name);
  });

  afterAll(async () => {
    if (createdEntryUuid) {
      try {
        await deleteEntryViaAPI(createdEntryUuid);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  // Create Entry Dialog Tests
  test('Create entry button is visible in directory', async () => {
    const page = sharedContext.page!;
    const createBtn = await page.$('.fcb-directory-header .fa-plus, [data-testid="create-entry-button"]');
    expect(createBtn).not.toBeNull();
  });

  test('Open create entry dialog', async () => {
    await openCreateEntryDialog();
    
    const isVisible = await isDialogVisible();
    expect(isVisible).toBe(true);
  });

  test('Create entry dialog has title', async () => {
    const title = await getDialogTitle();
    expect(title.length).toBeGreaterThan(0);
  });

  test('Close create entry dialog', async () => {
    await closeDialog();
    
    const isVisible = await isDialogVisible();
    expect(isVisible).toBe(false);
  });

  // Relationship Dialog Tests
  test('Open entry for relationship testing', async () => {
    const setting = testData.settings[0];
    const characters = setting.topics[1]; // Topics.Character = 1

    if (!characters || characters.length === 0) {
      // Create an entry for testing
      createdEntryUuid = await createEntryViaAPI(testEntryName, 1, setting.name);
      await openEntry(1, testEntryName); // Topics.Character = 1
    } else {
      await openEntry(1, characters[0].name); // Topics.Character = 1
    }

    const page = sharedContext.page!;
    const nameHeader = await page.$('.fcb-name-header');
    expect(nameHeader).not.toBeNull();
  });

  test('Entry has relationship section', async () => {
    const page = sharedContext.page!;
    
    // Look for relationships tab or section
    const relationshipSection = await page.$('[data-tab="relationships"], .fcb-relationships-section');
    expect(relationshipSection).not.toBeNull();
  });

  test('Navigate to relationships tab', async () => {
    const page = sharedContext.page!;
    
    const relTab = await page.$('[data-tab="relationships"]');
    if (relTab) {
      await relTab.click();
      await delay(200);
    }

    const activeTab = await page.$('[data-tab="relationships"].active, [data-tab="relationships"][aria-selected="true"]');
    expect(activeTab).not.toBeNull();
  });

  test('Add relationship button exists', async () => {
    const page = sharedContext.page!;
    
    // First navigate to relationships tab
    const relTab = await page.$('[data-tab="relationships"]');
    if (relTab) {
      await relTab.click();
      await delay(200);
    }

    const addBtn = await page.$('.fcb-relationship-add, [data-testid="add-relationship-button"], .fa-user-plus');
    expect(addBtn).not.toBeNull();
  });

  test('Open add relationship dialog', async () => {
    const page = sharedContext.page!;
    
    // First navigate to relationships tab
    const relTab = await page.$('[data-tab="relationships"]');
    if (relTab) {
      await relTab.click();
      await delay(200);
    }

    await clickAddRelationshipButton();
    
    const isVisible = await isDialogVisible();
    expect(isVisible).toBe(true);
  });

  test('Relationship dialog has title', async () => {
    const title = await getDialogTitle();
    expect(title.length).toBeGreaterThan(0);
  });

  test('Close relationship dialog', async () => {
    await closeDialog();
    
    const isVisible = await isDialogVisible();
    expect(isVisible).toBe(false);
  });

  // Dialog Button Tests
  test('Dialog has cancel button', async () => {
    await openCreateEntryDialog();
    
    const page = sharedContext.page!;
    const cancelBtn = await page.$('.fcb-dialog-button:has-text("Cancel"), button:has-text("Cancel")');
    expect(cancelBtn).not.toBeNull();
    
    await closeDialog();
  });

  test('Dialog has action button', async () => {
    await openCreateEntryDialog();
    
    const page = sharedContext.page!;
    const actionBtn = await page.$('.fcb-dialog-button.primary, .fcb-dialog-button.default');
    expect(actionBtn).not.toBeNull();
    
    await closeDialog();
  });
});

runTests();
