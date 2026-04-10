# E2E Test Coverage Expansion Plan

## Existing Tests

- `directory/basic.test.ts` - Directory expansion (incomplete stubs)
- `entries/character.test.ts` - Character entry operations
- `entries/location.test.ts` - Location entry operations
- `settings/*.ts` - Setting CRUD (partial implementations)
- `campaigns/*.ts` - Campaign tests (empty stubs)

---

## Phase 1: Core User Flows (Critical)

### 1.1 Campaign Management Tests
**File:** `test/e2e/campaigns/campaign.test.ts` 

Tests:
- Create new campaign in setting
- Rename campaign (verify updates in directory)
- Delete campaign (with confirmation)
- Add session to campaign
- Reorder sessions (change session numbers)
- Switch between campaigns in different settings
- Campaign completion toggle

**Coverage targets:**
- `CampaignContent.vue` 
- `CampaignDirectoryCampaignNode.vue` 
- `campaignStore.ts` 

### 1.2 Session Management Tests
**File:** `test/e2e/sessions/session.test.ts` 

Tests:
- Create new session
- Rename session (verify updates everywhere)
- Delete session
- Session date picker
- Session number auto-increment
- Session display modes (number/date/name)
- Session notes editor
- Play mode session navigation

**Coverage targets:**
- `SessionContent.vue` 
- `SessionItemTab.vue`, `SessionLocationTab.vue`, etc.
- `sessionStore.ts` 
- `playingStore.ts` 

### 1.3 Entry Type Completion Tests
**Files:**
- `test/e2e/entries/organization.test.ts` 
- `test/e2e/entries/pc.test.ts` 

Tests (for each type):
- Create entry
- Edit name with debounce
- Type selection (existing and new)
- Tags add/remove/click
- Hierarchy (locations only)
- Push to session
- Content tabs (description, journals, relationships)
- Delete entry

**Coverage targets:**
- `EntryContent.vue` 
- `TypeSelect.vue`, `SpeciesSelect.vue` 
- Stores: `settingDirectoryStore.ts`, `relationshipStore.ts` 

---

## Phase 2: Content Tabs (High Priority)

### 2.1 Campaign Content Tabs
**File:** `test/e2e/campaigns/campaign-tabs.test.ts` 

Tests:
- Ideas tab: Add/edit/delete ideas
- Lore tab: Add/edit/delete lore entries
- PCs tab: Link/unlink PCs to campaign
- ToDo tab: Add/complete/delete todos

**Coverage targets:**
- `CampaignIdeasTab.vue` 
- `CampaignLoreTab.vue` 
- `CampaignPCsTab.vue` 
- `CampaignToDoTab.vue` 

### 2.2 Session Content Tabs
**File:** `test/e2e/sessions/session-tabs.test.ts` 

Tests:
- Items tab: Add/remove items
- Locations tab: Add/remove locations
- Lore tab: Add/remove lore
- Monsters tab: Add/remove monsters
- NPCs tab: Add/remove NPCs
- Vignettes tab: Add/remove vignettes

**Coverage targets:**
- All `Session*Tab.vue` components

### 2.3 Specialized Content Tests
**Files:**
- `test/e2e/arcs/arc.test.ts` 
- `test/e2e/fronts/front.test.ts` 
- `test/e2e/storywebs/storyweb.test.ts` 

Tests:
- Arc: Create, add locations, session range
- Front: Create, add dangers/grim portents
- StoryWeb: Create, add nodes/edges, graph interaction

**Coverage targets:**
- `ArcContent.vue`, `FrontContent.vue`, `StoryWebContent.vue` 
- `arcStore.ts`, `frontStore.ts`, `storyWebStore.ts` 

---

## Phase 3: Navigation & Header (High Priority)

### 3.1 Header Navigation Tests
**File:** `test/e2e/navigation/header.test.ts` 

Tests:
- Tab switching (forward/back)
- Tab close button
- Tab middle-click close
- Bookmark add/remove
- Bookmark click navigation
- Tab persistence after window close/reopen

**Coverage targets:**
- `FCBHeader.vue` 
- `FCBHeaderTab.vue` 
- `FCBBookmark.vue` 
- `navigationStore.ts` 

### 3.2 Play Mode Navigation Tests
**File:** `test/e2e/navigation/playmode.test.ts` 

Tests:
- Campaign selector dropdown
- Session buttons (previous/next)
- Generator bar interactions

**Coverage targets:**
- `PlayModeNavigation.vue` 
- `CampaignSelector.vue` 
- `SessionButtonsBar.vue` 
- `GeneratorBar.vue` 

---

## Phase 4: Dialogs (Medium Priority)

### 4.1 Entry Creation Dialog Tests
**File:** `test/e2e/dialogs/create-entry.test.ts` 

Tests:
- Open dialog from directory
- Select entry type
- Enter name
- Create and verify
- Cancel dialog

**Coverage targets:**
- `CreateEntryDialog.vue` 

### 4.2 Relationship Dialog Tests
**File:** `test/e2e/dialogs/relationships.test.ts` 

Tests:
- RelatedDocumentsDialog: Add/remove journals
- RelatedEntriesManagementDialog: Manage relationships
- RelatedEntryDialog: Add related entry
- RelatedItemDialog: Add related item

**Coverage targets:**
- All `*Dialog.vue` in `dialogs/` 

### 4.3 Utility Dialog Tests
**File:** `test/e2e/dialogs/utility.test.ts` 

Tests:
- ConfirmDialog: Confirm/cancel
- SaveChangesDialog: Save/discard/cancel on tab switch
- SelectOptionDialog: Select option
- InputDialog: Enter text

**Coverage targets:**
- `ConfirmDialog.vue`, `SaveChangesDialog.vue`, etc.

---

## Phase 5: Core Components (Medium Priority)

### 5.1 Editor Tests
**File:** `test/e2e/components/editor.test.ts` 

Tests:
- Type content
- Format text (bold, italic, etc.)
- Create links to entries
- Save content
- Dirty state detection
- Unsaved changes prompt

**Coverage targets:**
- `Editor.vue` 
- `editorChangeDetection.ts` 

### 5.2 Image Picker Tests
**File:** `test/e2e/components/image-picker.test.ts` 

Tests:
- Open image picker
- Select image from file picker
- Clear image
- Image URL input

**Coverage targets:**
- `ImagePicker.vue` 

### 5.3 Search Tests
**File:** `test/e2e/components/search.test.ts` 

Tests:
- Open search
- Search by name
- Filter by type
- Click result to open
- Clear search

**Coverage targets:**
- `Search.vue` 
- `search.ts` 

### 5.4 TypeAhead Tests
**File:** `test/e2e/components/typeahead.test.ts` 

Tests:
- Type to filter
- Select existing option
- Create new option
- Clear selection
- Keyboard navigation

**Coverage targets:**
- `TypeAhead.vue` 

---

## Phase 6: Settings & Configuration (Lower Priority)

### 6.1 Setting Content Tests
**File:** `test/e2e/settings/setting-content.test.ts` 

Tests:
- Edit setting name
- Edit genre
- Edit description
- Edit setting feeling
- Custom fields
- Image settings

**Coverage targets:**
- `SettingContent.vue` 

### 6.2 Advanced Settings Tests
**File:** `test/e2e/settings/advanced-settings.test.ts` 

Tests:
- Open advanced settings
- Tab visibility settings
- Table grouping settings
- Species list management
- Roll table settings

**Coverage targets:**
- `AdvancedSettings.vue` 
- `TabVisibilitySettingsDialog.vue` 
- `TableGroupingSettingsDialog.vue` 
- `SpeciesList.vue` 
- `RollTableSettings.vue` 

### 6.3 Import/Export Tests
**File:** `test/e2e/settings/import-export.test.ts` 

Tests:
- Export setting
- Import setting
- Export campaign
- Import campaign

**Coverage targets:**
- `ImportExportDialog.vue` 
- `export.ts`, `import.ts` 

---

## Phase 7: Specialized Features (Lower Priority)

### 7.1 Timeline Tests
**File:** `test/e2e/timeline/timeline.test.ts` 

Tests:
- View timeline
- Filter by session
- Filter by tags
- Click event to open

**Coverage targets:**
- `TimelineTab.vue` 
- `TimelineFilterPanel.vue` 

### 7.2 Tag Results Tests
**File:** `test/e2e/tags/tag-results.test.ts` 

Tests:
- Click tag to open results
- View all entries with tag
- Click entry to open

**Coverage targets:**
- `TagResultsTab.vue` 

### 7.3 Custom Fields Tests
**File:** `test/e2e/settings/custom-fields.test.ts` 

Tests:
- Add custom field
- Edit custom field
- Delete custom field
- Reorder fields
- Field types (text, number, select, etc.)

**Coverage targets:**
- `CustomFieldsDialog.vue` 
- `CustomFieldsBlocks.vue` 
- `customFields.ts` 

---

## Implementation Approach

For each test file:

1. **Create test file** following existing patterns from `character.test.ts` and `location.test.ts` 
2. **Run single file:** `npm test -- --file <path>` 
3. **Verify all tests pass**
4. **Check coverage:** `npm run test:coverage` then `npx nyc report` 
5. **Confirm coverage targets met**

### Test File Template

```typescript
import { describe, test, beforeAll, afterAll, expect, } from '../testRunner';
import { sharedContext } from '@e2etest/sharedContext';
import { testData } from '@e2etest/data';
import { ensureSetup } from '../ensureSetup';
import { switchToSetting, expandTopicNode } from '@e2etest/utils';
// Import test utilities

describe.serial('Feature Name Tests', () => {
  beforeAll(async () => {
    await ensureSetup(false);
    // Setup code
  });

  afterAll(async () => {
    // Cleanup created objects
  });

  test('Test description', async () => {
    // Test implementation
  });
});
```

---

## Potential Application Bugs

*To be populated during test development - list any issues found that require application code changes*

1. [None identified yet]

---

## Estimated Test Count by Phase

| Phase | Test Files | Est. Tests |
|-------|-----------|------------|
| Phase 1 | 4 | 40-50 |
| Phase 2 | 6 | 50-60 |
| Phase 3 | 2 | 20-25 |
| Phase 4 | 3 | 25-30 |
| Phase 5 | 4 | 30-35 |
| Phase 6 | 3 | 20-25 |
| Phase 7 | 3 | 15-20 |
| **Total** | **25** | **200-245** |

---

## Success Criteria

- All major user flows tested
- **Component coverage > 98%**
- Store/Classes/Utils coverage > 80%
- All tests passing
- No application bugs blocking tests

---

## Test Documentation

This section tracks each test file with detailed descriptions of what is being tested and expected behavior.

### Existing Tests

#### `directory/basic.test.ts` 
**Status:** Partial (stubs only)

| Test | What It Tests | Expected Behavior |
|------|---------------|-------------------|
| Expand entry folders | Directory tree expansion | Clicking topic folders expands to show entries; collapse-all hides all |
| Expand campaign folders | Campaign tree expansion | *(stub - not implemented)* |
| Open a setting | Setting content opening | *(stub - not implemented)* |
| Open a character | Character entry opening | *(stub - not implemented)* |
| Open a location | Location entry opening | *(stub - not implemented)* |
| Open a organization | Organization entry opening | *(stub - not implemented)* |
| Open a PC | PC entry opening | *(stub - not implemented)* |
| Open a campaign | Campaign content opening | *(stub - not implemented)* |
| Open a session | Session content opening | *(stub - not implemented)* |

---

#### `entries/character.test.ts` 
**Status:** Complete (18 tests)

| Test | What It Tests | Expected Behavior |
|------|---------------|-------------------|
| Open existing character entry | Directory navigation to entry | Entry opens, name input shows correct name |
| Edit character name with debounce | Name editing with auto-save | Name changes, persists after debounce (300ms) |
| Select existing type for character | Type dropdown selection | Type dropdown opens, selecting option updates type field |
| Add new type for character | Creating new type via typeahead | New type is added to options and selected |
| Select species for character | Species dropdown selection | Species dropdown opens, selecting option updates species field |
| Add and remove tags | Tag management | Tags can be added via input, removed via X button |
| Click tag opens tag results tab | Tag click navigation | Clicking a tag opens TagResultsTab showing entries with that tag |
| Push character to session | Push-to-session feature | Context menu shows campaigns, selecting adds character to session |
| Generate button shows context menu | AI generation menu | Generate button opens context menu with generation options |
| Foundry doc button disabled when no actors | Actor linking state | Button is disabled when no actors attached to character |
| Switch to journals tab | Content tab navigation | Journals tab becomes visible and active |
| Switch to characters relationship tab | Relationship tab navigation | Characters relationship tab becomes visible |
| Switch to locations relationship tab | Relationship tab navigation | Locations relationship tab becomes visible |
| Switch to organizations relationship tab | Relationship tab navigation | Organizations relationship tab becomes visible |
| Switch to sessions tab | Sessions tab navigation | Sessions tab becomes visible |
| Switch to foundry tab | Foundry docs tab navigation | Foundry documents tab becomes visible |
| Voice button not visible for non-characters | Voice feature visibility | Voice button presence depends on settings |

---

#### `entries/location.test.ts` 
**Status:** Complete (35 tests)

| Test | What It Tests | Expected Behavior |
|------|---------------|-------------------|
| Open existing location entry | Directory navigation to entry | Entry opens, name input shows correct name |
| Edit location name with debounce | Name editing with auto-save | Name changes, persists after debounce |
| Select existing type for location | Type dropdown selection | Type dropdown opens, selecting option updates type field |
| Add new type for location | Creating new type via typeahead | New type is added to options and selected |
| Add and remove tags | Tag management | Tags can be added and removed |
| Click tag opens tag results tab | Tag click navigation | Clicking a tag opens TagResultsTab |
| Select parent location (hierarchy) | Hierarchy parent selection | Parent dropdown shows available parents, selecting updates hierarchy |
| Save description editor content | ProseMirror editor | Content entered in editor persists after save |
| Push location to session | Push-to-session feature | Location can be pushed to campaign's current session |
| Generate button shows context menu | AI generation menu | Generate button opens context menu |
| Generate image - requires Backend | Image generation option | Menu includes image generation (actual generation requires backend) |
| Foundry doc button disabled when no scenes | Scene linking state | Button disabled when no scenes attached |
| Create scene from image - requires Backend | Scene creation from image | Image picker exists (actual creation requires backend) |
| Switch to journals tab and verify data | Journal management | Journals tab shows linked journals |
| Add journal via picker dialog | Journal picker | Add button opens picker, selecting journal adds to list |
| Click journal row opens journal sheet | Journal navigation | Clicking journal name opens Foundry journal sheet |
| Remove journal via delete button | Journal removal | Delete button removes journal from list after confirmation |
| Drop journal via drag-drop simulation | Drag-drop journal | Simulated drag-drop adds journal to list |
| Switch to characters relationship tab | Relationship tab | Characters tab shows related characters |
| Switch to locations relationship tab | Relationship tab | Locations tab shows related locations (children/parent) |
| Switch to organizations relationship tab | Relationship tab | Organizations tab shows related organizations |
| Switch to scenes tab and verify data | Scene management | Scenes tab shows linked Foundry scenes |
| Switch to sessions tab and verify data | Session history | Sessions tab shows sessions where location appears |
| Click session row opens session | Session navigation | Clicking session name opens session content |
| Switch to foundry tab | Foundry docs tab | Foundry documents tab becomes visible |
| Foundry doc button opens scene when scenes attached | Scene activation | Button activates first linked scene in Foundry |
| Related entries from editor links | Editor link detection | Editor is present (full link testing requires complex interaction) |

---

#### `campaigns/campaign.test.ts` 
**Status:** Complete (12 tests)

| Test | What It Tests | Expected Behavior |
|------|---------------|-------------------|
| Open existing campaign from directory | Campaign navigation | Clicking campaign name opens campaign content, header shows correct name |
| Create new campaign via API and verify in directory | Campaign creation | Campaign created via testAPI appears in directory after refresh |
| Edit campaign name with debounce | Campaign name editing | Name changes persist after debounce (700ms) |
| Expand campaign folder to show sessions | Campaign folder expansion | Clicking folder toggle expands to show session nodes |
| Add session to campaign via API | Session creation | Session created via testAPI appears under campaign |
| Open session from campaign directory | Session navigation | Clicking session name opens session content |
| Switch between campaigns in different settings | Setting isolation | Opening campaigns in different settings shows correct content |
| Navigate to description tab | Tab navigation | Description tab shows editor for campaign description |
| Navigate to PCs tab | Tab navigation | PCs tab shows PC management UI |
| Navigate to Lore tab | Tab navigation | Lore tab shows lore entries |
| Navigate to Ideas tab | Tab navigation | Ideas tab shows ideas list |

---

#### `sessions/session.test.ts` 
**Status:** Complete (13 tests)

| Test | What It Tests | Expected Behavior |
|------|---------------|-------------------|
| Open existing session from campaign directory | Session navigation | Clicking session name opens session content, header shows correct name |
| Create new session via API and verify in directory | Session creation | Session created via testAPI appears in campaign directory |
| Edit session name with debounce | Session name editing | Name changes persist after debounce (700ms) |
| View session number field | Session number display | Session number input shows correct number |
| Navigate to notes tab (default) | Default tab | Notes tab is active by default, editor is visible |
| Navigate to items tab | Tab navigation | Items tab shows session items list |
| Navigate to locations tab | Tab navigation | Locations tab shows session locations |
| Navigate to lore tab | Tab navigation | Lore tab shows lore entries |
| Navigate to monsters tab | Tab navigation | Monsters tab shows monster list |
| Navigate to NPCs tab | Tab navigation | NPCs tab shows NPC list |
| Navigate to vignettes tab | Tab navigation | Vignettes tab shows vignettes list |
| Navigate to PCs tab | Tab navigation | PCs tab shows PC management |
| Session tags are visible | Tag component | Tags wrapper component is present |

---

#### `entries/organization.test.ts` 
**Status:** Complete (15 tests)

| Test | What It Tests | Expected Behavior |
|------|---------------|-------------------|
| Open existing organization entry | Organization navigation | Entry opens, name input shows correct name |
| Create new organization entry via API | Organization creation | Entry created via testAPI appears in directory |
| Edit organization name with debounce | Name editing | Name changes persist after debounce (700ms) |
| Select existing type for organization | Type dropdown | Type dropdown opens, selecting option updates type field |
| Add and remove tags | Tag management | Tags can be added and removed |
| Click tag opens tag results tab | Tag click navigation | Clicking a tag opens TagResultsTab |
| Push organization to session | Push-to-session feature | Context menu shows campaigns, selecting adds to session |
| Generate button shows context menu | AI generation menu | Generate button opens context menu with options |
| Switch to journals tab | Tab navigation | Journals tab becomes visible |
| Switch to characters relationship tab | Relationship tab | Characters relationship tab becomes visible |
| Switch to locations relationship tab | Relationship tab | Locations relationship tab becomes visible |
| Switch to organizations relationship tab | Relationship tab | Organizations relationship tab becomes visible |
| Switch to sessions tab | Sessions tab | Sessions tab becomes visible |
| Switch to foundry tab | Foundry docs tab | Foundry documents tab becomes visible |

---

#### `entries/pc.test.ts` 
**Status:** Complete (15 tests)

| Test | What It Tests | Expected Behavior |
|------|---------------|-------------------|
| Open existing PC entry | PC navigation | Entry opens, name input shows correct name |
| Create new PC entry via API | PC creation | Entry created via testAPI appears in directory |
| Edit PC name with debounce | Name editing | Name changes persist after debounce (700ms) |
| Edit player name field | Player name editing | Player name input updates correctly |
| Select existing type for PC | Type dropdown | Type dropdown opens, selecting option updates type field |
| Add and remove tags | Tag management | Tags can be added and removed |
| Click tag opens tag results tab | Tag click navigation | Clicking a tag opens TagResultsTab |
| Generate button shows context menu | AI generation menu | Generate button opens context menu with options |
| Switch to journals tab | Tab navigation | Journals tab becomes visible |
| Switch to characters relationship tab | Relationship tab | Characters relationship tab becomes visible |
| Switch to locations relationship tab | Relationship tab | Locations relationship tab becomes visible |
| Switch to organizations relationship tab | Relationship tab | Organizations relationship tab becomes visible |
| Switch to sessions tab | Sessions tab | Sessions tab becomes visible |
| Switch to foundry tab | Foundry docs tab | Foundry documents tab becomes visible |
| PC shows image picker | Image picker | Image picker component is present |

---

#### `navigation/header.test.ts` 
**Status:** Complete (10 tests)

| Test | What It Tests | Expected Behavior |
|------|---------------|-------------------|
| Open entry creates new tab | Tab creation | Opening an entry creates a new tab in the header |
| Open second entry creates additional tab | Multiple tabs | Opening another entry adds another tab |
| Click tab to switch between entries | Tab switching | Clicking a tab activates that content |
| Close tab removes it from header | Tab removal | Close button removes tab from header |
| Open location entry creates new tab | Tab creation | Location entries also create tabs |
| Tab close button is visible | Close button UI | Close button is visible on active tab |
| Multiple tabs can be open simultaneously | Tab management | Multiple tabs can exist at once |
| Tab shows correct icon for entry type | Tab icons | Tabs display appropriate icons for entry types |
| Switch between tabs preserves content | Content preservation | Switching tabs shows correct content for each entry |

---

#### `components/editor.test.ts` 
**Status:** Complete (11 tests)

| Test | What It Tests | Expected Behavior |
|------|---------------|-------------------|
| Editor is visible on entry open | Editor visibility | ProseMirror editor is present when entry opens |
| Editor content can be read | Content retrieval | Can read editor content via getDescriptionEditorContent |
| Editor content can be set | Content setting | Can set editor content programmatically |
| Editor save via Ctrl+S | Save functionality | Saving persists content changes |
| Editor accepts text input via typing | Keyboard input | Typing in editor adds text content |
| Editor supports bold formatting | Text formatting | Ctrl+B applies bold (strong tag) |
| Editor supports italic formatting | Text formatting | Ctrl+I applies italic (em tag) |
| Editor shows placeholder when empty | Empty state | Editor shows placeholder or empty state correctly |
| Editor is resizable | Resize functionality | Editor container supports resizing |
| Editor on location entry shows description | Location editor | Location entries have working editor |
| Editor on campaign shows description | Campaign editor | Campaigns have working editor |

---

#### `components/tags.test.ts` 
**Status:** Complete (11 tests)

| Test | What It Tests | Expected Behavior |
|------|---------------|-------------------|
| Tags component is visible on entry open | Tags visibility | Tags wrapper is present when entry opens |
| Tags input field is present | Input field | Tags input element exists |
| Add a new tag | Tag adding | Tag is added to the list |
| Add multiple tags | Multiple tags | Multiple tags can be added |
| Remove a tag | Tag removal | Tag is removed from the list |
| Click tag opens tag results tab | Tag navigation | Clicking a tag opens TagResultsTab |
| Tag shows X button on hover | Remove button | Close button is present on tags |
| Tags persist after entry save | Persistence | Tags remain after save and reload |
| Tags on location entry | Location tags | Location entries have tags component |
| Tags on organization entry | Organization tags | Organization entries have tags component |
| Tags on session | Session tags | Sessions have tags component |

---

#### `components/typeahead.test.ts` 
**Status:** Complete (11 tests)

| Test | What It Tests | Expected Behavior |
|------|---------------|-------------------|
| Typeahead input is visible on entry open | Typeahead visibility | Typeahead input is present when entry opens |
| Click typeahead opens dropdown | Dropdown activation | Clicking input opens dropdown menu |
| Dropdown shows existing types | Type options | Dropdown shows available type options |
| Select existing type from dropdown | Type selection | Clicking option selects the type |
| Type to filter options | Search filtering | Typing filters dropdown options |
| Add new type via typeahead | New type creation | Can create new types via typeahead |
| Typeahead shows placeholder text | Placeholder | Input shows placeholder when empty |
| Typeahead on location entry | Location typeahead | Location entries have typeahead |
| Typeahead on organization entry | Organization typeahead | Organization entries have typeahead |
| Clear type selection | Type clearing | Can clear selected type |
| Typeahead dropdown closes on selection | Dropdown behavior | Dropdown closes after selection |

---

#### `directory/tree.test.ts` 
**Status:** Complete (14 tests)

| Test | What It Tests | Expected Behavior |
|------|---------------|-------------------|
| Setting folder is visible | Setting folder | Setting folder node exists in directory |
| Topic folders are visible | Topic folders | Topic folder nodes are displayed |
| Expand character topic folder | Topic expansion | Clicking toggle expands character folder |
| Expand location topic folder | Topic expansion | Clicking toggle expands location folder |
| Expand organization topic folder | Topic expansion | Clicking toggle expands organization folder |
| Expand PC topic folder | Topic expansion | Clicking toggle expands PC folder |
| Type folders are visible after topic expansion | Type folders | Type folders appear under expanded topics |
| Expand type folder shows entries | Entry visibility | Expanding type folder shows entry nodes |
| Collapse topic folder hides entries | Topic collapse | Collapsing folder hides child entries |
| Campaign folder is visible | Campaign folder | Campaign folder node exists |
| Expand campaign folder shows sessions | Campaign expansion | Expanding campaign shows session nodes |
| Click entry in tree opens content | Entry navigation | Clicking entry name opens content tab |
| Tree shows correct entry count | Entry count | Tree displays expected number of entries |
| Topic folder icons are correct | Folder icons | Folder icons use correct FontAwesome icons |
| Setting switch updates directory tree | Setting isolation | Switching settings updates tree content |

---

#### `components/imagePicker.test.ts` 
**Status:** Complete (10 tests)

| Test | What It Tests | Expected Behavior |
|------|---------------|-------------------|
| Image picker is visible on character entry | Character image | Image picker component is present |
| Image picker is visible on location entry | Location image | Image picker component is present |
| Image picker is visible on organization entry | Organization image | Image picker component is present |
| Image picker is visible on PC entry | PC image | Image picker component is present |
| Image change button is present | Change button | Button to change image exists |
| Click image change button opens file picker | File picker | Click triggers file input |
| Image element has correct styling | Image styling | Image container has correct CSS classes |
| Image picker on campaign | Campaign image | Campaigns have image picker |
| Image picker on session | Session image | Sessions have image picker |
| Image placeholder shown when no image | Placeholder | Placeholder or empty state is handled |

---

#### `components/relationshipTabs.test.ts` 
**Status:** Complete (12 tests)

| Test | What It Tests | Expected Behavior |
|------|---------------|-------------------|
| Characters relationship tab is accessible | Tab navigation | Characters tab content is visible |
| Locations relationship tab is accessible | Tab navigation | Locations tab content is visible |
| Organizations relationship tab is accessible | Tab navigation | Organizations tab content is visible |
| Sessions tab is accessible | Tab navigation | Sessions tab content is visible |
| Location entry shows characters relationship tab | Location tabs | Characters tab works on locations |
| Location entry shows locations relationship tab (hierarchy) | Hierarchy tab | Locations tab shows parent/child relationships |
| Organization entry shows characters relationship tab | Organization tabs | Characters tab works on organizations |
| Organization entry shows organizations relationship tab | Organization tabs | Organizations tab works on organizations |
| PC entry shows characters relationship tab | PC tabs | Characters tab works on PCs |
| PC entry shows sessions tab | PC tabs | Sessions tab works on PCs |
| Relationship tab shows empty state when no relationships | Empty state | Tab handles empty relationships gracefully |
| Relationship tab header is correct | Tab header | Tab displays correct header |

---

### New Tests (To Be Documented)

*As each test file is created, add documentation here with:*
- Test file name
- Status (In Progress / Complete)
- Table of tests with What It Tests and Expected Behavior columns

---


## Test Execution Status

### Files Tested

| File | Status | Pass | Fail |
|------|--------|------|------|
| directory/basic.test.ts | FAILED | 0 | 1 |
| directory/tree.test.ts | FAILED | 12 | 2 |
| entries/character.test.ts | FAILED | 12 | 6 |
| entries/location.test.ts | FAILED | 17 | 18 |
| entries/organization.test.ts | FAILED | 1 | 14 |
| entries/pc.test.ts | FAILED | 0 | 17 |
| campaigns/campaign.test.ts | FAILED | 8 | 4 |
| campaigns/campaign-tabs.test.ts | FAILED | 6 | 8 |
| sessions/session.test.ts | FAILED | 6 | 11 |
| sessions/session-tabs.test.ts | FAILED | 2 | 24 |
| navigation/header.test.ts | FAILED | 2 | 8 |
| components/editor.test.ts | FAILED | 0 | 12 |
| components/tags.test.ts | FAILED | 0 | 11 |
| components/typeahead.test.ts | FAILED | 0 | 11 |
| components/imagePicker.test.ts | FAILED | 0 | 10 |
| components/relationshipTabs.test.ts | FAILED | 0 | 12 |
| components/playmode.test.ts | FAILED | 4 | 10 |
| components/search.test.ts | FAILED | 9 | 2 |
| dialogs/dialogs.test.ts | FAILED | 4 | 12 |
| features/features.test.ts | FAILED | 8 | 14 |
| arcs/arc.test.ts | FAILED | 11 | 1 |
| fronts/front.test.ts | FAILED | 6 | 1 |
| storywebs/storyweb.test.ts | FAILED | 6 | 1 |
| settings/settings.test.ts | FAILED | 6 | 19 |

**Summary:** 24 test files, 108 tests passed, 228 tests failed

---

## Coverage Results

### Files Meeting Coverage

| File | Coverage % | Target | Status |
|------|------------|--------|--------|
| N/A | | | Coverage not collected (requires instrumented build) |

### Files Not Meeting Coverage

| File | Coverage % | Target | Gap | Notes |
|------|------------|--------|-----|-------|
| All files | N/A | 98% | N/A | Run `npm run debug:test` then `npm run test:coverage` to collect coverage |

---