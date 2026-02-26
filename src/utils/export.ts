/**
 * Module JSON Export Service
 *
 * Handles exporting all FCB module data to a JSON file.
 */

import { localize } from '@/utils/game';
import { ModuleSettings, SettingKey } from '@/settings/ModuleSettings';
import { FCBSetting, Campaign, Arc, Front, StoryWeb,FCBJournalEntryPage } from '@/classes';
import { Topics, ValidTopic } from '@/types';
import { downloadFile } from '@/utils/fileDownload';
import {
  EXPORT_VERSION,
  ModuleExportData,
  SettingExportData,
  ProgressCallback,
  isValidUuid,
  DocumentExportData,
} from './importExportCommon';

/**
 * Export all module data to a JSON file and trigger download.
 *
 * @param onProgress - Optional callback for progress updates
 */
export async function exportModuleJson(
  onProgress?: ProgressCallback
): Promise<void> {
  onProgress?.(localize('applications.importExport.exportStarting'), 0);

  const exportData: ModuleExportData = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    moduleSettings: {},
    settings: [],
  };

  // Collect module settings
  onProgress?.(localize('applications.importExport.collectingSettings'), 10);
  exportData.moduleSettings = collectModuleSettings();

  // Collect all settings and their documents
  const settingIndex = ModuleSettings.get(SettingKey.settingIndex);
  const totalSettings = settingIndex.length;

  for (let i = 0; i < settingIndex.length; i++) {
    const settingInfo = settingIndex[i];
    const progress = 10 + (i / totalSettings) * 80;
    onProgress?.(
      `${localize('applications.importExport.exportingSetting')}: ${settingInfo.name}`,
      progress
    );

    const setting = await FCBSetting.fromUuid(settingInfo.settingId);
    if (setting) {
      const settingData = await collectSettingData(setting);
      exportData.settings.push(settingData);
    }
  }

  // Create and download the file
  onProgress?.(localize('applications.importExport.creatingFile'), 95);
  const json = JSON.stringify(exportData, null, 2);
  const filename = `fcb-export-${new Date().toISOString().split('T')[0]}.json`;
  downloadFile(json, filename, 'application/json');

  onProgress?.(localize('applications.importExport.exportComplete'), 100);
}

/**
 * Collect module settings for export.
 *
 * @returns Object containing all settings to export
 */
function collectModuleSettings(): Record<string, unknown> {
  const settings: Record<string, unknown> = {};

  /** Settings to never include in export */
  const EXCLUDED_SETTINGS: SettingKey[] = [
    SettingKey.lastKnownVersion,
    SettingKey.settingIndex,
    SettingKey.isInPlayMode,
  ];

  // Add all setting except excluded ones
  for (const key of Object.values(SettingKey)) {
    if (!EXCLUDED_SETTINGS.includes(key)) {
      try {
        settings[key] = ModuleSettings.get(key);
      } catch {
        // Setting may not exist yet
      }
    }
  }

  return settings;
}

function addToDocuments<
  T extends FCBJournalEntryPage<any, any> & { description?: string | undefined }
>(
  collection: DocumentExportData[], 
  document: T, 
  cleaningFunction?: (data: Record<string, unknown>) => Record<string, unknown>) 
{
  let systemData = foundry.utils.deepClone(document.systemData);

  if (!systemData)
    throw new Error(`System data is undefined on ${document.name} in export.adToDocuments()`);

  if (cleaningFunction)
    systemData = cleaningFunction(systemData);

  collection.push({
    uuid: document.uuid,
    name: document.name,
    system: systemData,
    description: document.description || null,
  });
}
/**
 * Collect all data for a setting including all child documents.
 *
 * @param setting - The FCBSetting to collect data from
 * @returns Setting export data structure
 */
async function collectSettingData(setting: FCBSetting): Promise<SettingExportData> {
  const data: SettingExportData = {
    uuid: setting.uuid,
    name: setting.name,
    system: foundry.utils.deepClone(setting.systemData) as unknown as Record<string, unknown>,
    description: setting.description,
    documents: {
      entries: [],
      campaigns: [],
      sessions: [],
      arcs: [],
      fronts: [],
      storyWebs: [],
    },
  };

  // Collect entries from all topics
  for (const topic of [Topics.Character, Topics.Location, Topics.Organization, Topics.PC] as ValidTopic[]) {
    const topicFolder = setting.topicFolders[topic];
    if (topicFolder) {
      const entries = await topicFolder.allEntries();
      for (const entry of entries) {
        addToDocuments(data.documents.entries, entry, cleanEntrySystemData);
      }
    }
  }

  // Collect campaigns and their children
  for (const campaignIndex of setting.campaignIndex) {
    const campaign = await Campaign.fromUuid(campaignIndex.uuid);
    if (campaign) {
      addToDocuments(data.documents.campaigns, campaign, cleanCampaignSystemData);

      // Collect sessions
      const sessions = await campaign.allSessions();
      for (const session of sessions) {
        addToDocuments(data.documents.sessions, session, cleanSessionSystemData);
      }

      // Collect arcs
      for (const arcIndex of campaign.arcIndex) {
        const arc = await Arc.fromUuid(arcIndex.uuid);
        if (arc) {
          addToDocuments(data.documents.arcs, arc, cleanArcSystemData);
        }
      }

      // Collect fronts
      for (const frontId of campaign.frontIds) {
        const front = await Front.fromUuid(frontId);
        if (front) {
          addToDocuments(data.documents.fronts, front);
        }
      }

      // Collect story webs
      for (const storyWebId of campaign.storyWebIds) {
        const storyWeb = await StoryWeb.fromUuid(storyWebId);
        if (storyWeb) {
          // Get and clean the system data to remove invalid positions
          addToDocuments(data.documents.storyWebs, storyWeb, cleanInvalidPositions);
        }
      }
    }
  }

  return data;
}

/**
 * Clean entry system data for export.
 * - Clears actors and scenes arrays (non-FCB Foundry documents)
 * - Clears journals array (non-FCB Foundry documents)
 * - Cleans invalid relationships
 *
 * @param system - The system data to clean
 * @returns The cleaned system data
 */
function cleanEntrySystemData(system: Record<string, unknown>): Record<string, unknown> {
  const cleaned = { ...system };

  // Clear actors array - references non-FCB Foundry Actor documents
  cleaned.actors = [];

  // Clear scenes array - references non-FCB Foundry Scene documents
  cleaned.scenes = [];

  // Clear journals array - references non-FCB Foundry Journal documents
  cleaned.journals = [];

  // Clean invalid relationships (FCB-to-FCB references that may be corrupt)
  return cleanInvalidRelationships(cleaned);
}

/**
 * Clean session system data for export.
 * - Clears items and monsters arrays (non-FCB Foundry documents)
 * - Clears journals array (non-FCB Foundry documents)
 *
 * @param system - The system data to clean
 * @returns The cleaned system data
 */
function cleanSessionSystemData(system: Record<string, unknown>): Record<string, unknown> {
  const cleaned = { ...system };

  // Clear items array - references non-FCB Foundry Item documents
  cleaned.items = [];

  // Clear monsters array - references non-FCB Foundry Actor documents
  cleaned.monsters = [];

  // Clear journals array - references non-FCB Foundry Journal documents
  cleaned.journals = [];

  return cleaned;
}

/**
 * Clean arc system data for export.
 * - Clears monsters array (non-FCB Foundry documents)
 * - Clears journals array (non-FCB Foundry documents)
 *
 * @param system - The system data to clean
 * @returns The cleaned system data
 */
function cleanArcSystemData(system: Record<string, unknown>): Record<string, unknown> {
  const cleaned = { ...system };

  // Clear monsters array - references non-FCB Foundry Actor documents
  cleaned.monsters = [];

  // Clear journals array - references non-FCB Foundry Journal documents
  cleaned.journals = [];

  return cleaned;
}

/**
 * Clean campaign system data for export.
 * - Clears pcs array (non-FCB Foundry Actor documents)
 * - Clears journals array (non-FCB Foundry documents)
 *
 * @param system - The system data to clean
 * @returns The cleaned system data
 */
function cleanCampaignSystemData(system: Record<string, unknown>): Record<string, unknown> {
  const cleaned = { ...system };

  // Clear pcs array - references non-FCB Foundry Actor documents
  cleaned.pcs = [];

  // Clear journals array - references non-FCB Foundry Journal documents
  cleaned.journals = [];

  return cleaned;
}

/**
 * Clean invalid relationships from entry system data.
 * Removes relationship entries that reference invalid UUIDs or have missing required fields.
 *
 * @param system - The system data to clean
 * @returns The cleaned system data
 */
function cleanInvalidRelationships(system: Record<string, unknown>): Record<string, unknown> {
  if (!system.relationships || typeof system.relationships !== 'object') {
    return system;
  }

  const cleanedRelationships: Record<string, unknown> = {};
  const relationships = system.relationships as Record<string, unknown>;

  for (const [topic, entries] of Object.entries(relationships)) {
    // entries is an object with uuid keys and relationship details as values
    if (!entries || typeof entries !== 'object') {
      continue;
    }

    const cleanedEntries: Record<string, unknown> = {};
    for (const [entryUuid, details] of Object.entries(entries as Record<string, unknown>)) {
      // Check if the key UUID is valid - if it is, it basically has to be FCB; if it's not its corrupt
      if (!isValidUuid(entryUuid)) continue;

      cleanedEntries[entryUuid] = details;
    }
    cleanedRelationships[topic] = cleanedEntries;
  }

  return { ...system, relationships: cleanedRelationships };
}

/**
 * Clean invalid positions from story web system data.
 * Removes position entries that reference invalid UUIDs or have invalid coordinates.
 *
 * @param system - The system data to clean
 * @returns The cleaned system data
 */
function cleanInvalidPositions(system: Record<string, unknown>): Record<string, unknown> {
  if (!system.positions || typeof system.positions !== 'object') {
    return system;
  }

  const cleanedPositions: Record<string, unknown> = {};
  const positions = system.positions as Record<string, unknown>;

  for (const [uuid, coords] of Object.entries(positions)) {
    // Check if the key UUID is valid - we assume if valid it's an FCB doc
    if (!isValidUuid(uuid)) {
      console.warn(`Export: Removing position with invalid UUID: ${uuid}`);
      continue;
    }

    cleanedPositions[uuid] = coords;
  }

  return { ...system, positions: cleanedPositions };
}

export default {
  exportModuleJson,
};
