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

/** Import context to track original data and mappings */
interface ImportContext {
  /** Maps old UUID -> new UUID (for remapping content) */
  uuidMap: Map<string, string>;
  /** Maps new UUID -> old UUID (for finding original data during second pass) */
  reverseUuidMap: Map<string, string>;
  /** Original document data keyed by old UUID */
  originalData: Map<string, DocumentExportData>;
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

/** Pattern for valid FCB compendium UUIDs */
const VALID_UUID_PATTERN = /^Compendium\.world\.[^.]+\.(JournalEntry|JournalEntryPage)\.[a-zA-Z0-9]+$/;

/** Pattern for valid JournalEntryPage UUIDs */
const VALID_JOURNAL_ENTRY_PAGE_PATTERN = /^JournalEntry\.[^.]+\.JournalEntryPage\.[a-zA-Z0-9]+$/;

/**
 * Check if a UUID string is valid (either an FCB compendium UUID or other valid Foundry UUID).
 *
 * @param uuid - The UUID to check
 * @returns True if the UUID is valid or not a string
 */
function isValidUuid(uuid: unknown): boolean {
  if (typeof uuid !== 'string') return true; // Non-strings are handled elsewhere
  if (!uuid) return false; // Empty strings are invalid

  // Valid if it's an FCB compendium UUID
  if (VALID_UUID_PATTERN.test(uuid)) return true;

  // Valid if it's a JournalEntryPage UUID
  if (VALID_JOURNAL_ENTRY_PAGE_PATTERN.test(uuid)) return true;

  // Valid if it starts with Actor., Scene., Item., etc. (non-FCB documents)
  if (/^(Actor|Scene|Item|RollTable|Macro|Playlist)\.[^.]+\.[a-zA-Z0-9]+/.test(uuid)) return true;

  // If it contains "Compendium" but doesn't match our pattern, it might be invalid
  if (uuid.includes('Compendium.') && !uuid.startsWith('Compendium.world.')) {
    return false;
  }

  // Default to valid for other patterns
  return true;
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
    if (!entries || typeof entries !== 'object') {
      continue;
    }

    const cleanedEntries: Record<string, unknown> = {};
    for (const [entryUuid, details] of Object.entries(entries as Record<string, unknown>)) {
      // Check if the key UUID is valid
      if (!isValidUuid(entryUuid)) {
        console.warn(`Export: Removing relationship with invalid key UUID: ${entryUuid}`);
        continue;
      }

      // Check if the details object has valid required fields
      if (details && typeof details === 'object') {
        const detailObj = details as Record<string, unknown>;
        
        // Check uuid field
        if (!isValidUuid(detailObj.uuid)) {
          console.warn(`Export: Removing relationship with invalid uuid field: ${detailObj.uuid}`);
          continue;
        }
        
        // Check topic field - required by schema
        if (detailObj.topic === null || detailObj.topic === undefined || detailObj.topic === '') {
          console.warn(`Export: Removing relationship with invalid topic field`);
          continue;
        }
      }

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
    // Check if the key UUID is valid
    if (!isValidUuid(uuid)) {
      console.warn(`Export: Removing position with invalid UUID: ${uuid}`);
      continue;
    }

    // Check if coordinates are valid
    if (coords && typeof coords === 'object') {
      const coordObj = coords as Record<string, unknown>;
      if (typeof coordObj.x !== 'number' || typeof coordObj.y !== 'number') {
        console.warn(`Export: Removing position with invalid coordinates for ${uuid}`);
        continue;
      }
    }

    cleanedPositions[uuid] = coords;
  }

  return { ...system, positions: cleanedPositions };
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
        // Get and clean the system data to remove invalid relationships
        let entrySystem = getSystemData(entry as unknown as { raw: { toObject: (lean: boolean) => { system: unknown } } });
        entrySystem = cleanInvalidRelationships(entrySystem);

        data.documents.entries.push({
          uuid: entry.uuid,
          name: entry.name,
          system: entrySystem,
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
          // Get and clean the system data to remove invalid positions
          let storyWebSystem = getSystemData(storyWeb as unknown as { raw: { toObject: (lean: boolean) => { system: unknown } } });
          storyWebSystem = cleanInvalidPositions(storyWebSystem);

          data.documents.storyWebs.push({
            uuid: storyWeb.uuid,
            name: storyWeb.name,
            system: storyWebSystem,
            text: null,
          });
        }
      }
    }
  }

  return data;
}

/**
 * Validate all data in the export before importing.
 * This checks all relationships and UUID references to ensure they are valid.
 * Throws an error at the first sign of invalid data.
 *
 * @param data - The export data to validate
 * @throws Error if any invalid data is found
 */
function validateExportDataForImport(data: ModuleExportData): void {
  for (const settingData of data.settings) {
    // Validate setting relationships
    validateRelationshipsInSystem(settingData.system, `Setting "${settingData.name}"`);

    // Validate entries
    for (const entryData of settingData.documents.entries) {
      validateRelationshipsInSystem(entryData.system, `Entry "${entryData.name}"`);
    }

    // Validate campaigns
    for (const campaignData of settingData.documents.campaigns) {
      validateRelationshipsInSystem(campaignData.system, `Campaign "${campaignData.name}"`);
    }

    // Validate sessions
    for (const sessionData of settingData.documents.sessions) {
      validateRelationshipsInSystem(sessionData.system, `Session "${sessionData.name}"`);
    }

    // Validate arcs
    for (const arcData of settingData.documents.arcs) {
      validateRelationshipsInSystem(arcData.system, `Arc "${arcData.name}"`);
    }

    // Validate fronts
    for (const frontData of settingData.documents.fronts) {
      validateRelationshipsInSystem(frontData.system, `Front "${frontData.name}"`);
    }

    // Validate story webs
    for (const storyWebData of settingData.documents.storyWebs) {
      validateRelationshipsInSystem(storyWebData.system, `Story Web "${storyWebData.name}"`);
      validatePositionsInSystem(storyWebData.system, `Story Web "${storyWebData.name}"`);
    }
  }
}

/**
 * Validate relationships in a system data object.
 *
 * @param system - The system data to validate
 * @param documentName - Name of the document for error messages
 * @throws Error if invalid relationship data is found
 */
function validateRelationshipsInSystem(system: Record<string, unknown>, documentName: string): void {
  if (!system.relationships || typeof system.relationships !== 'object') {
    return;
  }

  const relationships = system.relationships as Record<string, unknown>;
  const validTopicKeys = ['1', '2', '3', '4']; // Topics.Character=1, Location=2, Organization=3, PC=4

  for (const [topicKey, entries] of Object.entries(relationships)) {
    // Validate topic key is valid
    if (!validTopicKeys.includes(topicKey)) {
      throw new Error(
        `Import validation failed for "${documentName}": Invalid topic key "${topicKey}" in relationships. ` +
        `Expected one of: ${validTopicKeys.join(', ')}. The export file may be corrupted.`
      );
    }

    if (!entries || typeof entries !== 'object') {
      continue;
    }

    for (const [entryUuid, details] of Object.entries(entries as Record<string, unknown>)) {
      // Check if the key UUID is valid
      if (!isValidUuid(entryUuid)) {
        throw new Error(
          `Import validation failed for "${documentName}": Invalid relationship key UUID "${entryUuid}" in topic "${topicKey}". ` +
          `The export file may be corrupted.`
        );
      }

      // Check if the details object has valid required fields
      if (details && typeof details === 'object') {
        const detailObj = details as Record<string, unknown>;
        
        // Check uuid field
        if (!isValidUuid(detailObj.uuid)) {
          throw new Error(
            `Import validation failed for "${documentName}": Invalid relationship uuid field "${detailObj.uuid}" in topic "${topicKey}". ` +
            `The export file may be corrupted.`
          );
        }
        
        // Check topic field - should be a number 1-4
        const topicValue = detailObj.topic;
        if (topicValue === null || topicValue === undefined) {
          throw new Error(
            `Import validation failed for "${documentName}": Missing topic field in relationship for UUID "${entryUuid}" in topic "${topicKey}". ` +
            `The export file may be corrupted.`
          );
        }
      }
    }
  }
}

/**
 * Validate positions in a story web system data object.
 *
 * @param system - The system data to validate
 * @param documentName - Name of the document for error messages
 * @throws Error if invalid position data is found
 */
function validatePositionsInSystem(system: Record<string, unknown>, documentName: string): void {
  if (!system.positions || typeof system.positions !== 'object') {
    return;
  }

  const positions = system.positions as Record<string, unknown>;

  for (const [uuid, coords] of Object.entries(positions)) {
    // Check if the key UUID is valid
    if (!isValidUuid(uuid)) {
      throw new Error(
        `Import validation failed for "${documentName}": Invalid position UUID "${uuid}". ` +
        `The export file may be corrupted.`
      );
    }

    // Check if coordinates are valid
    if (coords && typeof coords === 'object') {
      const coordObj = coords as Record<string, unknown>;
      if (typeof coordObj.x !== 'number' || typeof coordObj.y !== 'number') {
        throw new Error(
          `Import validation failed for "${documentName}": Invalid coordinates for position "${uuid}". ` +
          `The export file may be corrupted.`
        );
      }
    }
  }
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

  // Validate all data before making any changes
  onProgress?.(localize('applications.importExport.validatingData'), 8);
  validateExportDataForImport(data);

  // Delete all existing settings
  onProgress?.(localize('applications.importExport.deletingExisting'), 10);
  await deleteAllSettings();

  // Create import context with UUID mapping and original data storage
  const context: ImportContext = {
    uuidMap: new Map<string, string>(),
    reverseUuidMap: new Map<string, string>(),
    originalData: new Map<string, DocumentExportData>(),
  };

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

    await importSetting(settingData, context);
  }

  // Remap all UUIDs in all documents using original data
  onProgress?.(localize('applications.importExport.remappingUuids'), 95);
  await remapAllDocumentUuids(context);

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
 * @param context - Import context with UUID map and original data storage
 */
async function importSetting(
  settingData: SettingExportData,
  context: ImportContext
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
  context.uuidMap.set(settingData.uuid, setting.uuid);
  context.reverseUuidMap.set(setting.uuid, settingData.uuid);

  // Store original setting data for later remapping
  context.originalData.set(settingData.uuid, {
    uuid: settingData.uuid,
    name: settingData.name,
    system: settingData.system,
    text: settingData.text,
  });

  // Import entries
  await importEntries(setting, settingData.documents.entries, context);

  // Import campaigns
  await importCampaigns(setting, settingData.documents.campaigns, context);

  // Import sessions (need campaign mapping)
  await importSessions(settingData.documents.sessions, context);

  // Import arcs
  await importArcs(settingData.documents.arcs, context);

  // Import fronts
  await importFronts(settingData.documents.fronts, context);

  // Import story webs
  await importStoryWebs(settingData.documents.storyWebs, context);
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
 * @param context - Import context with UUID map and original data storage
 */
async function importEntries(
  setting: FCBSetting,
  entries: DocumentExportData[],
  context: ImportContext
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
      context.uuidMap.set(entryData.uuid, entry.uuid);
      context.reverseUuidMap.set(entry.uuid, entryData.uuid);

      // Store original entry data for later remapping
      context.originalData.set(entryData.uuid, {
        uuid: entryData.uuid,
        name: entryData.name,
        system: entryData.system,
        text: entryData.text,
      });
    }
  }
}

/**
 * Import campaigns into a setting.
 *
 * @param setting - The setting to import into
 * @param campaigns - The campaign data to import
 * @param context - Import context with UUID map and original data storage
 */
async function importCampaigns(
  setting: FCBSetting,
  campaigns: DocumentExportData[],
  context: ImportContext
): Promise<void> {
  for (const campaignData of campaigns) {
    const campaign = await Campaign.create(setting, campaignData.name);
    if (campaign) {
      context.uuidMap.set(campaignData.uuid, campaign.uuid);
      context.reverseUuidMap.set(campaign.uuid, campaignData.uuid);

      // Store original campaign data for later remapping
      context.originalData.set(campaignData.uuid, {
        uuid: campaignData.uuid,
        name: campaignData.name,
        system: campaignData.system,
        text: campaignData.text,
      });
    }
  }
}

/**
 * Import sessions.
 *
 * @param sessions - The session data to import
 * @param context - Import context with UUID map and original data storage
 */
async function importSessions(
  sessions: DocumentExportData[],
  context: ImportContext
): Promise<void> {
  for (const sessionData of sessions) {
    const campaignId = context.uuidMap.get(sessionData.system.campaignId as string);
    if (!campaignId) continue;

    const campaign = await Campaign.fromUuid(campaignId);
    if (!campaign) continue;

    const session = await Session.create(campaign, sessionData.name);
    if (session) {
      context.uuidMap.set(sessionData.uuid, session.uuid);
      context.reverseUuidMap.set(session.uuid, sessionData.uuid);

      // Store original session data for later remapping
      context.originalData.set(sessionData.uuid, {
        uuid: sessionData.uuid,
        name: sessionData.name,
        system: sessionData.system,
        text: sessionData.text,
      });
    }
  }
}

/**
 * Import arcs.
 *
 * @param arcs - The arc data to import
 * @param context - Import context with UUID map and original data storage
 */
async function importArcs(
  arcs: DocumentExportData[],
  context: ImportContext
): Promise<void> {
  for (const arcData of arcs) {
    const campaignId = context.uuidMap.get(arcData.system.campaignId as string);
    if (!campaignId) continue;

    const campaign = await Campaign.fromUuid(campaignId);
    if (!campaign) continue;

    const arc = await Arc.create(campaign, arcData.name);
    if (arc) {
      context.uuidMap.set(arcData.uuid, arc.uuid);
      context.reverseUuidMap.set(arc.uuid, arcData.uuid);

      // Store original arc data for later remapping
      context.originalData.set(arcData.uuid, {
        uuid: arcData.uuid,
        name: arcData.name,
        system: arcData.system,
        text: arcData.text,
      });
    }
  }
}

/**
 * Import fronts.
 *
 * @param fronts - The front data to import
 * @param context - Import context with UUID map and original data storage
 */
async function importFronts(
  fronts: DocumentExportData[],
  context: ImportContext
): Promise<void> {
  for (const frontData of fronts) {
    const campaignId = context.uuidMap.get(frontData.system.campaignId as string);
    if (!campaignId) continue;

    const campaign = await Campaign.fromUuid(campaignId);
    if (!campaign) continue;

    const front = await Front.create(campaign, frontData.name);
    if (front) {
      context.uuidMap.set(frontData.uuid, front.uuid);
      context.reverseUuidMap.set(front.uuid, frontData.uuid);

      // Store original front data for later remapping
      context.originalData.set(frontData.uuid, {
        uuid: frontData.uuid,
        name: frontData.name,
        system: frontData.system,
        text: frontData.text,
      });
    }
  }
}

/**
 * Import story webs.
 *
 * @param storyWebs - The story web data to import
 * @param context - Import context with UUID map and original data storage
 */
async function importStoryWebs(
  storyWebs: DocumentExportData[],
  context: ImportContext
): Promise<void> {
  for (const storyWebData of storyWebs) {
    const campaignId = context.uuidMap.get(storyWebData.system.campaignId as string);
    if (!campaignId) continue;

    const campaign = await Campaign.fromUuid(campaignId);
    if (!campaign) continue;

    const storyWeb = await StoryWeb.create(campaign, storyWebData.name);
    if (storyWeb) {
      context.uuidMap.set(storyWebData.uuid, storyWeb.uuid);
      context.reverseUuidMap.set(storyWeb.uuid, storyWebData.uuid);

      // Store original story web data for later remapping
      context.originalData.set(storyWebData.uuid, {
        uuid: storyWebData.uuid,
        name: storyWebData.name,
        system: storyWebData.system,
        text: null,
      });
    }
  }
}

/**
 * Update a document's system data with remapped UUIDs.
 * Uses the FCB class's systemData setter and save() method to ensure
 * proper key transformation (e.g., UUID dots to #&#) before persistence.
 *
 * @param doc - The FCB document wrapper with systemData and save() method
 * @param systemData - The system data to apply (with remapped UUIDs)
 */
async function updateDocumentSystemData(
  doc: { systemData: unknown; save: () => Promise<void>; uuid: string },
  systemData: Record<string, unknown>
): Promise<void> {
  try {
    // Set the system data through the FCB class's setter
    // This updates the internal _clone.system which will be properly
    // transformed by _prepData() when save() is called
    (doc as { systemData: unknown }).systemData = systemData;

    // Save through the FCB class's save() method which handles
    // key transformation (dots to #&#) via _prepData()
    await doc.save();
  } catch (error) {
    // Log the error but don't throw - allow other documents to continue
    console.warn(`Failed to update document "${doc.uuid}":`, error);
  }
}

/**
 * Remap all UUIDs in all documents after import using the original exported data.
 *
 * @param context - Import context with UUID map and original data
 */
async function remapAllDocumentUuids(context: ImportContext): Promise<void> {
  const settingIndex = ModuleSettings.get(SettingKey.settingIndex);

  for (const settingInfo of settingIndex) {
    const setting = await FCBSetting.fromUuid(settingInfo.settingId);
    if (!setting) continue;

    // Find the original setting data using the reverse map
    const oldSettingUuid = context.reverseUuidMap.get(setting.uuid);
    const originalSettingData = oldSettingUuid
      ? context.originalData.get(oldSettingUuid)
      : undefined;

    if (originalSettingData) {
      // Use original system data, remap UUIDs, and apply
      const remappedSettingSystem = remapUuidsInObject(
        originalSettingData.system,
        context.uuidMap
      ) as Record<string, unknown>;

      // Remap text content
      if (originalSettingData.text) {
        const remappedText = remapUuidsInObject(originalSettingData.text, context.uuidMap) as string;
        setting.description = remappedText;
      }

      // Remap hierarchies keys
      if (remappedSettingSystem.hierarchies) {
        remappedSettingSystem.hierarchies = remapRecordKeys(
          remappedSettingSystem.hierarchies as Record<string, unknown>,
          context.uuidMap
        );
      }

      // Remap expandedIds keys
      if (remappedSettingSystem.expandedIds) {
        remappedSettingSystem.expandedIds = remapRecordKeys(
          remappedSettingSystem.expandedIds as Record<string, unknown>,
          context.uuidMap
        );
      }

      // Update the setting document
      await updateDocumentSystemData(
        setting as unknown as { systemData: unknown; save: () => Promise<void>; uuid: string },
        remappedSettingSystem
      );
    }

    // Remap entries using original data
    for (const topic of [Topics.Character, Topics.Location, Topics.Organization, Topics.PC] as ValidTopic[]) {
      const topicFolder = setting.topicFolders[topic];
      if (topicFolder) {
        const entries = await topicFolder.allEntries();
        for (const entry of entries) {
          // Find original entry data using reverse map
          const oldEntryUuid = context.reverseUuidMap.get(entry.uuid);
          const originalEntryData = oldEntryUuid
            ? context.originalData.get(oldEntryUuid)
            : undefined;

          if (originalEntryData) {
            // Use original system data, remap UUIDs, and apply
            const remappedEntrySystem = remapUuidsInObject(
              originalEntryData.system,
              context.uuidMap
            ) as Record<string, unknown>;

            // Validate remapped relationships - throw error if invalid data found
            validateRelationshipsInSystem(remappedEntrySystem, entry.name || 'unknown');

            // Apply text content
            if (originalEntryData.text) {
              entry.description = remapUuidsInObject(originalEntryData.text, context.uuidMap) as string;
            }

            await updateDocumentSystemData(
              entry as unknown as { systemData: unknown; save: () => Promise<void>; uuid: string },
              remappedEntrySystem
            );
          }
        }
      }
    }

    // Remap campaigns and their children
    for (const campaignIndex of setting.campaignIndex) {
      const campaign = await Campaign.fromUuid(campaignIndex.uuid);
      if (!campaign) continue;

      // Find original campaign data using reverse map
      const oldCampaignUuid = context.reverseUuidMap.get(campaign.uuid);
      const originalCampaignData = oldCampaignUuid
        ? context.originalData.get(oldCampaignUuid)
        : undefined;

      if (originalCampaignData) {
        const remappedCampaignSystem = remapUuidsInObject(
          originalCampaignData.system,
          context.uuidMap
        ) as Record<string, unknown>;

        if (originalCampaignData.text) {
          campaign.description = remapUuidsInObject(originalCampaignData.text, context.uuidMap) as string;
        }

        await updateDocumentSystemData(
          campaign as unknown as { systemData: unknown; save: () => Promise<void>; uuid: string },
          remappedCampaignSystem
        );
      }

      // Remap sessions
      const sessions = await campaign.allSessions();
      for (const session of sessions) {
        // Find original session data using reverse map
        const oldSessionUuid = context.reverseUuidMap.get(session.uuid);
        const originalSessionData = oldSessionUuid
          ? context.originalData.get(oldSessionUuid)
          : undefined;

        if (originalSessionData) {
          const remappedSessionSystem = remapUuidsInObject(
            originalSessionData.system,
            context.uuidMap
          ) as Record<string, unknown>;

          if (originalSessionData.text) {
            session.description = remapUuidsInObject(originalSessionData.text, context.uuidMap) as string;
          }

          await updateDocumentSystemData(
            session as unknown as { systemData: unknown; save: () => Promise<void>; uuid: string },
            remappedSessionSystem
          );
        }
      }

      // Remap arcs
      for (const arcIndex of campaign.arcIndex) {
        const arc = await Arc.fromUuid(arcIndex.uuid);
        if (!arc) continue;

        // Find original arc data using reverse map
        const oldArcUuid = context.reverseUuidMap.get(arc.uuid);
        const originalArcData = oldArcUuid
          ? context.originalData.get(oldArcUuid)
          : undefined;

        if (originalArcData) {
          const remappedArcSystem = remapUuidsInObject(
            originalArcData.system,
            context.uuidMap
          ) as Record<string, unknown>;

          if (originalArcData.text) {
            arc.description = remapUuidsInObject(originalArcData.text, context.uuidMap) as string;
          }

          await updateDocumentSystemData(
            arc as unknown as { systemData: unknown; save: () => Promise<void>; uuid: string },
            remappedArcSystem
          );
        }
      }

      // Remap fronts
      for (const frontId of campaign.frontIds) {
        const front = await Front.fromUuid(frontId);
        if (!front) continue;

        // Find original front data using reverse map
        const oldFrontUuid = context.reverseUuidMap.get(front.uuid);
        const originalFrontData = oldFrontUuid
          ? context.originalData.get(oldFrontUuid)
          : undefined;

        if (originalFrontData) {
          const remappedFrontSystem = remapUuidsInObject(
            originalFrontData.system,
            context.uuidMap
          ) as Record<string, unknown>;

          if (originalFrontData.text) {
            front.description = remapUuidsInObject(originalFrontData.text, context.uuidMap) as string;
          }

          await updateDocumentSystemData(
            front as unknown as { systemData: unknown; save: () => Promise<void>; uuid: string },
            remappedFrontSystem
          );
        }
      }

      // Remap story webs
      for (const storyWebId of campaign.storyWebIds) {
        const storyWeb = await StoryWeb.fromUuid(storyWebId);
        if (!storyWeb) continue;

        // Find original story web data using reverse map
        const oldStoryWebUuid = context.reverseUuidMap.get(storyWeb.uuid);
        const originalStoryWebData = oldStoryWebUuid
          ? context.originalData.get(oldStoryWebUuid)
          : undefined;

        if (originalStoryWebData) {
          const remappedStoryWebSystem = remapUuidsInObject(
            originalStoryWebData.system,
            context.uuidMap
          ) as Record<string, unknown>;

          // Remap positions, edgeStyles, nodeStyles keys
          if (remappedStoryWebSystem.positions) {
            remappedStoryWebSystem.positions = remapRecordKeys(
              remappedStoryWebSystem.positions as Record<string, unknown>,
              context.uuidMap
            );
            // Clean any invalid positions that may have been introduced
            const cleanedSystem = cleanInvalidPositions(remappedStoryWebSystem);
            remappedStoryWebSystem.positions = cleanedSystem.positions;
          }
          if (remappedStoryWebSystem.edgeStyles) {
            remappedStoryWebSystem.edgeStyles = remapRecordKeys(
              remappedStoryWebSystem.edgeStyles as Record<string, unknown>,
              context.uuidMap
            );
          }
          if (remappedStoryWebSystem.nodeStyles) {
            remappedStoryWebSystem.nodeStyles = remapRecordKeys(
              remappedStoryWebSystem.nodeStyles as Record<string, unknown>,
              context.uuidMap
            );
          }

          await updateDocumentSystemData(
            storyWeb as unknown as { systemData: unknown; save: () => Promise<void>; uuid: string },
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
