import { Migration, MigrationResult, MigrationContext } from '../types';
import { SettingDoc } from '@/documents';
import { useMainStore } from '@/applications/stores';
import { Setting, TopicFolder } from '@/classes';

/**
 * Migration for upgrading from versions <2.0 to >=2.0
 * 
 * This migration handles the transition to the new data structures supporting entry/session permissions
 */
export class MigrationV2_0 implements Migration {
  public readonly targetVersion = '2.0.0';
  public readonly description = 'Migrate to new data structures supporting entry/session permissions';

  private _context: MigrationContext;

  constructor(context: MigrationContext) {
    this._context = context;
  }

  /**
   * Perform the migration
   */
  async migrate(): Promise<MigrationResult> {
    const oldTopics = await this.findOldTopics();
    
    const totalCount = Object.values(oldTopics).reduce((acc, topics) => acc + topics.length, 0);

    if (totalCount === 0) {
      return {
        success: true,
        migratedCount: 0,
        failedCount: 0,
        warnings: ['No old topic folders found to migrate']
      };
    }

    const result = await this.migrateAllTopics(oldTopics, totalCount);

    if (result.failedCount === 0) {
      await this.cleanupOldTopics(oldTopics);
    }

    return result;
  }

  /**
   * Find all old entries
   * Return a map from settingId to the list of topic folders in it
   */
  private async findOldTopics(): Promise<Record<string, TopicFolder[]>> {
    let entries: Record<string, TopicFolder[]> = {};

    // get the root folder
    const allSettings = await useMainStore().getAllSettings();
    
    // loop over all the settings (the subfolders)
    for (const setting of allSettings) {
      if (!entries[setting.uuid])
        entries[setting.uuid] = [];
      
      entries[setting.uuid] = entries[setting.uuid].concat(Object.values(setting.topicFolders));
    }

    return entries;
  }

  private async migrateAllTopics(oldTopics: Record<string, TopicFolder[]>, totalCount: number): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedCount: 0,
      failedCount: 0,
      errors: [],
      warnings: []
    };
    
    let processedCount = 0;

    // Show progress updates
    const updateProgress = (status: string) => {
      // Emit progress event for MigrationManager to pick up
      const event = new CustomEvent('migration-progress', {
        detail: {
          current: processedCount,
          total: totalCount,
          status: status
        }
      });
      document.dispatchEvent(event);
    };

    for (const settingId in oldTopics) {
      if (oldTopics[settingId].length === 0)
        continue;
      
      updateProgress(`Processing setting ${settingId}...`);
      
      // @ts-ignore
      const settingDoc = await fromUuid<SettingDoc>(settingId);
      if (!settingDoc) {
        console.log('Skipping invalid setting id in MigrationV2_0.migrateAllEntries(): ' + settingId);
        continue;
      }

      const setting = new Setting(settingDoc);
      await setting.validate();

      if (!setting) {
        console.log('Skipping invalid setting id in MigrationV2_0.migrateAllEntries(): ' + settingId);
        continue;
      }

      for (const topic of oldTopics[settingId]) {
        updateProgress(`Migrating topic: ${topic.topic}...`);
        await this.migrateSingleTopic(setting, topic, result);
        processedCount++;
        updateProgress(`Completed ${topic.topic}`);
      }
    }

    result.success = result.failedCount === 0;
    return result;
  }

  /**
   * Migrate a single topic folder
   * Updates result
   */
  private async migrateSingleTopic(setting: Setting, topic: TopicFolder, result: MigrationResult): Promise<void> {
    if (this._context.dryRun) {
      console.log(`[DRY RUN] Would migrate setting ${setting.name}, topic: ${topic.topic}`);
      return;
    }

    try {
      // by default, we just set all the visibility to false and don't need to actually change any permissions
      for (const entry of topic.allEntries()) {
        entry.visibleToPlayers = false;
        await entry.save();
      }

      console.log(`Migrated topic "${topic.topic}" to new Entry format`);
      result.migratedCount++;
    } catch (error) {
      result.failedCount++;
      result.errors?.push(`Failed to migrate setting ${setting.name}, topic: ${topic.topic}: ${error}`);
      console.error(`Migration error for setting ${setting.name}, topic: ${topic.topic}:`, error);
    }
  }

  /**
   * Cleanup old topic folders after migration
   */
  async cleanupOldTopics(_oldTopics: Record<string, TopicFolder[]>): Promise<void> {
    // no need to do anything
    return;
  }
}
