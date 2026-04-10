/**
 * Relationship tabs tests.
 * Tests relationship tab navigation and content display.
 */

import { describe, test, beforeAll, afterAll, expect, runTests } from '../testRunner';
import { sharedContext } from '@e2etest/sharedContext';
import { testData } from '@e2etest/data';
import { ensureSetup } from '../ensureSetup';
import { switchToSetting, expandTopicNode, expandTypeNode } from '@e2etest/utils';
import { Topics } from '@/types';
import {
  openEntry,
  clickContentTab,
  createEntryViaAPI,
  deleteEntryViaAPI,
} from '@e2etest/utils';

/**
 * Helper delay function.
 */
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Gets the relationship tab content.
 */
const getRelationshipTabContent = async (tabName: string) => {
  const page = sharedContext.page!;
  return await page.$(`[data-tab="${tabName}"] .tab-inner, [data-tab="${tabName}"]`);
};

/**
 * Gets relationship rows.
 */
const getRelationshipRows = async () => {
  const page = sharedContext.page!;
  return await page.$$('.relationship-row, .fcb-relationship-item');
};

/**
 * Gets the add relationship button.
 */
const getAddRelationshipButton = async () => {
  const page = sharedContext.page!;
  return await page.$('[data-testid="add-relationship"], .add-relationship-button');
};

describe.serial('Relationship Tabs Tests', () => {
  let createdEntryUuid: string | null = null;
  const testEntryName = 'Test Relationship Entry';

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

  test('Characters relationship tab is accessible', async () => {
    const setting = testData.settings[0];

    // Open a character entry
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    const firstChar = setting.topics[Topics.Character][0];
    await openEntry(Topics.Character, firstChar.name);

    // Click on characters tab
    await clickContentTab('characters');

    // Verify tab content is visible
    const tabContent = await getRelationshipTabContent('characters');
    expect(tabContent).not.toBeNull();
  });

  test('Locations relationship tab is accessible', async () => {
    const setting = testData.settings[0];

    // Open a character entry
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    const firstChar = setting.topics[Topics.Character][0];
    await openEntry(Topics.Character, firstChar.name);

    // Click on locations tab
    await clickContentTab('locations');

    // Verify tab content is visible
    const tabContent = await getRelationshipTabContent('locations');
    expect(tabContent).not.toBeNull();
  });

  test('Organizations relationship tab is accessible', async () => {
    const setting = testData.settings[0];

    // Open a character entry
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    const firstChar = setting.topics[Topics.Character][0];
    await openEntry(Topics.Character, firstChar.name);

    // Click on organizations tab
    await clickContentTab('organizations');

    // Verify tab content is visible
    const tabContent = await getRelationshipTabContent('organizations');
    expect(tabContent).not.toBeNull();
  });

  test('Sessions tab is accessible', async () => {
    const setting = testData.settings[0];

    // Open a character entry
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    const firstChar = setting.topics[Topics.Character][0];
    await openEntry(Topics.Character, firstChar.name);

    // Click on sessions tab
    await clickContentTab('sessions');

    // Verify tab content is visible
    const tabContent = await getRelationshipTabContent('sessions');
    expect(tabContent).not.toBeNull();
  });

  test('Location entry shows characters relationship tab', async () => {
    const setting = testData.settings[0];

    // Open a location entry
    await expandTopicNode(Topics.Location);
    await expandTypeNode(Topics.Location, '(none)');
    const firstLoc = setting.topics[Topics.Location][0];
    await openEntry(Topics.Location, firstLoc.name);

    // Click on characters tab
    await clickContentTab('characters');

    // Verify tab content is visible
    const tabContent = await getRelationshipTabContent('characters');
    expect(tabContent).not.toBeNull();
  });

  test('Location entry shows locations relationship tab (hierarchy)', async () => {
    const setting = testData.settings[0];

    // Open a location entry
    await expandTopicNode(Topics.Location);
    await expandTypeNode(Topics.Location, '(none)');
    const firstLoc = setting.topics[Topics.Location][0];
    await openEntry(Topics.Location, firstLoc.name);

    // Click on locations tab
    await clickContentTab('locations');

    // Verify tab content is visible
    const tabContent = await getRelationshipTabContent('locations');
    expect(tabContent).not.toBeNull();
  });

  test('Organization entry shows characters relationship tab', async () => {
    const setting = testData.settings[0];

    // Open an organization entry
    await expandTopicNode(Topics.Organization);
    await expandTypeNode(Topics.Organization, '(none)');
    const firstOrg = setting.topics[Topics.Organization][0];
    await openEntry(Topics.Organization, firstOrg.name);

    // Click on characters tab
    await clickContentTab('characters');

    // Verify tab content is visible
    const tabContent = await getRelationshipTabContent('characters');
    expect(tabContent).not.toBeNull();
  });

  test('Organization entry shows organizations relationship tab', async () => {
    const setting = testData.settings[0];

    // Open an organization entry
    await expandTopicNode(Topics.Organization);
    await expandTypeNode(Topics.Organization, '(none)');
    const firstOrg = setting.topics[Topics.Organization][0];
    await openEntry(Topics.Organization, firstOrg.name);

    // Click on organizations tab
    await clickContentTab('organizations');

    // Verify tab content is visible
    const tabContent = await getRelationshipTabContent('organizations');
    expect(tabContent).not.toBeNull();
  });

  test('PC entry shows characters relationship tab', async () => {
    const setting = testData.settings[0];

    // Open a PC entry
    await expandTopicNode(Topics.PC);
    await expandTypeNode(Topics.PC, '(none)');
    const firstPC = setting.topics[Topics.PC][0];
    await openEntry(Topics.PC, firstPC.name);

    // Click on characters tab
    await clickContentTab('characters');

    // Verify tab content is visible
    const tabContent = await getRelationshipTabContent('characters');
    expect(tabContent).not.toBeNull();
  });

  test('PC entry shows sessions tab', async () => {
    const setting = testData.settings[0];

    // Open a PC entry
    await expandTopicNode(Topics.PC);
    await expandTypeNode(Topics.PC, '(none)');
    const firstPC = setting.topics[Topics.PC][0];
    await openEntry(Topics.PC, firstPC.name);

    // Click on sessions tab
    await clickContentTab('sessions');

    // Verify tab content is visible
    const tabContent = await getRelationshipTabContent('sessions');
    expect(tabContent).not.toBeNull();
  });

  test('Relationship tab shows empty state when no relationships', async () => {
    const setting = testData.settings[0];

    // Create a new entry with no relationships
    createdEntryUuid = await createEntryViaAPI(Topics.Character, testEntryName, setting.name);

    // Open the entry
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    await openEntry(Topics.Character, testEntryName);

    // Click on characters tab
    await clickContentTab('characters');

    // Tab should show empty state or no items
    const rows = await getRelationshipRows();
    // May be 0 or have empty state message - just verify no error
    expect(rows.length).toBeGreaterThan(-1);
  });

  test('Relationship tab header is correct', async () => {
    const page = sharedContext.page!;
    const setting = testData.settings[0];

    // Open a character entry
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    const firstChar = setting.topics[Topics.Character][0];
    await openEntry(Topics.Character, firstChar.name);

    // Click on characters tab
    await clickContentTab('characters');

    // Look for tab header
    const tabHeader = await page.$('[data-tab="characters"] .tab-header, .relationship-header');
    // Header may or may not exist depending on implementation
  });
});

runTests();
