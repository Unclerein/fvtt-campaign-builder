import { MigrationConstructor } from '../types';
import { MigrationV1_2 } from './MigrationV1_2';

export const migrationVersions: Record<string, MigrationConstructor> = {
  '1.2.0': MigrationV1_2,
};
