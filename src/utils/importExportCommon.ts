/**
 * Common utilities for Import/Export operations
 *
 * Provides shared types, interfaces, and utility functions used by both
 * import and export operations.
 */

/** Current export format version */
export const EXPORT_VERSION = '1.0.0';

/** Pattern for matching @UUID[...] references in text content */
const UUID_LINK_PATTERN = /@UUID\[([^\]]+)\]/g;

/** Pattern for FCB compendium UUIDs: Compendium.world.xxx.* */
const FCB_COMPENDIUM_PATTERN = /^Compendium\.world\.[^.]+\./;

/** Pattern for valid FCB compendium UUIDs */
const VALID_UUID_PATTERN = /^Compendium\.world\.[^.]+\.(JournalEntry|JournalEntryPage)\.[a-zA-Z0-9]+$/;

/** Pattern for valid JournalEntryPage UUIDs */
const VALID_JOURNAL_ENTRY_PAGE_PATTERN = /^JournalEntry\.[^.]+\.JournalEntryPage\.[a-zA-Z0-9]+$/;

/**
 * Check if a UUID belongs to an FCB document (compendium-based).
 * FCB UUIDs have the structure: Compendium.world.xxx.* where xxx is
 * the setting compendium ID.
 *
 * @param uuid - The UUID to check
 * @returns True if the UUID is an FCB document UUID
 */
export function isFCBUuid(uuid: string): boolean {
  if (!uuid) return false;
  return FCB_COMPENDIUM_PATTERN.test(uuid);
}

/**
 * Check if a UUID string is valid (either an FCB compendium UUID or other valid Foundry UUID).
 *
 * @param uuid - The UUID to check
 * @returns True if the UUID is valid or not a string
 */
export function isValidUuid(uuid: unknown): boolean {
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
 * Remap @UUID[...] references in text content using the provided mapping.
 * Only FCB UUIDs are remapped; non-FCB references are left unchanged.
 *
 * @param text - The text content to process
 * @param uuidMap - Map of old UUIDs to new UUIDs
 * @returns The text with remapped UUID references
 */
export function remapUuidsInText(text: string, uuidMap: Map<string, string>): string {
  if (!text || typeof text !== 'string') return text;

  return text.replace(UUID_LINK_PATTERN, (match, uuid) => {
    const newUuid = uuidMap.get(uuid);
    if (newUuid) {
      return `@UUID[${newUuid}]`;
    }
    // If not in map, leave unchanged (could be a non-FCB reference)
    return match;
  });
}

/**
 * Recursively remap UUIDs in an object's string fields.
 * This handles nested objects, arrays, and string values that may contain
 * UUID references.
 *
 * Also handles danger node UUIDs which have the format "frontUuid|dangerIndex".
 *
 * @param obj - The object to process
 * @param uuidMap - Map of old UUIDs to new UUIDs
 * @returns The object with remapped UUID references
 */
export function remapUuidsInObject(obj: unknown, uuidMap: Map<string, string>): unknown {
  if (!obj) return obj;

  // Handle strings - could be direct UUID or contain @UUID[...] references
  if (typeof obj === 'string') {
    // First check if the entire string is a UUID to remap
    if (uuidMap.has(obj)) {
      const mapped = uuidMap.get(obj);
      // Return the mapped value if it exists, otherwise keep original
      return mapped !== undefined ? mapped : obj;
    }
    // Check if this is a danger node UUID (format: frontUuid|dangerIndex)
    const pipeIndex = obj.indexOf('|');
    if (pipeIndex !== -1) {
      const frontUuid = obj.substring(0, pipeIndex);
      const suffix = obj.substring(pipeIndex);
      const remappedFrontUuid = uuidMap.get(frontUuid);
      if (remappedFrontUuid) {
        return remappedFrontUuid + suffix;
      }
    }
    // Then check for embedded UUID references
    if (obj.includes('@UUID[')) {
      return remapUuidsInText(obj, uuidMap);
    }
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => remapUuidsInObject(item, uuidMap));
  }

  // Handle objects (but not null, which typeof returns 'object' for)
  if (typeof obj === 'object' && obj !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Remap key if it's a UUID in the map, otherwise keep original
      // Also handle danger node keys (format: frontUuid|dangerIndex)
      const newKey = remapObjectKey(key, uuidMap);
      result[newKey] = remapUuidsInObject(value, uuidMap);
    }
    return result;
  }

  // Return primitives unchanged
  return obj;
}

/**
 * Remap an object key that may be a direct UUID or a danger node composite key.
 * Danger node keys have the format "frontUuid|dangerIndex" where the frontUuid
 * portion needs to be remapped.
 *
 * @param key - The key to remap
 * @param uuidMap - Map of old UUIDs to new UUIDs
 * @returns The remapped key or the original if not found
 */
function remapObjectKey(key: string, uuidMap: Map<string, string>): string {
  // First try direct UUID match
  if (uuidMap.has(key)) {
    return uuidMap.get(key) || key;
  }

  // Check if this is a danger node key (format: frontUuid|dangerIndex)
  const pipeIndex = key.indexOf('|');
  if (pipeIndex !== -1) {
    const frontUuid = key.substring(0, pipeIndex);
    const suffix = key.substring(pipeIndex);
    const remappedFrontUuid = uuidMap.get(frontUuid);
    if (remappedFrontUuid) {
      return remappedFrontUuid + suffix;
    }
  }

  return key;
}

/**
 * Remap UUID keys in a record object while preserving values.
 * Used for objects like `positions`, `edgeStyles`, `nodeStyles`, `hierarchies`
 * where keys are UUIDs.
 *
 * Also handles danger node UUIDs which have the format "frontUuid|dangerIndex".
 *
 * @param record - The record object with UUID keys
 * @param uuidMap - Map of old UUIDs to new UUIDs
 * @returns A new record with remapped keys
 */
export function remapRecordKeys<T>(
  record: Record<string, T>,
  uuidMap: Map<string, string>
): Record<string, T> {
  if (!record) return record;

  const result: Record<string, T> = {};
  for (const [key, value] of Object.entries(record)) {
    const newKey = remapKey(key, uuidMap);
    result[newKey] = value;
  }
  return result;
}

/**
 * Remap a single key that may be a direct UUID or a danger node composite key.
 * Danger node keys have the format "frontUuid|dangerIndex" where the frontUuid
 * portion needs to be remapped.
 *
 * @param key - The key to remap
 * @param uuidMap - Map of old UUIDs to new UUIDs
 * @returns The remapped key or the original if not found
 */
function remapKey(key: string, uuidMap: Map<string, string>): string {
  // First try direct UUID match
  if (uuidMap.has(key)) {
    return uuidMap.get(key) || key;
  }

  // Check if this is a danger node key (format: frontUuid|dangerIndex)
  const pipeIndex = key.indexOf('|');
  if (pipeIndex !== -1) {
    const frontUuid = key.substring(0, pipeIndex);
    const dangerIndex = key.substring(pipeIndex);
    const remappedFrontUuid = uuidMap.get(frontUuid);
    if (remappedFrontUuid) {
      return remappedFrontUuid + dangerIndex;
    }
  }

  return key;
}

/**
 * Remap UUIDs in an array of UUID strings.
 *
 * @param uuids - Array of UUID strings
 * @param uuidMap - Map of old UUIDs to new UUIDs
 * @returns New array with remapped UUIDs
 */
export function remapUuidArray(uuids: string[], uuidMap: Map<string, string>): string[] {
  if (!uuids) return uuids;
  return uuids.map(uuid => uuidMap.get(uuid) || uuid);
}

/**
 * Remap a single UUID if it exists in the map.
 *
 * @param uuid - The UUID to remap
 * @param uuidMap - Map of old UUIDs to new UUIDs
 * @returns The remapped UUID or the original if not found
 */
export function remapUuid(uuid: string | null | undefined, uuidMap: Map<string, string>): string | null {
  if (!uuid) return null;
  return uuidMap.get(uuid) || uuid;
}

// ===========================================
// Shared Types and Interfaces
// ===========================================

/** Export data structure */
export interface ModuleExportData {
  version: string;
  exportedAt: string;
  moduleSettings: Record<string, unknown>;
  settings: SettingExportData[];
}

/** Import context to track original data and mappings */
export interface ImportContext {
  /** Maps old UUID -> new UUID (for remapping content) */
  uuidMap: Map<string, string>;
  /** Maps new UUID -> old UUID (for finding original data during second pass) */
  reverseUuidMap: Map<string, string>;
  /** Original document data keyed by old UUID */
  originalData: Map<string, DocumentExportData>;
}

/** Setting export data structure */
export interface SettingExportData {
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
export interface DocumentExportData {
  uuid: string;
  name: string;
  system: Record<string, unknown>;
  text: string | null;
}

/** Progress callback type */
export type ProgressCallback = (message: string, progress?: number) => void;

// ===========================================
// Shared Validation Functions
// ===========================================

/**
 * Validate relationships in a system data object.
 *
 * @param system - The system data to validate
 * @param documentName - Name of the document for error messages
 * @throws Error if invalid relationship data is found
 */
export function validateRelationshipsInSystem(system: Record<string, unknown>, documentName: string): void {
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
export function validatePositionsInSystem(system: Record<string, unknown>, documentName: string): void {
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
 * Clean invalid relationships from entry system data.
 * Removes relationship entries that reference invalid UUIDs or have missing required fields.
 *
 * @param system - The system data to clean
 * @returns The cleaned system data
 */
export function cleanInvalidRelationships(system: Record<string, unknown>): Record<string, unknown> {
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
export function cleanInvalidPositions(system: Record<string, unknown>): Record<string, unknown> {
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

export default {
  EXPORT_VERSION,
  isFCBUuid,
  isValidUuid,
  remapUuidsInText,
  remapUuidsInObject,
  remapRecordKeys,
  remapUuidArray,
  remapUuid,
  validateRelationshipsInSystem,
  validatePositionsInSystem,
  cleanInvalidRelationships,
  cleanInvalidPositions,
};
