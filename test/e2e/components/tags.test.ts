/**
 * Tags component tests.
 * Tests tag adding, removing, clicking, and navigation.
 */

import { describe, test, beforeAll, afterAll, expect, runTests } from '../testRunner';
import { sharedContext } from '@e2etest/sharedContext';
import { testData } from '@e2etest/data';
import { ensureSetup } from '../ensureSetup';
import { switchToSetting, expandTopicNode, expandTypeNode } from '@e2etest/utils';
import { Topics } from '@/types';
import {
  openEntry,
  addTag,
  removeTag,
  clickTag,
  createEntryViaAPI,
  deleteEntryViaAPI,
  closeActiveTab,
} from '@e2etest/utils';

/**
 * Helper delay function.
 */
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Gets all visible tags.
 */
const getAllTags = async () => {
  const page = sharedContext.page!;
  return await page.$$('.tagify__tag');
};

/**
 * Gets tag text content.
 */
const getTagText = async (tag: import('puppeteer').ElementHandle<Element>) => {
  return await tag.evaluate(el => el.textContent?.trim() || '');
};

/**
 * Checks if tags wrapper is initialized.
 */
const isTagsInitialized = async () => {
  const page = sharedContext.page!;
  const wrapper = await page.$('.tags-wrapper');
  if (!wrapper) return false;
  return await wrapper.evaluate(el => !el.classList.contains('uninitialized'));
};

describe.serial('Tags Component Tests', () => {
  let createdEntryUuid: string | null = null;
  const testEntryName = 'Test Tags Entry';

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

  test('Tags component is visible on entry open', async () => {
    const setting = testData.settings[0];

    // Open a character entry
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    const firstChar = setting.topics[Topics.Character][0];
    await openEntry(Topics.Character, firstChar.name);

    // Wait for tags to initialize
    const page = sharedContext.page!;
    await page.waitForSelector('.tags-wrapper:not(.uninitialized)', { timeout: 5000 });

    // Verify tags wrapper is present
    const wrapper = await page.$('.tags-wrapper');
    expect(wrapper).not.toBeNull();
  });

  test('Tags input field is present', async () => {
    const page = sharedContext.page!;

    // Verify tags input exists
    const tagsInput = await page.$('.tags-wrapper input, .tagify__input');
    expect(tagsInput).not.toBeNull();
  });

  test('Add a new tag', async () => {
    const setting = testData.settings[0];

    // Create a new entry for this test
    createdEntryUuid = await createEntryViaAPI(Topics.Character, testEntryName, setting.name);

    // Open the entry
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    await openEntry(Topics.Character, testEntryName);

    // Wait for tags to initialize
    const page = sharedContext.page!;
    await page.waitForSelector('.tags-wrapper:not(.uninitialized)', { timeout: 5000 });

    // Add a tag
    await addTag('test-tag-one');

    // Verify tag was added
    const tags = await getAllTags();
    let found = false;
    for (const tag of tags) {
      const text = await getTagText(tag);
      if (text.includes('test-tag-one')) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  test('Add multiple tags', async () => {
    const page = sharedContext.page!;

    // Make sure we have the entry open
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    await openEntry(Topics.Character, testEntryName);

    // Add multiple tags
    await addTag('multi-tag-1');
    await addTag('multi-tag-2');
    await addTag('multi-tag-3');

    // Verify all tags are present
    const tags = await getAllTags();
    expect(tags.length).toBeGreaterThan(2);
  });

  test('Remove a tag', async () => {
    const page = sharedContext.page!;

    // Make sure we have the entry open
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    await openEntry(Topics.Character, testEntryName);

    // Add a tag to remove
    await addTag('tag-to-remove');
    await delay(200);

    // Verify tag exists
    let tags = await getAllTags();
    let found = false;
    for (const tag of tags) {
      const text = await getTagText(tag);
      if (text.includes('tag-to-remove')) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);

    // Remove the tag
    await removeTag('tag-to-remove');
    await delay(200);

    // Verify tag was removed
    tags = await getAllTags();
    for (const tag of tags) {
      const text = await getTagText(tag);
      expect(text.includes('tag-to-remove')).toBe(false);
    }
  });

  test('Click tag opens tag results tab', async () => {
    const page = sharedContext.page!;

    // Make sure we have the entry open
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    await openEntry(Topics.Character, testEntryName);

    // Add a unique tag
    await addTag('clickable-tag-test');
    await delay(200);

    // Click the tag
    await clickTag('clickable-tag-test');

    // Wait for new tab to open
    await delay(300);

    // Verify new tab opened
    const tabs = await page.$$('.fcb-tab');
    expect(tabs.length).toBeGreaterThan(1);

    // Close the tag results tab
    await closeActiveTab();
  });

  test('Tag shows X button on hover', async () => {
    const page = sharedContext.page!;

    // Make sure we have the entry open
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    await openEntry(Topics.Character, testEntryName);

    // Get tags
    const tags = await getAllTags();
    if (tags.length > 0) {
      // Hover over a tag
      await tags[0].hover();
      await delay(100);

      // Look for close button (may be hidden until hover)
      const closeBtn = await tags[0].$('.tagify__tag__removeBtn');
      // Close button should exist (even if hidden)
      expect(closeBtn).not.toBeNull();
    }
  });

  test('Tags persist after entry save', async () => {
    const page = sharedContext.page!;

    // Make sure we have the entry open
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    await openEntry(Topics.Character, testEntryName);

    // Add a tag
    await addTag('persistent-tag');
    await delay(700); // Wait for save debounce

    // Refresh by switching settings
    await switchToSetting(testData.settings[1].name);
    await switchToSetting(testData.settings[0].name);

    // Reopen the entry
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    await openEntry(Topics.Character, testEntryName);

    // Verify tag still exists
    const tags = await getAllTags();
    let found = false;
    for (const tag of tags) {
      const text = await getTagText(tag);
      if (text.includes('persistent-tag')) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  test('Tags on location entry', async () => {
    const setting = testData.settings[0];

    // Open a location entry
    await expandTopicNode(Topics.Location);
    await expandTypeNode(Topics.Location, '(none)');
    const firstLoc = setting.topics[Topics.Location][0];
    await openEntry(Topics.Location, firstLoc.name);

    // Verify tags wrapper is present
    const page = sharedContext.page!;
    await page.waitForSelector('.tags-wrapper:not(.uninitialized)', { timeout: 5000 });
    const wrapper = await page.$('.tags-wrapper');
    expect(wrapper).not.toBeNull();
  });

  test('Tags on organization entry', async () => {
    const setting = testData.settings[0];

    // Open an organization entry
    await expandTopicNode(Topics.Organization);
    await expandTypeNode(Topics.Organization, '(none)');
    const firstOrg = setting.topics[Topics.Organization][0];
    await openEntry(Topics.Organization, firstOrg.name);

    // Verify tags wrapper is present
    const page = sharedContext.page!;
    await page.waitForSelector('.tags-wrapper:not(.uninitialized)', { timeout: 5000 });
    const wrapper = await page.$('.tags-wrapper');
    expect(wrapper).not.toBeNull();
  });

  test('Tags on session', async () => {
    const page = sharedContext.page!;
    const setting = testData.settings[0];

    // Open a session
    const campaignNodes = await page.$$('.fcb-campaign-folder');
    for (const node of campaignNodes) {
      const text = await node.evaluate(el => el.textContent);
      if (text?.includes(setting.campaigns[0].name)) {
        // Expand campaign
        const isCollapsed = await node.evaluate(el => el.classList.contains('collapsed'));
        if (isCollapsed) {
          const toggle = await node.$('[data-testid="campaign-folder-toggle"]');
          if (toggle) await toggle.click();
        }

        // Click on first session
        const sessionNodes = await node.$$('.fcb-session-node');
        if (sessionNodes.length > 0) {
          const nameEl = await sessionNodes[0].$('.node-name');
          if (nameEl) await nameEl.click();
        }
        break;
      }
    }

    // Wait for session content
    await page.waitForSelector('.fcb-name-header', { timeout: 10000 });

    // Verify tags wrapper is present
    await page.waitForSelector('.tags-wrapper:not(.uninitialized)', { timeout: 5000 });
    const wrapper = await page.$('.tags-wrapper');
    expect(wrapper).not.toBeNull();
  });
});

runTests();
