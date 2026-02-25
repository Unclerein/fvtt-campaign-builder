/**
 * Module JSON Export Service
 *
 * Handles exporting all FCB module data to a JSON file.
 */

import { localize } from '@/utils/game';
import { ModuleSettings, SettingKey } from '@/settings/ModuleSettings';
import { FCBSetting, Campaign, Arc, Front, StoryWeb } from '@/classes';
import { Topics, ValidTopic } from '@/types';
import { downloadFile } from '@/utils/fileDownload';
import {
  EXPORT_VERSION,
  ModuleExportData,
  SettingExportData,
  ProgressCallback,
  cleanInvalidRelationships,
  cleanInvalidPositions,
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

export default {
  exportModuleJson,
};
