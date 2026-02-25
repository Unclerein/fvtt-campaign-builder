---
title: Import/Export Module Data
prev: 
  text: 'Table Grouping'
  link: '/reference/configuration/table-grouping'
---
# Import/Export Module Data

The Import/Export feature allows you to backup all your FCB content and settings, or transfer them to another Foundry world. 

## Accessing Import/Export

You access this using the "Export Module Data" and "Import Module Data" buttons in the [Module Settings] menu.  

## Exporting Data

### What Gets Exported

The export includes all Campaign Builder data:
- **Module Settings**: All configuration options including custom fields, story web settings, roll table settings, species lists, etc.
- **Settings** (world content): Each [^Setting] with all its content:
  - [^Entries] (Characters, Locations, Organizations, PCs)
  - [^Campaigns] and their [^Sessions]
  - [^Arcs], [^Fronts], and [^StoryWebs]
  - All relationships between entries
  - All text content and journal pages

Any links to non-Campaign Builder Foundry documents (actors, scenes, items, etc.) will be preserved, but the actual documents will not be exported.  Direct links (ex. magical items, character actors) will be dropped to keep it tidy.  Links that are in text content will be left but become broken links.

## Importing Data

::: danger Danger!
Importing will **DELETE ALL existing Campaign Builder content** in the current world before creating the imported content. This action cannot be undone.

Make sure to export your current data first if you want to preserve it.
:::

### What Happens During Import

1. **Deletion**: All existing content is deleted
2. **Module Settings**: Global and user-level Campaign Builder settings are restored
3. **Content Recreation**: Each [^Setting] and all its documents are recreated:
   - New compendiums are created for each Setting
   - All entries, campaigns, sessions, arcs, fronts, and story webs are created
4. **Reload**: Foundry reloads to ensure all settings take effect
