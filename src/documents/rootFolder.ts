import { FlagSettings } from '@/settings/DocumentFlags';

// Root folder wraps a Foundry Folder of type 'Compendium'
export interface RootFolderDoc extends Folder {
  __type: 'RootFolderDoc';
}

export enum RootFolderFlagKey {
  isRootFolder = 'isRootFolder',
}

export type RootFolderFlagType<K extends RootFolderFlagKey> =
  K extends RootFolderFlagKey.isRootFolder ? true :
  never;

export const flagSettings = [
  {
    flagId: RootFolderFlagKey.isRootFolder,
    default: true as true,
  },
] as FlagSettings<RootFolderFlagKey, { [K in RootFolderFlagKey]: RootFolderFlagType<K> }>[];
