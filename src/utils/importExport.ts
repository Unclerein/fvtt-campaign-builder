/**
 * Module JSON Export/Import Service
 *
 * Handles exporting all FCB module data to a JSON file and importing
 * it into another Foundry world. This includes:
 * - All FCB Settings and their content (entries, campaigns, sessions, etc.)
 * - Module configuration settings
 * - UUID remapping to maintain relationships after import
 */

import { localize } from '@/utils/game';
import { ModuleSettings, SettingKey } from '@/settings/ModuleSettings';
import { RootFolder, FCBSetting, Campaign, Session, Arc, Front, StoryWeb, Entry } from '@/classes';
import { Topics, ValidTopic } from '@/types';
import GlobalSettingService from '@/utils/globalSettings';
import {
  remapUuidsInObject,
  remapRecordKeys,
} from '@/utils/uuidRemapping';
import { downloadFile } from '@/utils/fileDownload';

/** Current export format version */
const EXPORT_VERSION = '1.0.0';

/** Export data structure */
interface ModuleExportData {
  version: string;
  exportedAt: string;
  moduleSettings: Record<string, unknown>;
  settings: SettingExportData[];
}

/** Setting export data structure */
interface SettingExportData {
  uuid: string;
  name: string;
  system: Record<string, unknown>;
  text: string | null;
  documents: {
    entries: DocumentExportData[];
    campaigns: DocumentExportData[];
    sessions: DocumentExportData[];
    arcs: DocumentExportData[];
    fronts: DocumentExportData[];
    storyWebs: DocumentExportData[];
  };
}

/** Individual document export data */
interface DocumentExportData {
  uuid: string;
  name: string;
  system: Record<string, unknown>;
  text: string | null;
}

/** Progress callback type */
export type ProgressCallback = (message: string, progress?: number) => void;

/**
 * Export all module data to a JSON file and trigger download.
 *
 * @param includeClientSettings - Whether to include client-scoped settings
 * @param onProgress - Optional callback for progress updates
 */
export async function exportModuleJson(
  includeClientSettings: boolean,
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
  exportData.moduleSettings = collectModuleSettings(includeClientSettings);

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
 * @param includeClientSettings - Whether to include client-scoped settings
 * @returns Object containing all settings to export
 */
function collectModuleSettings(includeClientSettings: boolean): Record<string, unknown> {
  const settings: Record<string, unknown> = {};

  /** World-scoped settings to always include in export; can't define in global because of initialization order */
  const WORLD_SCOPED_SETTINGS: SettingKey[] = [
    SettingKey.rootFolderId,
    SettingKey.voiceRecordingFolder,
    SettingKey.autoRefreshRollTables,
    SettingKey.speciesList,
    SettingKey.generatorDefaultTypes,
    SettingKey.contentTags,
    SettingKey.customFields,
    SettingKey.aiImagePrompts,
    SettingKey.aiImageConfigurations,
    SettingKey.APIURL,
    SettingKey.APIToken,
    SettingKey.selectedTextModel,
    SettingKey.selectedImageModel,
    SettingKey.useGmailToDos,
    SettingKey.emailDefaultSetting,
    SettingKey.emailDefaultCampaign,
    SettingKey.showImages,
    SettingKey.storyWebConnectionColors,
    SettingKey.storyWebConnectionStyles,
    SettingKey.storyWebNodeFields,
    SettingKey.storyWebCustomNodeColorSchemes,
    SettingKey.tableGroupingSettings,
    SettingKey.hideBackendWarning,
    SettingKey.useFronts,
    SettingKey.useStoryWebs,
    SettingKey.enableVoiceRecording,
  ];

  /** Client-scoped settings to optionally include */
  const CLIENT_SCOPED_SETTINGS: SettingKey[] = [
    SettingKey.startCollapsed,
    SettingKey.displaySessionNotes,
    SettingKey.sessionDisplayMode,
    SettingKey.defaultAddToSession,
    SettingKey.sessionBookmark,
    SettingKey.enableToDoList,
    SettingKey.autoRelationships,
    SettingKey.showTypesInTree,
    SettingKey.subTabsSavePosition,
    SettingKey.storyWebAutoArrange,
    SettingKey.genericFoundryTab,
    SettingKey.groupTreeByType,
    SettingKey.mainWindowBounds,
  ];

  // Add world-scoped settings
  for (const key of WORLD_SCOPED_SETTINGS) {
    try {
      settings[key] = ModuleSettings.get(key);
    } catch {
      // Setting may not exist yet
    }
  }

  // Optionally add client-scoped settings
  if (includeClientSettings) {
    for (const key of CLIENT_SCOPED_SETTINGS) {
      try {
        settings[key] = ModuleSettings.get(key);
      } catch {
        // Setting may not exist yet
      }
    }
  }

  return settings;
}

/**
 * Get system data from a document as a plain object.
 * Uses the raw document's toObject method to get a serializable copy.
 *
 * @param doc - The document wrapper (FCBSetting, Entry, etc.)
 * @returns The system data as a plain object
 */
function getSystemData(doc: { raw: { toObject: (lean: boolean) => { system: unknown } } }): Record<string, unknown> {
  const obj = doc.raw.toObject(false);
  return foundry.utils.deepClone(obj.system) as Record<string, unknown>;
}

/**
 * Get text content from a document.
 *
 * @param doc - The document wrapper
 * @returns The text content or null
 */
function getTextContent(doc: { raw: { toObject: (lean: boolean) => { text?: { content?: string } | null } } }): string | null {
  const obj = doc.raw.toObject(false);
  return obj.text?.content || null;
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
    system: getSystemData(setting),
    text: getTextContent(setting as unknown as { raw: { toObject: (lean: boolean) => { text?: { content?: string } | null; system: unknown } } }),
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
        data.documents.entries.push({
          uuid: entry.uuid,
          name: entry.name,
          system: getSystemData(entry as unknown as { raw: { toObject: (lean: boolean) => { system: unknown } } }),
          text: getTextContent(entry as unknown as { raw: { toObject: (lean: boolean) => { text?: { content?: string } | null; system: unknown } } }),
        });
      }
    }
  }

  // Collect campaigns and their children
  for (const campaignIndex of setting.campaignIndex) {
    const campaign = await Campaign.fromUuid(campaignIndex.uuid);
    if (campaign) {
      data.documents.campaigns.push({
        uuid: campaign.uuid,
        name: campaign.name,
        system: getSystemData(campaign as unknown as { raw: { toObject: (lean: boolean) => { system: unknown } } }),
        text: getTextContent(campaign as unknown as { raw: { toObject: (lean: boolean) => { text?: { content?: string } | null; system: unknown } } }),
      });

      // Collect sessions
      const sessions = await campaign.allSessions();
      for (const session of sessions) {
        data.documents.sessions.push({
          uuid: session.uuid,
          name: session.name,
          system: getSystemData(session as unknown as { raw: { toObject: (lean: boolean) => { system: unknown } } }),
          text: getTextContent(session as unknown as { raw: { toObject: (lean: boolean) => { text?: { content?: string } | null; system: unknown } } }),
        });
      }

      // Collect arcs
      for (const arcIndex of campaign.arcIndex) {
        const arc = await Arc.fromUuid(arcIndex.uuid);
        if (arc) {
          data.documents.arcs.push({
            uuid: arc.uuid,
            name: arc.name,
            system: getSystemData(arc as unknown as { raw: { toObject: (lean: boolean) => { system: unknown } } }),
            text: getTextContent(arc as unknown as { raw: { toObject: (lean: boolean) => { text?: { content?: string } | null; system: unknown } } }),
          });
        }
      }

      // Collect fronts
      for (const frontId of campaign.frontIds) {
        const front = await Front.fromUuid(frontId);
        if (front) {
          data.documents.fronts.push({
            uuid: front.uuid,
            name: front.name,
            system: getSystemData(front as unknown as { raw: { toObject: (lean: boolean) => { system: unknown } } }),
            text: getTextContent(front as unknown as { raw: { toObject: (lean: boolean) => { text?: { content?: string } | null; system: unknown } } }),
          });
        }
      }

      // Collect story webs
      for (const storyWebId of campaign.storyWebIds) {
        const storyWeb = await StoryWeb.fromUuid(storyWebId);
        if (storyWeb) {
          data.documents.storyWebs.push({
            uuid: storyWeb.uuid,
            name: storyWeb.name,
            system: getSystemData(storyWeb as unknown as { raw: { toObject: (lean: boolean) => { system: unknown } } }),
            text: null,
          });
        }
      }
    }
  }

  return data;
}

/**
 * Import module data from a JSON file.
 *
 * @param file - The JSON file to import
 * @param onProgress - Optional callback for progress updates
 */
export async function importModuleJson(
  file: File,
  onProgress?: ProgressCallback
): Promise<void> {
  onProgress?.(localize('applications.importExport.importStarting'), 0);

  // Read and parse the file
  onProgress?.(localize('applications.importExport.readingFile'), 5);
  const text = await file.text();
  let data: ModuleExportData;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(localize('applications.importExport.invalidFile'));
  }

  // Validate the file structure
  if (!validateExportData(data)) {
    throw new Error(localize('applications.importExport.invalidFile'));
  }

  // Delete all existing settings
  onProgress?.(localize('applications.importExport.deletingExisting'), 10);
  await deleteAllSettings();

  // UUID mapping: old UUID -> new UUID
  const uuidMap = new Map<string, string>();

  // Import module settings (remapped to remove old setting UUIDs)
  onProgress?.(localize('applications.importExport.importingSettings'), 15);
  await importModuleSettings(data.moduleSettings);

  // Import settings and documents
  const totalSettings = data.settings.length;

  for (let i = 0; i < data.settings.length; i++) {
    const settingData = data.settings[i];
    const progress = 15 + (i / totalSettings) * 80;
    onProgress?.(
      `${localize('applications.importExport.importingSetting')}: ${settingData.name}`,
      progress
    );

    await importSetting(settingData, uuidMap);
  }

  // Remap all UUIDs in all documents
  onProgress?.(localize('applications.importExport.remappingUuids'), 95);
  await remapAllDocumentUuids(uuidMap);

  onProgress?.(localize('applications.importExport.importComplete'), 100);
}

/**
 * Validate export data structure.
 *
 * @param data - The data to validate
 * @returns True if valid
 */
function validateExportData(data: unknown): data is ModuleExportData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;

  if (typeof d.version !== 'string') return false;
  if (typeof d.exportedAt !== 'string') return false;
  if (typeof d.moduleSettings !== 'object') return false;
  if (!Array.isArray(d.settings)) return false;

  return true;
}

/**
 * Delete all existing FCB settings.
 */
async function deleteAllSettings(): Promise<void> {
  const settingIndex = ModuleSettings.get(SettingKey.settingIndex);

  // Delete in reverse order to avoid index issues
  for (let i = settingIndex.length - 1; i >= 0; i--) {
    const settingInfo = settingIndex[i];
    const setting = await FCBSetting.fromUuid(settingInfo.settingId);
    if (setting) {
      await setting.delete();
    }
  }

  // Clear the index
  await ModuleSettings.set(SettingKey.settingIndex, []);

  // Clear global cache
  GlobalSettingService.clearAll();
}

/**
 * Import module settings from export data.
 *
 * @param settings - The settings to import
 */
async function importModuleSettings(settings: Record<string, unknown>): Promise<void> {
  /** Settings to never include in export */
  const EXCLUDED_SETTINGS: SettingKey[] = [
    SettingKey.lastKnownVersion,
    SettingKey.settingIndex,
    SettingKey.isInPlayMode,
  ];

  for (const [key, value] of Object.entries(settings)) {
    // Skip excluded settings
    if (EXCLUDED_SETTINGS.includes(key as SettingKey)) continue;

    // Skip settingIndex - it will be rebuilt
    if (key === SettingKey.settingIndex) continue;

    try {
      // Cast the key and value - TypeScript can't verify this at compile time
      await ModuleSettings.set(key as SettingKey, value as never);
    } catch {
      // Setting may not exist or have type mismatch
      console.warn(`Failed to import setting: ${key}`);
    }
  }
}

/**
 * Import a single setting and all its documents.
 *
 * @param settingData - The setting data to import
 * @param uuidMap - Map to populate with UUID mappings
 */
async function importSetting(
  settingData: SettingExportData,
  uuidMap: Map<string, string>
): Promise<void> {
  // Create the compendium
  const compendiumId = await createCompendium(settingData.name);
  if (!compendiumId) {
    throw new Error(`Failed to create compendium for setting: ${settingData.name}`);
  }

  // Create the setting document
  const setting = await FCBSetting.create(false, settingData.name, compendiumId, true);
  if (!setting) {
    throw new Error(`Failed to create setting: ${settingData.name}`);
  }

  // Map the old setting UUID to the new one
  uuidMap.set(settingData.uuid, setting.uuid);

  // Import entries
  await importEntries(setting, settingData.documents.entries, uuidMap);

  // Import campaigns
  await importCampaigns(setting, settingData.documents.campaigns, uuidMap);

  // Import sessions (need campaign mapping)
  await importSessions(settingData.documents.sessions, uuidMap);

  // Import arcs
  await importArcs(settingData.documents.arcs, uuidMap);

  // Import fronts
  await importFronts(settingData.documents.fronts, uuidMap);

  // Import story webs
  await importStoryWebs(settingData.documents.storyWebs, uuidMap);

  // Update setting system data - we'll do full remap later
  // For now, just update the text content if available
  if (settingData.text) {
    setting.description = settingData.text;
    await setting.save();
  }
}

/**
 * Create a new compendium for a setting.
 *
 * @param name - The name for the compendium
 * @returns The compendium ID or null on failure
 */
async function createCompendium(name: string): Promise<string | null> {
  const metadata = {
    name: foundry.utils.randomID(),
    label: `FCB - ${name}`,
    type: 'JournalEntry' as const,
    ownership: {
      GAMEMASTER: 'OWNER' as const,
      ASSISTANT: 'LIMITED' as const,
      TRUSTED: 'LIMITED' as const,
      PLAYER: 'LIMITED' as const,
    },
    locked: false,
  };

  const rootFolder = await RootFolder.get();
  const pack = await foundry.documents.collections.CompendiumCollection.createCompendium(
    metadata
  ) as CompendiumCollection<'JournalEntry'>;
  // Use the folder ID string - the type definition is too strict
  if (rootFolder.raw.id) {
    await pack.setFolder(rootFolder.raw.id);
  }

  const compendiumId = pack.metadata.id;

  // Create folders inside compendium
  const folderNames = [
    localize('contentFolders.sessions'),
    localize('contentFolders.campaigns'),
    localize('contentFolders.entries'),
    localize('contentFolders.fronts'),
  ];

  const folders = folderNames.map((folderName) => ({
    name: folderName,
    type: 'JournalEntry' as const,
    sorting: 'a' as const,
  }));

  await Folder.createDocuments(folders, { pack: compendiumId });

  return compendiumId;
}

/**
 * Import entries into a setting.
 *
 * @param setting - The setting to import into
 * @param entries - The entry data to import
 * @param uuidMap - Map to populate with UUID mappings
 */
async function importEntries(
  setting: FCBSetting,
  entries: DocumentExportData[],
  uuidMap: Map<string, string>
): Promise<void> {
  for (const entryData of entries) {
    const topic = entryData.system.topic as ValidTopic;
    const topicFolder = setting.topicFolders[topic];
    if (!topicFolder) continue;

    // Create the entry - providing name skips the dialog
    const entry = await Entry.create(topicFolder, {
      name: entryData.name,
      type: entryData.system.type as string,
    });

    if (entry) {
      uuidMap.set(entryData.uuid, entry.uuid);

      // Update the document with the full system data
      // We'll set text and do full system remap later
      if (entryData.text) {
        entry.description = entryData.text;
        await entry.save();
      }
    }
  }
}

/**
 * Import campaigns into a setting.
 *
 * @param setting - The setting to import into
 * @param campaigns - The campaign data to import
 * @param uuidMap - Map to populate with UUID mappings
 */
async function importCampaigns(
  setting: FCBSetting,
  campaigns: DocumentExportData[],
  uuidMap: Map<string, string>
): Promise<void> {
  for (const campaignData of campaigns) {
    const campaign = await Campaign.create(setting, campaignData.name);
    if (campaign) {
      uuidMap.set(campaignData.uuid, campaign.uuid);

      // Set text content
      if (campaignData.text) {
        campaign.description = campaignData.text;
        await campaign.save();
      }
    }
  }
}

/**
 * Import sessions.
 *
 * @param sessions - The session data to import
 * @param uuidMap - Map of UUIDs for remapping
 */
async function importSessions(
  sessions: DocumentExportData[],
  uuidMap: Map<string, string>
): Promise<void> {
  for (const sessionData of sessions) {
    const campaignId = uuidMap.get(sessionData.system.campaignId as string);
    if (!campaignId) continue;

    const campaign = await Campaign.fromUuid(campaignId);
    if (!campaign) continue;

    const session = await Session.create(campaign, sessionData.name);
    if (session) {
      uuidMap.set(sessionData.uuid, session.uuid);

      // Set text content
      if (sessionData.text) {
        session.description = sessionData.text;
        await session.save();
      }
    }
  }
}

/**
 * Import arcs.
 *
 * @param arcs - The arc data to import
 * @param uuidMap - Map of UUIDs for remapping
 */
async function importArcs(
  arcs: DocumentExportData[],
  uuidMap: Map<string, string>
): Promise<void> {
  for (const arcData of arcs) {
    const campaignId = uuidMap.get(arcData.system.campaignId as string);
    if (!campaignId) continue;

    const campaign = await Campaign.fromUuid(campaignId);
    if (!campaign) continue;

    const arc = await Arc.create(campaign, arcData.name);
    if (arc) {
      uuidMap.set(arcData.uuid, arc.uuid);

      // Set text content
      if (arcData.text) {
        arc.description = arcData.text;
        await arc.save();
      }
    }
  }
}

/**
 * Import fronts.
 *
 * @param fronts - The front data to import
 * @param uuidMap - Map of UUIDs for remapping
 */
async function importFronts(
  fronts: DocumentExportData[],
  uuidMap: Map<string, string>
): Promise<void> {
  for (const frontData of fronts) {
    const campaignId = uuidMap.get(frontData.system.campaignId as string);
    if (!campaignId) continue;

    const campaign = await Campaign.fromUuid(campaignId);
    if (!campaign) continue;

    const front = await Front.create(campaign, frontData.name);
    if (front) {
      uuidMap.set(frontData.uuid, front.uuid);

      // Set text content
      if (frontData.text) {
        front.description = frontData.text;
        await front.save();
      }
    }
  }
}

/**
 * Import story webs.
 *
 * @param storyWebs - The story web data to import
 * @param uuidMap - Map of UUIDs for remapping
 */
async function importStoryWebs(
  storyWebs: DocumentExportData[],
  uuidMap: Map<string, string>
): Promise<void> {
  for (const storyWebData of storyWebs) {
    const campaignId = uuidMap.get(storyWebData.system.campaignId as string);
    if (!campaignId) continue;

    const campaign = await Campaign.fromUuid(campaignId);
    if (!campaign) continue;

    const storyWeb = await StoryWeb.create(campaign, storyWebData.name);
    if (storyWeb) {
      uuidMap.set(storyWebData.uuid, storyWeb.uuid);
    }
  }
}

/**
 * Update a document's system data with remapped UUIDs.
 *
 * @param doc - The document wrapper with raw property
 * @param systemData - The system data to apply (with remapped UUIDs)
 */
async function updateDocumentSystemData(
  doc: { raw: { update: (data: unknown, options?: unknown) => Promise<unknown> }; save: () => Promise<void> },
  systemData: Record<string, unknown>
): Promise<void> {
  // Update the document directly with the new system data
  await doc.raw.update(
    { system: systemData },
    { recursive: false, render: false }
  );
}

/**
 * Remap all UUIDs in all documents after import.
 *
 * @param uuidMap - Map of old UUIDs to new UUIDs
 */
async function remapAllDocumentUuids(uuidMap: Map<string, string>): Promise<void> {
  const settingIndex = ModuleSettings.get(SettingKey.settingIndex);

  for (const settingInfo of settingIndex) {
    const setting = await FCBSetting.fromUuid(settingInfo.settingId);
    if (!setting) continue;

    // Get current system data, remap, and update
    const settingSystem = getSystemData(setting as unknown as { raw: { toObject: (lean: boolean) => { system: unknown } } });
    const remappedSettingSystem = remapUuidsInObject(settingSystem, uuidMap) as Record<string, unknown>;

    // Remap text content
    const settingText = getTextContent(setting as unknown as { raw: { toObject: (lean: boolean) => { text?: { content?: string } | null; system: unknown } } });
    if (settingText) {
      const remappedText = remapUuidsInObject(settingText, uuidMap) as string;
      setting.description = remappedText;
    }

    // Remap hierarchies keys
    if (remappedSettingSystem.hierarchies) {
      remappedSettingSystem.hierarchies = remapRecordKeys(
        remappedSettingSystem.hierarchies as Record<string, unknown>,
        uuidMap
      );
    }

    // Remap expandedIds keys
    if (remappedSettingSystem.expandedIds) {
      remappedSettingSystem.expandedIds = remapRecordKeys(
        remappedSettingSystem.expandedIds as Record<string, unknown>,
        uuidMap
      );
    }

    // Update the setting document
    await updateDocumentSystemData(
      setting as unknown as { raw: { update: (data: unknown, options?: unknown) => Promise<unknown> }; save: () => Promise<void> },
      remappedSettingSystem
    );

    // Remap entries
    for (const topic of [Topics.Character, Topics.Location, Topics.Organization, Topics.PC] as ValidTopic[]) {
      const topicFolder = setting.topicFolders[topic];
      if (topicFolder) {
        const entries = await topicFolder.allEntries();
        for (const entry of entries) {
          const entrySystem = getSystemData(entry as unknown as { raw: { toObject: (lean: boolean) => { system: unknown } } });
          const remappedEntrySystem = remapUuidsInObject(entrySystem, uuidMap) as Record<string, unknown>;

          const entryText = getTextContent(entry as unknown as { raw: { toObject: (lean: boolean) => { text?: { content?: string } | null; system: unknown } } });
          if (entryText) {
            entry.description = remapUuidsInObject(entryText, uuidMap) as string;
          }

          await updateDocumentSystemData(
            entry as unknown as { raw: { update: (data: unknown, options?: unknown) => Promise<unknown> }; save: () => Promise<void> },
            remappedEntrySystem
          );
        }
      }
    }

    // Remap campaigns and their children
    for (const campaignIndex of setting.campaignIndex) {
      const campaign = await Campaign.fromUuid(campaignIndex.uuid);
      if (!campaign) continue;

      const campaignSystem = getSystemData(campaign as unknown as { raw: { toObject: (lean: boolean) => { system: unknown } } });
      const remappedCampaignSystem = remapUuidsInObject(campaignSystem, uuidMap) as Record<string, unknown>;

      const campaignText = getTextContent(campaign as unknown as { raw: { toObject: (lean: boolean) => { text?: { content?: string } | null; system: unknown } } });
      if (campaignText) {
        campaign.description = remapUuidsInObject(campaignText, uuidMap) as string;
      }

      await updateDocumentSystemData(
        campaign as unknown as { raw: { update: (data: unknown, options?: unknown) => Promise<unknown> }; save: () => Promise<void> },
        remappedCampaignSystem
      );

      // Remap sessions
      const sessions = await campaign.allSessions();
      for (const session of sessions) {
        const sessionSystem = getSystemData(session as unknown as { raw: { toObject: (lean: boolean) => { system: unknown } } });
        const remappedSessionSystem = remapUuidsInObject(sessionSystem, uuidMap) as Record<string, unknown>;

        const sessionText = getTextContent(session as unknown as { raw: { toObject: (lean: boolean) => { text?: { content?: string } | null; system: unknown } } });
        if (sessionText) {
          session.description = remapUuidsInObject(sessionText, uuidMap) as string;
        }

        await updateDocumentSystemData(
          session as unknown as { raw: { update: (data: unknown, options?: unknown) => Promise<unknown> }; save: () => Promise<void> },
          remappedSessionSystem
        );
      }

      // Remap arcs
      for (const arcIndex of campaign.arcIndex) {
        const arc = await Arc.fromUuid(arcIndex.uuid);
        if (arc) {
          const arcSystem = getSystemData(arc as unknown as { raw: { toObject: (lean: boolean) => { system: unknown } } });
          const remappedArcSystem = remapUuidsInObject(arcSystem, uuidMap) as Record<string, unknown>;

          const arcText = getTextContent(arc as unknown as { raw: { toObject: (lean: boolean) => { text?: { content?: string } | null; system: unknown } } });
          if (arcText) {
            arc.description = remapUuidsInObject(arcText, uuidMap) as string;
          }

          await updateDocumentSystemData(
            arc as unknown as { raw: { update: (data: unknown, options?: unknown) => Promise<unknown> }; save: () => Promise<void> },
            remappedArcSystem
          );
        }
      }

      // Remap fronts
      for (const frontId of campaign.frontIds) {
        const front = await Front.fromUuid(frontId);
        if (front) {
          const frontSystem = getSystemData(front as unknown as { raw: { toObject: (lean: boolean) => { system: unknown } } });
          const remappedFrontSystem = remapUuidsInObject(frontSystem, uuidMap) as Record<string, unknown>;

          const frontText = getTextContent(front as unknown as { raw: { toObject: (lean: boolean) => { text?: { content?: string } | null; system: unknown } } });
          if (frontText) {
            front.description = remapUuidsInObject(frontText, uuidMap) as string;
          }

          await updateDocumentSystemData(
            front as unknown as { raw: { update: (data: unknown, options?: unknown) => Promise<unknown> }; save: () => Promise<void> },
            remappedFrontSystem
          );
        }
      }

      // Remap story webs
      for (const storyWebId of campaign.storyWebIds) {
        const storyWeb = await StoryWeb.fromUuid(storyWebId);
        if (storyWeb) {
          const storyWebSystem = getSystemData(storyWeb as unknown as { raw: { toObject: (lean: boolean) => { system: unknown } } });
          const remappedStoryWebSystem = remapUuidsInObject(storyWebSystem, uuidMap) as Record<string, unknown>;

          // Remap positions, edgeStyles, nodeStyles keys
          if (remappedStoryWebSystem.positions) {
            remappedStoryWebSystem.positions = remapRecordKeys(
              remappedStoryWebSystem.positions as Record<string, unknown>,
              uuidMap
            );
          }
          if (remappedStoryWebSystem.edgeStyles) {
            remappedStoryWebSystem.edgeStyles = remapRecordKeys(
              remappedStoryWebSystem.edgeStyles as Record<string, unknown>,
              uuidMap
            );
          }
          if (remappedStoryWebSystem.nodeStyles) {
            remappedStoryWebSystem.nodeStyles = remapRecordKeys(
              remappedStoryWebSystem.nodeStyles as Record<string, unknown>,
              uuidMap
            );
          }

          await updateDocumentSystemData(
            storyWeb as unknown as { raw: { update: (data: unknown, options?: unknown) => Promise<unknown> }; save: () => Promise<void> },
            remappedStoryWebSystem
          );
        }
      }
    }
  }
}

export default {
  exportModuleJson,
  importModuleJson,
};
