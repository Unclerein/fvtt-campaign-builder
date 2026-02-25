/**
 * UUID Remapping Utilities
 *
 * Provides utilities for identifying and remapping FCB UUIDs during
 * import/export operations. FCB content uses compendium-based UUIDs
 * that change when documents are recreated in a new world.
 */

/** Pattern for matching @UUID[...] references in text content */
const UUID_LINK_PATTERN = /@UUID\[([^\]]+)\]/g;

/** Pattern for FCB compendium UUIDs: Compendium.world.xxx.* */
const FCB_COMPENDIUM_PATTERN = /^Compendium\.world\.[^.]+\./;

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

  // Check if it's a compendium UUID from our world
  if (FCB_COMPENDIUM_PATTERN.test(uuid)) {
    return true;
  }

  // // Also check for JournalEntryPage format: JournalEntry.xxx.JournalEntryPage.yyy
  // // where xxx is a compendium ID
  // if (uuid.startsWith('JournalEntry.') && uuid.includes('.JournalEntryPage.')) {
  //   // This could be from our compendium - check if it's in a world compendium
  //   const parts = uuid.split('.');
  //   if (parts.length >= 2 && parts[1].length > 0) {
  //     // World compendium IDs are random strings
  //     // We'll be conservative and check if we can find it in the mapping later
  //     return true;
  //   }
  // }

  return false;
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
      return uuidMap.get(obj);
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
      // Remap both key (if it's a UUID) and value
      const newKey = uuidMap.get(key) || key;
      result[newKey] = remapUuidsInObject(value, uuidMap);
    }
    return result;
  }

  // Return primitives unchanged
  return obj;
}

/**
 * Remap UUID keys in a record object while preserving values.
 * Used for objects like `positions`, `edgeStyles`, `nodeStyles`, `hierarchies`
 * where keys are UUIDs.
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
    const newKey = uuidMap.get(key) || key;
    result[newKey] = value;
  }
  return result;
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

export default {
  isFCBUuid,
  remapUuidsInText,
  remapUuidsInObject,
  remapRecordKeys,
  remapUuidArray,
  remapUuid,
};
