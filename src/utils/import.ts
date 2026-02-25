/**
 * Module JSON Import Service
 *
 * Handles importing FCB module data from a JSON file into a Foundry world.
 */

import { localize } from '@/utils/game';
import { ModuleSettings, SettingKey } from '@/settings/ModuleSettings';
import { RootFolder, FCBSetting, Campaign, Session, Arc, Front, StoryWeb, Entry } from '@/classes';
import { Topics, ValidTopic } from '@/types';
import GlobalSettingService from '@/utils/globalSettings';
import {
  ModuleExportData,
  SettingExportData,
  ImportContext,
  DocumentExportData,
  ProgressCallback,
  remapUuidsInObject,
  remapRecordKeys,
  validateRelationshipsInSystem,
  validatePositionsInSystem,
} from './importExportCommon';

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
    description: settingData.description,
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
        description: entryData.description,
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
        description: campaignData.description,
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
        description: sessionData.description,
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
        description: arcData.description,
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
        description: frontData.description,
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
        description: null,
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
      if (originalSettingData.description) {
        const remappedText = remapUuidsInObject(originalSettingData.description, context.uuidMap) as string;
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
            if (originalEntryData.description) {
              entry.description = remapUuidsInObject(originalEntryData.description, context.uuidMap) as string;
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

        if (originalCampaignData.description) {
          campaign.description = remapUuidsInObject(originalCampaignData.description, context.uuidMap) as string;
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

          if (originalSessionData.description) {
            session.description = remapUuidsInObject(originalSessionData.description, context.uuidMap) as string;
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

          if (originalArcData.description) {
            arc.description = remapUuidsInObject(originalArcData.description, context.uuidMap) as string;
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

          if (originalFrontData.description) {
            front.description = remapUuidsInObject(originalFrontData.description, context.uuidMap) as string;
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
  importModuleJson,
};
