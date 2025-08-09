/**
 * This file handles permissions for the module.  There are two parts:
 *   1. Handing which players have the ability to access certain features
 *   2. Handling the setting of permissions on all the various documents to enable that
 * 
 * Both features are by role - otherwise it would be a pain to have to choose individual players to 
 * have access to certain features.  The downside is that permissions in foundry are by user, so we
 * have to set permissions for each user in the setting and then adjust them when user roles change.
 */
 
import { ModuleSettings, SettingKey } from '@/settings';
import { EntryDoc } from '@/documents';
import { Entry, RootFolder } from '@/classes';

export enum PermissionType {
  EntryRead = 0,  // read visible entries
  EntryWrite = 1,  // create new entries
  EntryFull = 2,  // full access to entries (i.e. even see hidden entries)
  Backend = 3,  // use backend features
  SessionNotes = 4,  // access session notes, numbers, dates, names
  SessionFull = 5,  // full access to sessions
}


export const validatePermission = (permission: PermissionType): boolean => {
  const settingKeys = {
    [PermissionType.EntryRead]: SettingKey.playerAccessEntryRead,
    [PermissionType.EntryWrite]: SettingKey.playerAccessEntryWrite,
    [PermissionType.EntryFull]: SettingKey.playerAccessEntryFull,
    [PermissionType.Backend]: SettingKey.playerAccessBackend,
    [PermissionType.SessionNotes]: SettingKey.playerAccessSessionNotes,
    [PermissionType.SessionFull]: SettingKey.playerAccessSessionFull,
  } as Record<PermissionType, SettingKey>;

  const playerRole = game.user?.role || 0;
  const permissionNeeded = ModuleSettings.get(settingKeys[permission]) as CONST.USER_ROLES ?? null;

  if (permissionNeeded != null) {
    return playerRole >= permissionNeeded;
  } else {
    return false;
  }  
}
  
/** Looks up which roles have access to entries at various levels and
 *  returns a Record that can be used to set a foundry object's 
 *  permissions that has every user's correct permission level
 *  based on their current role.  It ignores GMs for simplicity, since
 *  they have access to everything.
 */
export const getEntryPermissionBlock = (): Record<string, CONST.DOCUMENT_OWNERSHIP_LEVELS> => {
  // make the default none for safety
  const permissions: Record<string, CONST.DOCUMENT_OWNERSHIP_LEVELS> = {
    default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
  };

  // see what roles are needed for each level of access
  const roleToRead = ModuleSettings.get(SettingKey.playerAccessEntryRead);

  // the role to write is the lesser of write and full access
  const roleToWrite = Math.min(ModuleSettings.get(SettingKey.playerAccessEntryWrite), ModuleSettings.get(SettingKey.playerAccessEntryFull));

  // go through each user and set their permissions
  // if they need to read, they get observer
  // if they need to write, they get owner
  for (const user of game.users) {
    if (user.role >= roleToWrite) {
      permissions[user.id] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
    }
    else if (user.role >= roleToRead) {
      permissions[user.id] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
    }
  }

  return permissions;
}

/** Returns an ownership block that sets all permissions to none except for GMs */
export const getNoPermissionBlock = (): Record<string, CONST.DOCUMENT_OWNERSHIP_LEVELS> => {
  // make the default none for safety
  const permissions: Record<string, CONST.DOCUMENT_OWNERSHIP_LEVELS> = {
    default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
  };

  // add GM permissions
  for (const user of game.users) {
    if (user.role >= CONST.USER_ROLES.GAMEMASTER) {
      permissions[user.id] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
    }
  }

  return permissions;
}

/** used to update permissions on every document when a user's role changes 
 * 
 * @param {User} user - the user to update permissions for
 */
export const updateUserPermissions = async (user: User, newRole: CONST.USER_ROLES): Promise<void> => {
  // do the entries
  const entries: EntryDoc[] = [];
  
  for (const entry of entries) {
    
  }
}
  
export const resetAllPermissions = async (options: { updatedEntry?: Entry }) => {
  const rootFolder = await RootFolder.get();

  if (rootFolder)
    await rootFolder.resetPermissions(options);
}
