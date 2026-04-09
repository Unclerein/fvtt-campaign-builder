# E2E Test Plan for Entry Types

## Overview
Comprehensive e2e tests covering every event handler action in EntryContent.vue and all child components for Location, Character, Organization, and PC entry types.

---

## Completed Work

### 1. Test Utilities (`test/e2e/utils/entries.ts`)  [DONE]
Created helper functions for entry operations:
- `openEntry()` - Opens entry from directory tree
- `getEntryNameInput()`, `setEntryName()`, `getEntryNameValue()` - Name field operations
- `selectType()`, `addNewType()`, `getTypeValue()` - Type dropdown operations
- `selectSpecies()`, `getSpeciesValue()` - Species dropdown (characters only)
- `addTag()`, `removeTag()`, `clickTag()` - Tags operations
- `clickContentTab()` - Tab switching
- `clickPushToSession()`, `clickContextMenuItem()` - Push to session flow
- `selectParent()` - Parent hierarchy selection
- `setPlayerName()`, `getPlayerNameValue()` - PC player name
- `createEntryViaAPI()`, `deleteEntryViaAPI()` - Test data management
- `waitForNotification()`, `hasNotification()` - Notification verification
- `getGenerateButton()`, `getFoundryDocButton()`, `getVoiceButton()` - Button locators

### 2. Character Entry Tests (`test/e2e/entries/character.test.ts`)  [DONE]
Tests created:
- [x] Open existing character entry
- [x] Edit character name with debounce
- [x] Select existing type for character
- [x] Add new type for character
- [x] Select species for character
- [x] Add and remove tags
- [x] Click tag opens tag results tab
- [x] Push character to session
- [x] Generate button shows context menu
- [x] Foundry doc button disabled when no actors attached
- [x] Switch to journals tab
- [x] Switch to characters relationship tab
- [x] Switch to locations relationship tab
- [x] Switch to organizations relationship tab
- [x] Switch to sessions tab
- [x] Switch to foundry tab
- [x] Voice button visibility check

---

## Remaining Work

### 3. Location Entry Tests (`test/e2e/entries/location.test.ts`)  [DONE]

#### EntryContent.vue Event Handlers for Locations:
- [x] `onNameUpdate` - Name field editing with debounce
- [x] `onImageChange` - Image picker (via DescriptionTab)
- [x] `onTagChange` - Add/remove tags
- [x] `onTagClick` - Click tag to open TagResultsTab
- [x] `onTypeSelectionMade` - Select type from TypeSelect
- [x] `onParentSelectionMade` - Select parent location (hierarchy)
- [x] `onDescriptionEditorSaved` - Save description content
- [x] `onRelatedEntriesChanged` - Related entries from editor links (logged as requires complex editor interaction)
- [x] `onJournalsUpdate` - Update journals list
- [x] `onPushToSessionClick` - Push location to session (context menu)
- [x] `onGenerateButtonClick` - Generate name/description or image
- [x] `onFoundryDocButtonClick` - Open scene or show scene selector menu

#### DescriptionTab.vue Event Handlers:
- [x] `onCreateScene` - Create scene from image (logged as requires Backend)
- [x] `onGenerateImage` - Generate AI image (logged as requires Backend)

#### JournalTab.vue Event Handlers:
- [x] `onDocumentAddedClick` - Add journal via picker dialog
- [x] `onJournalClick` - Open journal sheet
- [x] `onPageClick` - Open journal page (covered by clickJournalRow)
- [x] `onDropNew` - Drop journal via drag
- [x] `onDeleteItemClick` - Remove journal link
- [ ] `onReorder` - Reorder journals (not yet tested)

#### SessionsTab.vue Event Handlers:
- [x] `onSessionClick` - Click session row to open session

---

### 4. Organization Entry Tests (`test/e2e/entries/organization.test.ts`)  [TODO]

#### EntryContent.vue Event Handlers for Organizations:
- [ ] `onNameUpdate` - Name field editing
- [ ] `onImageChange` - Image picker
- [ ] `onTagChange` - Add/remove tags
- [ ] `onTagClick` - Click tag to open TagResultsTab
- [ ] `onTypeSelectionMade` - Select type
- [ ] `onParentSelectionMade` - Select parent organization (hierarchy)
- [ ] `onDescriptionEditorSaved` - Save description
- [ ] `onRelatedEntriesChanged` - Related entries from editor
- [ ] `onJournalsUpdate` - Update journals
- [ ] `onGenerateButtonClick` - Generate name/description or image

#### Branch-Specific Tests:
- [ ] `onParentOrgClick` - Click parent org link (branch view)
- [ ] `onLocationClick` - Click location link (branch view)
- [ ] Verify branch name is read-only
- [ ] Verify parent org/location links are clickable

---

### 5. PC Entry Tests (`test/e2e/entries/pc.test.ts`)  [TODO]

#### PCContent.vue Event Handlers:
- [ ] `onDropActor` - Drop actor onto PC image area
- [ ] `onImageContextMenu` - Context menu on PC image
- [ ] `onPlayerNameUpdate` - Edit player name with debounce
- [ ] `onActorImageClick` - Click image to open actor sheet
- [ ] `onRelatedEntriesChanged` - Related entries from custom fields
- [ ] `onRelatedEntriesDialogUpdate` - Confirm related entries
- [ ] `onJournalsUpdate` - Update journals list

#### PC-Specific Features:
- [ ] Verify PC name is disabled (comes from actor)
- [ ] Verify image shows actor image
- [ ] Test drag-drop actor linking
- [ ] Test opening actor sheet from image click

---

### 6. Shared Entry Content Tests (`test/e2e/entries/shared.test.ts`)  [TODO]

#### Tests for features shared across all entry types:

##### RelatedEntryTable.vue (relationship tabs):
- [ ] Click entry row to open entry
- [ ] Add relationship via add button
- [ ] Remove relationship via delete button
- [ ] Filter relationships
- [ ] Drag-drop entry to add relationship

##### RelatedDocumentTable.vue (actors/scenes/foundry tabs):
- [ ] Click document row to open
- [ ] Add document via add button
- [ ] Remove document via delete button
- [ ] Drag-drop document to add

##### Editor.vue (description):
- [ ] Edit content
- [ ] Save content (Ctrl+S)
- [ ] Link to entry via @mention or [[link]]
- [ ] Resize editor

##### CustomFieldsBlocks.vue:
- [ ] Edit custom field values
- [ ] Related entries from custom field links

##### Tags.vue (all entry types):
- [ ] Add tag via typing
- [ ] Remove tag via X button
- [ ] Click tag to open TagResultsTab
- [ ] Autocomplete from whitelist

##### TypeAhead.vue (type, species, parent):
- [ ] Select from existing options
- [ ] Add new item (if allowed)
- [ ] Keyboard navigation (arrows, enter, tab)
- [ ] Click outside to close

---

## Event Handler Coverage Matrix

| Component | Handler | Character | Location | Organization | PC |
|-----------|---------|-----------|----------|--------------|-----|
| EntryContent | onNameUpdate | [x] | [x] | [ ] | N/A |
| EntryContent | onImageChange | [ ] | [x] | [ ] | N/A |
| EntryContent | onTagChange | [x] | [x] | [ ] | [ ] |
| EntryContent | onTagClick | [x] | [x] | [ ] | [ ] |
| EntryContent | onTypeSelectionMade | [x] | [x] | [ ] | N/A |
| EntryContent | onSpeciesSelectionMade | [x] | N/A | N/A | N/A |
| EntryContent | onParentSelectionMade | N/A | [x] | [ ] | N/A |
| EntryContent | onParentOrgClick | N/A | N/A | [ ] | N/A |
| EntryContent | onLocationClick | N/A | N/A | [ ] | N/A |
| EntryContent | onDescriptionEditorSaved | [ ] | [x] | [ ] | N/A |
| EntryContent | onRelatedEntriesChanged | [ ] | [x]* | [ ] | [ ] |
| EntryContent | onJournalsUpdate | [x] | [x] | [ ] | [ ] |
| EntryContent | onPushToSessionClick | [x] | [x] | N/A | N/A |
| EntryContent | onGenerateButtonClick | [x] | [x] | [ ] | N/A |
| EntryContent | onFoundryDocButtonClick | [x] | [x] | N/A | N/A |
| EntryContent | onVoiceButtonClick | [x] | N/A | N/A | N/A |
| PCContent | onDropActor | N/A | N/A | N/A | [ ] |
| PCContent | onPlayerNameUpdate | N/A | N/A | N/A | [ ] |
| PCContent | onActorImageClick | N/A | N/A | N/A | [ ] |
| DescriptionTab | onCreateScene | N/A | [x]* | N/A | N/A |
| DescriptionTab | onGenerateImage | [ ] | [x]* | [ ] | N/A |
| JournalTab | onDocumentAddedClick | [ ] | [x] | [ ] | [ ] |
| JournalTab | onJournalClick | [ ] | [x] | [ ] | [ ] |
| JournalTab | onPageClick | [ ] | [x] | [ ] | [ ] |
| JournalTab | onDropNew | [ ] | [x] | [ ] | [ ] |
| JournalTab | onDeleteItemClick | [ ] | [x] | [ ] | [ ] |
| JournalTab | onReorder | [ ] | [ ] | [ ] | [ ] |
| SessionsTab | onSessionClick | [x] | [x] | [ ] | N/A |
| Tags | onTagAdded | [x] | [x] | [ ] | [ ] |
| Tags | onTagRemoved | [x] | [x] | [ ] | [ ] |
| Tags | onTagClick | [x] | [x] | [ ] | [ ] |
| TypeSelect | onTypeSelectionMade | [x] | [x] | [ ] | N/A |
| TypeSelect | onTypeItemAdded | [x] | [x] | [ ] | N/A |
| SpeciesSelect | onSpeciesSelectionMade | [x] | N/A | N/A | N/A |
| SpeciesSelect | onSpeciesItemAdded | [x] | N/A | N/A | N/A |

*Note: Tests marked with * logged as requiring backend or complex editor interaction.

---

## Test File Structure

```
test/e2e/entries/
  PLAN.md                    # This file
  character.test.ts          # [DONE] Character entry tests
  location.test.ts           # [DONE] Location entry tests
  organization.test.ts       # [TODO] Organization entry tests
  pc.test.ts                 # [TODO] PC entry tests
  shared.test.ts             # [TODO] Shared functionality tests
```

---

## Utility Functions Needed

### Additional utilities to add to `entries.ts`:
- [x] `getDescriptionEditorContent()` - Get editor content
- [x] `setDescriptionEditorContent()` - Set editor content
- [x] `saveDescriptionEditor()` - Trigger editor save
- [ ] `linkToEntryInEditor()` - Create entry link in editor
- [x] `clickAddJournalButton()` - Click add journal button
- [x] `addJournalViaPicker()` - Add journal via picker dialog
- [x] `removeJournal()` - Remove journal from journals tab
- [x] `clickJournalRow()` - Click journal to open
- [ ] `reorderJournals()` - Drag to reorder journals
- [x] `dropEntryOnRelationshipTab()` - Add entry to relationship tab via drag
- [x] `removeRelatedEntry()` - Remove entry from relationship tab
- [x] `getRelatedDocumentCount()` - Count documents in actors/scenes tab
- [x] `clickDocumentRow()` - Click document to open
- [x] `dropActorOnPC()` - Simulate actor drag-drop on PC
- [x] `simulateDragDrop()` - Generic drag-drop simulation
- [x] `dropJournalOnJournalsTab()` - Drop journal on journals tab
- [x] `getParentValue()` - Get current parent value
- [x] `getParentOptions()` - Get parent dropdown options
- [x] `getImagePicker()` - Get image picker element
- [x] `clickImagePicker()` - Click image picker
- [x] `getImageUrl()` - Get image URL
- [x] `getSceneCount()` - Get scenes count
- [x] `isFoundryDocButtonDisabled()` - Check Foundry doc button state
- [x] `clickFoundryDocButton()` - Click Foundry doc button
- [x] `getSessionCount()` - Get sessions count
- [x] `clickSessionRow()` - Click session row
- [x] `createJournalViaAPI()` - Create journal via API
- [x] `deleteJournalViaAPI()` - Delete journal via API
- [x] `addJournalToEntryViaAPI()` - Add journal to entry via API
- [x] `createSceneViaAPI()` - Create scene via API
- [x] `addSceneToLocationViaAPI()` - Add scene to location via API
- [x] `isEditorDirty()` - Check editor dirty state

---

## Notes

1. **Voice Recording Tests**: Voice recording features require browser microphone permissions and are difficult to test in Puppeteer. These should be tested manually or skipped in e2e.

2. **AI Generation Tests**: Generate button tests verify the context menu appears, but actual AI generation requires backend and should be integration tested.

3. **Drag-Drop Tests**: Puppeteer drag-drop simulation is limited. Use `page.evaluate()` to simulate drag events with custom DataTransfer objects.

4. **Editor Tests**: The ProseMirror editor requires special handling - may need to interact with editor state directly via `page.evaluate()`.

5. **Test Data Isolation**: Each test file should create its own entries for modification tests and clean them up in `afterAll`.

6. **Backend-Dependent Tests**: For tests that require the AI backend (e.g., `onGenerateImage`), log "Didn't test XYZ - requires Backend" and skip the actual verification. Still verify UI elements exist.

7. **Tab Data Verification**: When testing tab switches, verify the expected data is present on that tab. Use entries that have the needed data populated (journals, relationships, sessions, etc.).

8. **Drag-Drop Simulation**: Use `page.evaluate()` to programmatically create and dispatch drag events with proper DataTransfer objects. See utility functions for examples.
