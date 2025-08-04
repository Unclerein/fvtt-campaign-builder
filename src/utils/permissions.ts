import { ModuleSettings, SettingKey } from '@/settings';

export enum PermissionType {
  EntryRead = 0,  // read visible entries
  EntryWrite = 1,  // create new entries
  EntryFull = 2,  // full access to entries (i.e. even see hidden entries)
  Generate = 3,  // use AI features
  SessionNotes = 4,  // access session notes, numbers, dates, names
  SessionFull = 5,  // full access to sessions
}


export const validatePermission = (permission: PermissionType): boolean => {
  const settingKeys = {
    [PermissionType.EntryRead]: SettingKey.playerAccessEntryRead,
    [PermissionType.EntryWrite]: SettingKey.playerAccessEntryWrite,
    [PermissionType.EntryFull]: SettingKey.playerAccessEntryFull,
    [PermissionType.Generate]: SettingKey.playerAccessGenerate,
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
  