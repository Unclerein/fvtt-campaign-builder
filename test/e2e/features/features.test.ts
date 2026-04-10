/**
 * Specialized feature tests.
 * Tests timeline, tag results, and custom fields functionality.
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
 * Opens a campaign from the directory.
 */
const openCampaign = async (campaignName: string): Promise<void> => {
  const page = sharedContext.page!;

  // Find the campaign node
  const campaignNodes = await page.$$('.fcb-campaign-folder');
  for (const node of campaignNodes) {
    const text = await node.evaluate(el => el.textContent);
    if (text?.includes(campaignName)) {
      const nameEl = await node.$('.node-name, [data-testid="campaign-name"]');
      if (nameEl) {
        await nameEl.click();
        break;
      }
    }
  }

  await page.waitForSelector('.fcb-name-header', { timeout: 10000 });
};

/**
 * Clicks a content tab.
 */
const clickContentTab = async (tabId: string): Promise<void> => {
  const page = sharedContext.page!;

  const tab = await page.$(`[data-tab="${tabId}"]`);
  if (tab) {
    await tab.click();
    await delay(200);
  }
};

/**
 * Searches for a tag via the search component.
 */
const searchForTag = async (tagPartial: string): Promise<void> => {
  const page = sharedContext.page!;

  // Find search input
  const searchInput = await page.$('[data-testid="search-input"], .fcb-search-input');
  if (searchInput) {
    await searchInput.click();
    await searchInput.evaluate(el => { (el as HTMLInputElement).value = ''; });
    
    // Type the tag partial
    for (const char of tagPartial) {
      await page.keyboard.type(char);
    }
    
    await delay(500);
  }
};

/**
 * Gets the timeline container.
 */
const getTimelineContainer = async (): Promise<boolean> => {
  const page = sharedContext.page!;
  const timeline = await page.$('.timeline-visualization, .timeline-container, .vis-timeline');
  return timeline !== null;
};

/**
 * Gets the tag results title.
 */
const getTagResultsTitle = async (): Promise<string> => {
  const page = sharedContext.page!;
  const titleEl = await page.$('.tag-results-title');
  if (!titleEl) return '';
  return await titleEl.evaluate(el => el.textContent || '');
};

/**
 * Gets custom fields count.
 */
const getCustomFieldsCount = async (): Promise<number> => {
  const page = sharedContext.page!;
  const fields = await page.$$('.form-group:has(.fcb-ai-button), .custom-field');
  return fields.length;
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

describe.serial('Specialized Feature Tests', () => {
  let createdEntryUuid: string | null = null;
  const testEntryName = 'Test Feature Entry';

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

  // Timeline Tests
  test('Open campaign for timeline test', async () => {
    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];
    
    await openCampaign(firstCampaign.name);
    
    const page = sharedContext.page!;
    const nameHeader = await page.$('.fcb-name-header');
    expect(nameHeader).not.toBeNull();
  });

  test('Campaign has timeline tab', async () => {
    const page = sharedContext.page!;
    const timelineTab = await page.$('[data-tab="timeline"]');
    expect(timelineTab).not.toBeNull();
  });

  test('Navigate to timeline tab', async () => {
    await clickContentTab('timeline');
    
    const page = sharedContext.page!;
    const activeTab = await page.$('[data-tab="timeline"].active, [data-tab="timeline"][aria-selected="true"]');
    expect(activeTab).not.toBeNull();
  });

  test('Timeline container is visible', async () => {
    await clickContentTab('timeline');
    await delay(500);
    
    const hasTimeline = await getTimelineContainer();
    expect(hasTimeline).toBe(true);
  });

  test('Timeline has filter panel', async () => {
    const page = sharedContext.page!;
    const filterPanel = await page.$('.timeline-filter-panel, .fcb-filter-panel');
    expect(filterPanel).not.toBeNull();
  });

  test('Timeline has loading indicator', async () => {
    const page = sharedContext.page!;
    await clickContentTab('timeline');
    
    // Look for loading state or loaded timeline
    const loading = await page.$('.timeline-loading, .vis-timeline');
    expect(loading).not.toBeNull();
  });

  // Tag Results Tests
  test('Search for tag shows tag results', async () => {
    const setting = testData.settings[0];
    const characters = setting.topics[1];
    
    if (characters && characters.length > 0) {
      // Search for a partial term
      await searchForTag('the');
      
      const page = sharedContext.page!;
      await delay(500);
      
      // Check if results appeared
      const results = await page.$('.fcb-search-results, .fcb-search-result');
      expect(results).not.toBeNull();
    }
  });

  test('Tag results show tag icon', async () => {
    const page = sharedContext.page!;
    
    // Look for tag result items with icon
    const tagIcon = await page.$('.fcb-search-tag-result .fa-tag');
    expect(tagIcon).not.toBeNull();
  });

  test('Click tag result opens tag results tab', async () => {
    const page = sharedContext.page!;
    
    // Find a tag result
    const tagResult = await page.$('.fcb-search-tag-result');
    if (tagResult) {
      await tagResult.click();
      await delay(300);
      
      // Check if tag results tab opened
      const tagResultsTab = await page.$('.tag-results-title, .fcb-tag-results');
      expect(tagResultsTab).not.toBeNull();
    }
  });

  test('Tag results tab shows table', async () => {
    const page = sharedContext.page!;
    const table = await page.$('.base-table, table');
    expect(table).not.toBeNull();
  });

  test('Tag results tab shows count', async () => {
    const page = sharedContext.page!;
    const countEl = await page.$('.tag-results-count');
    expect(countEl).not.toBeNull();
  });

  // Custom Fields Tests
  test('Open entry for custom fields test', async () => {
    const setting = testData.settings[0];
    const locations = setting.topics[2]; // Topics.Location = 2
    
    if (!locations || locations.length === 0) {
      // Create an entry for testing
      createdEntryUuid = await createEntryViaAPI(testEntryName, 2, setting.name);
      await openEntry(2, testEntryName);
    } else {
      await openEntry(2, locations[0].name);
    }

    const page = sharedContext.page!;
    const nameHeader = await page.$('.fcb-name-header');
    expect(nameHeader).not.toBeNull();
  });

  test('Entry has description tab', async () => {
    const page = sharedContext.page!;
    const descTab = await page.$('[data-tab="description"]');
    expect(descTab).not.toBeNull();
  });

  test('Navigate to description tab', async () => {
    await clickContentTab('description');
    
    const page = sharedContext.page!;
    const activeTab = await page.$('[data-tab="description"].active, [data-tab="description"][aria-selected="true"]');
    expect(activeTab).not.toBeNull();
  });

  test('Description tab shows editor', async () => {
    const page = sharedContext.page!;
    const editor = await page.$('.ProseMirror, .editor-content');
    expect(editor).not.toBeNull();
  });

  test('Entry may have custom fields', async () => {
    const page = sharedContext.page!;
    
    // Custom fields are optional, so just check the form structure exists
    const formGroup = await page.$('.form-group');
    expect(formGroup).not.toBeNull();
  });

  test('Entry has tags section', async () => {
    const page = sharedContext.page!;
    
    // Look for tags wrapper or tags input
    const tagsSection = await page.$('.tags-wrapper, .tags-container');
    expect(tagsSection).not.toBeNull();
  });

  test('Entry has name input', async () => {
    const page = sharedContext.page!;
    const nameInput = await page.$('.fcb-input-name input, [data-testid="entry-name-input"]');
    expect(nameInput).not.toBeNull();
  });

  test('Entry has type field', async () => {
    const page = sharedContext.page!;
    
    // Look for type dropdown or display
    const typeField = await page.$('.type-field, [data-testid="type-select"], :text("Type")');
    expect(typeField).not.toBeNull();
  });
});

runTests();
