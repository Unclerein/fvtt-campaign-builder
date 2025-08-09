import { MigrationV1_2 } from './MigrationV1_2';
import { MigrationV2_0 } from './MigrationV2_0';

export const migrationVersions: Record<string, MigrationConstructor> = {
  '1.2.0': MigrationV1_2,
  '2.0.0': MigrationV2_0
};
