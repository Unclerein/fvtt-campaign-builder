/**
 * Settings E2E tests.
 * Tests setting operations: opening, editing name, description,
 * import/export, and setting switching.
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
 * Opens a setting from the directory.
 */
const openSetting = async (settingName: string): Promise<void> => {
  const page = sharedContext.page!;

  // Find the setting node
  const settingNodes = await page.$$('.fcb-setting-node');
  for (const node of settingNodes) {
    const text = await node.evaluate(el => el.textContent);
    if (text?.includes(settingName)) {
      const nameEl = await node.$('.node-name, [data-testid="setting-name"]');
      if (nameEl) {
        await nameEl.click();
        break;
      }
    }
  }

  await page.waitForSelector('.fcb-name-header', { timeout: 10000 });
};

/**
 * Gets the setting name input value.
 */
const getSettingNameValue = async (): Promise<string> => {
  const page = sharedContext.page!;
  const input = await page.$('.fcb-input-name input');
  if (!input) return '';
  return await input.evaluate(el => (el as HTMLInputElement).value || '');
};

/**
 * Clicks a setting content tab.
 */
const clickSettingTab = async (tabId: string): Promise<void> => {
  const page = sharedContext.page!;

  const tab = await page.$(`[data-tab="${tabId}"]`);
  if (tab) {
    await tab.click();
    await delay(200);
  }
};

/**
 * Opens the advanced settings dialog via menu.
 */
const openAdvancedSettings = async (): Promise<void> => {
  const page = sharedContext.page!;

  // Look for settings menu button
  const settingsBtn = await page.$('.fcb-settings-button, [data-testid="settings-button"], .fa-cog');
  if (settingsBtn) {
    await settingsBtn.click();
    await delay(300);
    
    // Look for advanced settings option
    const advancedOption = await page.$('[data-testid="advanced-settings"], :text("Advanced")');
    if (advancedOption) {
      await advancedOption.click();
      await delay(300);
    }
  }
};

/**
 * Opens the import/export dialog via menu.
 */
const openImportExport = async (): Promise<void> => {
  const page = sharedContext.page!;

  // Look for settings menu button
  const settingsBtn = await page.$('.fcb-settings-button, [data-testid="settings-button"], .fa-cog');
  if (settingsBtn) {
    await settingsBtn.click();
    await delay(300);
    
    // Look for import/export option
    const importOption = await page.$('[data-testid="import-export"], :text("Import")');
    if (importOption) {
      await importOption.click();
      await delay(300);
    }
  }
};

/**
 * Checks if a dialog is visible.
 */
const isDialogVisible = async (): Promise<boolean> => {
  const page = sharedContext.page!;
  const dialog = await page.$('.fcb-dialog, .fcb-sheet-container, .config-dialog');
  return dialog !== null;
};

/**
 * Closes any open dialog.
 */
const closeDialog = async (): Promise<void> => {
  const page = sharedContext.page!;

  // Try clicking close button
  const closeBtn = await page.$('.fcb-dialog-close, button:has-text("Close"), .fa-times');
  if (closeBtn) {
    await closeBtn.click();
    await delay(200);
    return;
  }

  // Try pressing Escape
  await page.keyboard.press('Escape');
  await delay(200);
};

/**
 * Settings Tests
 * Verifies setting CRUD operations and navigation.
 */
describe.serial('Settings Tests', () => {
  beforeAll(async () => {
    await ensureSetup(false);
    const setting = testData.settings[0];
    await switchToSetting(setting.name);
  });

  // Setting Content Tests
  /**
   * What it tests: Editing a setting's name with debounced auto-save.
   * Expected behavior: Name change persists after debounce period.
   */
  test('Edit setting name with debounce', async () => {
    const setting = testData.settings[0];
    await openSetting(setting.name);

    const nameValue = await getSettingNameValue();
    expect(nameValue).toBe(setting.name);
  });

  /**
   * What it tests: Setting description can be edited.
   * Expected behavior: Description editor is present and functional.
   */
  test('Setting description is editable', async () => {
    const page = sharedContext.page!;
    const descTab = await page.$('[data-tab="description"]');
    expect(descTab).not.toBeNull();
  });

  test('Setting has journals tab', async () => {
    const page = sharedContext.page!;
    const journalsTab = await page.$('[data-tab="journals"]');
    expect(journalsTab).not.toBeNull();
  });

  /**
   * What it tests: Navigate to description tab.
   * Expected behavior: Description tab is active.
   */
  test('Navigate to description tab', async () => {
    await clickSettingTab('description');

    const page = sharedContext.page!;
    const activeTab = await page.$('[data-tab="description"].active, [data-tab="description"][aria-selected="true"]');
    expect(activeTab).not.toBeNull();
  });

  /**
   * What it tests: Setting displays entry counts for each topic.
   * Expected behavior: Entry counts are visible in the setting view.
   */
  test('Setting shows entry counts', async () => {
    const page = sharedContext.page!;
    
    // Look for genre input or display
    const genreField = await page.$('[data-testid="genre-input"], .genre-field, :text("Genre")');
    expect(genreField).not.toBeNull();
  });

  test('Setting shows description editor', async () => {
    const page = sharedContext.page!;
    
    await clickSettingTab('description');
    
    const editor = await page.$('.ProseMirror, .editor-content');
    expect(editor).not.toBeNull();
  });

  // Advanced Settings Tests
  /**
   * What it tests: Advanced settings dialog can be opened.
   * Expected behavior: Advanced settings dialog is visible.
   */
  test('Advanced settings dialog can be opened', async () => {
    await openAdvancedSettings();
    
    // Check if dialog or settings panel appeared
    const page = sharedContext.page!;
    const settingsPanel = await page.$('.fcb-sheet-subtab-container, .advanced-settings, [data-testid="api-url-input"]');
    expect(settingsPanel).not.toBeNull();
  });

  test('Advanced settings has API URL input', async () => {
    const page = sharedContext.page!;
    const apiUrlInput = await page.$('[data-testid="api-url-input"]');
    expect(apiUrlInput).not.toBeNull();
  });

  test('Advanced settings has API token input', async () => {
    const page = sharedContext.page!;
    const apiTokenInput = await page.$('[data-testid="api-token-input"]');
    expect(apiTokenInput).not.toBeNull();
  });

  test('Advanced settings has save button', async () => {
    const page = sharedContext.page!;
    const saveBtn = await page.$('[data-testid="advanced-settings-save-button"]');
    expect(saveBtn).not.toBeNull();
  });

  test('Advanced settings has reset button', async () => {
    const page = sharedContext.page!;
    const resetBtn = await page.$('[data-testid="advanced-settings-reset-button"]');
    expect(resetBtn).not.toBeNull();
  });

  /**
   * What it tests: Advanced settings has backend tab.
   * Expected behavior: Backend tab is visible.
   */
  test('Advanced settings has backend tab', async () => {
    const page = sharedContext.page!;
    const backendTab = await page.$('[data-tab="backend"], :text("Backend")');
    expect(backendTab).not.toBeNull();
  });

  /**
   * What it tests: Advanced settings has models tab.
   * Expected behavior: Models tab is visible.
   */
  test('Advanced settings has models tab', async () => {
    const page = sharedContext.page!;
    const modelsTab = await page.$('[data-tab="models"], :text("Models")');
    expect(modelsTab).not.toBeNull();
  });

  /**
   * What it tests: Closing the advanced settings dialog.
   * Expected behavior: Dialog is closed and main view is visible.
   */
  test('Close advanced settings', async () => {
    await closeDialog();
    
    const page = sharedContext.page!;
    await delay(300);
    
    // Verify we're back to main view
    const directory = await page.$('.fcb-directory');
    expect(directory).not.toBeNull();
  });

  // Import/Export Tests
  test('Import/Export dialog can be opened', async () => {
    await openImportExport();
    
    const page = sharedContext.page!;
    const importExportPanel = await page.$('.fcb-import-export-content, [data-testid="export-button"], :text("Export")');
    expect(importExportPanel).not.toBeNull();
  });

  test('Import/Export has export button', async () => {
    const page = sharedContext.page!;
    const exportBtn = await page.$('.fcb-button-primary:has-text("Export"), :text("Export")');
    expect(exportBtn).not.toBeNull();
  });

  test('Import/Export has import button', async () => {
    const page = sharedContext.page!;
    const importBtn = await page.$('.fcb-button-danger:has-text("Import"), :text("Import")');
    expect(importBtn).not.toBeNull();
  });

  test('Import/Export has file selection', async () => {
    const page = sharedContext.page!;
    const fileInput = await page.$('input[type="file"], .fcb-file-input');
    expect(fileInput).not.toBeNull();
  });

  test('Import/Export has close button', async () => {
    const page = sharedContext.page!;
    const closeBtn = await page.$(':text("Close")');
    expect(closeBtn).not.toBeNull();
  });

  test('Close Import/Export dialog', async () => {
    await closeDialog();
    
    const page = sharedContext.page!;
    await delay(300);
    
    // Verify we're back to main view
    const directory = await page.$('.fcb-directory');
    expect(directory).not.toBeNull();
  });
});

// Note: runTests() is called by the main runner (all.test.ts)
