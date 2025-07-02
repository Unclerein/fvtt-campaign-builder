import { RelatedJournal } from '@/types';

const fields = foundry.data.fields;
const pcSchema = {
  playerName: new fields.StringField({ required: true, nullable: false, initial: '', textSearch: true, }),
  actorId: new fields.DocumentUUIDField({ required: false, nullable: true, }),
  background: new fields.StringField({ required: true, nullable: false, initial: '', textSearch: true, }),
  plotPoints: new fields.StringField({ required: true, nullable: false, initial: '', textSearch: true, }),
  magicItems: new fields.StringField({ required: true, nullable: false, initial: '', textSearch: true, }),
  journals: new fields.ArrayField(new fields.SchemaField({
    uuid: new fields.StringField({ required: true, blank: false }),
    journalUuid: new fields.DocumentUUIDField({ required: true, type: 'JournalEntry' }),
    pageUuid: new fields.DocumentUUIDField({ required: false, type: 'JournalEntryPage', nullable: true, initial: null }),
    packId: new fields.StringField({ required: false, nullable: true, initial: null }),
    packName: new fields.StringField({ required: false, nullable: true, initial: null }),
  }), { required: true, initial: [] }),
};

type PCSchemaType = typeof pcSchema;

export class PCDataModel<Schema extends PCSchemaType, ParentNode extends JournalEntry> extends foundry.abstract.TypeDataModel<Schema, ParentNode> {
  static defineSchema(): PCSchemaType {
    return pcSchema;
  }

  /** @override */
  // prepareBaseData(): void {
  // }
}

// @ts-ignore - error because ts can't properly handle the structure of JournalEntryPage
export interface PCDoc extends JournalEntryPage {
  __type: 'PCDoc';

  system: {
    playerName: string;
    actorId: string;   // uuid of the actor
    background: string;
    plotPoints: string;
    magicItems: string; 
    journals: RelatedJournal[];
  };
}
