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
import { EntryDoc } from 'src/documents';

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
  
