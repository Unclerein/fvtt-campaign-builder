<template>
  <div
    :id="editorId"
    ref="wrapperRef"
    class="fcb-editor-wrapper"
    :style="wrapperStyle"
  >
    <!-- activation button positioned outside the scrolling area -->
    <a
      v-if="!props.editOnlyMode && props.editable"
      ref="buttonRef"
      class="editor-edit"
      :style="`display: ${ buttonDisplay }`"
      @click="activateEditor"
    >
      <i class="fa-solid fa-edit"></i>
    </a>
    <div
      class="fcb-editor"
      @drop="onDrop"
      @dragover="onDragover"
    >
      <!-- this reproduces the Vue editor() Handlebars helper -->
      <!-- editorVisible used to reset the DOM by toggling-->
      <div
        v-if="editorVisible"
        ref="editorRef"
        :class="'editor ' + props.class"
        :style="innerStyle"
      >
        <div
          ref="coreEditorRef"
          class="editor-content"
          v-bind="datasetProperties"
          v-html="safeEnrichedContent"
        >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { computed, nextTick, onMounted, ref, toRaw, watch, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { enrichFcbHTML } from './Editor/helpers';
  import { useMainStore } from '@/applications/stores';
  import { Campaign, Entry, Session, Setting } from '@/classes';
  import { getValidatedData } from '@/utils/dragdrop';
  import { notifyInfo } from '@/utils/notifications';
  import { localize } from '@/utils/game';
  import { sanitizeHTML } from '@/utils/sanitizeHtml';
  import { replaceEntityReferences } from '@/utils/entityLinking';
  import { extractUUIDs, compareUUIDs, } from '@/utils/uuidExtraction';


  // library components

  // local components

  // types
  const TextEditor = foundry.applications.ux.TextEditor;

  ////////////////////////////////
  // props
  const props = defineProps({
    editOnlyMode: {
      type: Boolean,
      required: false,
      default: false,
    },
    initialContent: {
      type: String,
      required: false,
      default: undefined,
    }, 
    class: {
      type: String,
      required: false,
      default: '',
    },
    editable: {
      type: Boolean,
      required: false,
      default: true,
    },
    collaborate: {
      type: Boolean,
      required: false,
      default: false,
    },
    height: {
      type: String,
      required: false,
      default: null,
    },
    fixedHeight: {
      type: String,
      required: false,
      default: null,
    },
    currentEntityUuid: {
      type: String,
      required: false,
      default: undefined,
    },
    enableEntityLinking: {
      type: Boolean,
      required: false,
      default: true,
    },
    enableRelatedEntriesTracking: {
      type: Boolean,
      required: false,
      default: false,
    },
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'editorSaved', content: string): void;
    (e: 'editorLoaded', content: string): void;  // to catch any initial transforms of the data 
    (e: 'relatedEntriesChanged', addedUUIDs: string[], removedUUIDs: string[]): void;
  }>();

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const { currentSetting } = storeToRefs(mainStore);

  ////////////////////////////////
  // data
  const editorId = ref<string>();
  const enrichedInitialContent = ref<string>('');
  const rawInitialContent = ref<string>('');
  const editor = ref<any>(null);
  const buttonDisplay = ref<string>('');   // is button currently visible
  const editorVisible = ref<boolean>(true);
  const lastSavedContent = ref<string>('');   // the parsemirror serialized content last saved, to see if any changes were made
  const initialUUIDs = ref<string[]>([]);     // UUIDs present when editor was first loaded

  const coreEditorRef = ref<HTMLDivElement>();
  const editorRef = ref<HTMLDivElement>();
  const wrapperRef = ref<HTMLDivElement>();
  const buttonRef = ref<HTMLAnchorElement>();

  const datasetProperties = computed(() => {
    const result: { [key: string]: any } = {};
    if (props.currentEntityUuid) {
      result['data-entity-uuid'] = props.currentEntityUuid;
    }
    return result;
  });

  const safeEnrichedContent = computed(() => sanitizeHTML(enrichedInitialContent.value));

  const wrapperStyle = computed((): string => (props.fixedHeight ? `height: ${props.fixedHeight + 'px'}` : ''));
  const innerStyle = computed((): string => (props.height ? `height: ${props.height + 'px'}` : ''));

  ////////////////////////////////
  // methods
  // shouldn't be called unless there's already a document
  // this creates the Editor class that converts the div into a functional editor
  async function activateEditor(): Promise<void> {
    if (!coreEditorRef.value || !currentSetting.value)
      return;

    // Get the initial content
    const content = rawInitialContent.value || '';
    lastSavedContent.value = content;

    // if there's an editor already, we need to destroy it first
    if (editor.value) {
      await editor.value.destroy();
      editor.value = null;
    }

    // make the button invisible
    buttonDisplay.value = 'none';

    // this is a trick to get the DOM to reset, so that the ProseMirror classes can be properly
    //    applied to a fresh div
    editorVisible.value = false;
    await nextTick();
    editorVisible.value = true;
    await nextTick();

    // create the editor
    if (coreEditorRef.value) {
      const proseMirrorPlugins = configureProseMirrorPlugins();

      editor.value = await TextEditor.create({
        target: coreEditorRef.value,
        height: props.height,
        engine: 'prosemirror' as const,
        collaborate: props.collaborate,
        content,
        plugins: {
          prosemirror: proseMirrorPlugins,
        },
      });

      emit('editorLoaded', content);
    }
  }

  function configureProseMirrorPlugins() {
    return {
      menu: ProseMirror.ProseMirrorMenu.build(ProseMirror.defaultSchema, {
        destroy: true,
        onSave: () => {
          saveEditor({remove:false});
        },
      }),
      save: {
        onSave: () => saveEditor(),
      },
      keyMaps: ProseMirror.ProseMirrorKeyMaps.build(ProseMirror.defaultSchema),
    };
  }

  async function saveEditor({remove}={remove:true}) {
    if (!editor.value)
      return;
    
    // get the latest content
    const latestContent = await editor.value.getData();
    
    // if we are tracking related entries, see if there are any changes
    if (props.enableRelatedEntriesTracking) {
      const latestUUIDs = extractUUIDs(latestContent);
      const { added, removed } = compareUUIDs(initialUUIDs.value, latestUUIDs);
      if (added.length > 0 || removed.length > 0) {
        emit('relatedEntriesChanged', added, removed);
        initialUUIDs.value = latestUUIDs;
      }
    }
    
    // if we are doing entity linking, do that now
    const finalContent = props.enableEntityLinking ? await replaceEntityReferences(latestContent) : latestContent;

    // only emit if there are changes
    if (finalContent !== lastSavedContent.value) {
      emit('editorSaved', finalContent);
      lastSavedContent.value = finalContent;
    }

    // destroy the editor
    if (remove) {
      await editor.value.destroy();
      editor.value = null;

      // show the button again
      buttonDisplay.value = 'block';

      // show the pretty text
      if (currentSetting.value) {
        enrichedInitialContent.value = await enrichFcbHTML(currentSetting.value.uuid, finalContent);
      }
    }
  }

  function isDirty(): boolean {
    if (!editor.value)
      return false;
    
    return toRaw(editor.value).isDirty;
  }

  function getContent(): string {
    if (!editor.value)
      return '';
    
    return toRaw(editor.value).getContent();
  }

  // expose methods
  defineExpose({ isDirty, getContent });

  ////////////////////////////////
  // event handlers
  function onDragover(event: DragEvent) {
    // allow dropping of text
    if (event.dataTransfer && event.dataTransfer.types.includes('text/plain')) {
      event.preventDefault();
    }
  }

  async function onDrop(event: DragEvent) {
    if (!editor.value || !event.dataTransfer)
      return;

    const data = getValidatedData(event);
    if (!data)
      return;

    let link;
    let contentToInsert;

    switch (data.type) {
      case 'Actor': {
        const actor = await fromUuid(data.uuid) as Actor;
        if (!actor)
          return;
        
        link = actor.link;
        break;
      }
      case 'JournalEntry': {
        const entry = await fromUuid(data.uuid) as JournalEntry;
        if (!entry)
          return;
        
        link = entry.link;
        break;
      }
      case 'JournalEntryPage': {
        const page = await fromUuid(data.uuid) as JournalEntryPage;
        if (!page)
          return;

        link = page.link;
        break;
      }
      case 'RollTable': {
        const table = await fromUuid(data.uuid) as RollTable;
        if (!table)
          return;
        
        link = table.link;
        break;
      }
      case 'Item': {
        const item = await fromUuid(data.uuid) as Item;
        if (!item)
          return;
        
        link = item.link;
        break;
      }
      case 'Scene': {
        const scene = await fromUuid(data.uuid) as Scene;
        if (!scene)
          return;
        
        link = scene.link;
        break;
      }
      case 'Campaign': {
        const campaign = await fromUuid(data.uuid) as Campaign;
        if (!campaign)
          return;

        contentToInsert = `<h2>${campaign.name}</h2><p>${campaign.description}</p>`;
        break;
      }
      case 'Session': {
        const session = await fromUuid(data.uuid) as Session;
        if (!session)
          return;
        
        contentToInsert = `<h2>${session.name}</h2><p>${session.notes}</p>`;
        break;
      }
      case 'FcbEntry': {
        const entry = await fromUuid(data.uuid) as Entry;
        if (!entry)
          return;

        link = entry.link;
        break;
      }
      case 'Setting': {
        const setting = await fromUuid(data.uuid) as Setting;
        if (!setting)
          return;

        notifyInfo(localize('notifications.warnDroppingSettings'));
        break;
      }
    }

    if (link) {
      // Create a UUID link in the format @UUID[uuid]{label}
      contentToInsert = `<a class="content-link" data-uuid="${data.uuid}" data-id="" data-type="${data.type}" data-pack="" data-tooltip="${data.type}">${link}</a>`;
    }

    if (contentToInsert) {
      // Insert the link at the current cursor position
      // For ProseMirror
      const view = toRaw(editor.value).view;
      const { state, dispatch } = view;
      const tr = state.tr.insertText(contentToInsert);
      dispatch(tr);
    }
  }

  ////////////////////////////////
  // watchers
  watch(() => props.initialContent, async (newContent) =>{
    if (!currentSetting.value)
      return;

    const content = newContent || '';
    rawInitialContent.value = content;
      
    // Initialize UUIDs for tracking if enabled
    if (props.enableRelatedEntriesTracking) {
      initialUUIDs.value = extractUUIDs(content);
    }

    // if edit-only and no editor exists yet, activate it
    if (props.editOnlyMode && !editor.value) {
      await nextTick();
      await activateEditor();
    }
    // If editor is already active, update its content
    else if (editor.value) {
      await nextTick();

      // Update the editor content
      const view = toRaw(editor.value).view;
      const { state, dispatch } = view;
      
      // Do nothing if the content is already what we want it to be
      const currentContent = ProseMirror.dom.serializeString(state.doc.content);
      if (currentContent === content) 
        return;
      
      // Create a transaction that replaces the entire document content
      const schema = state.schema;
      const newDoc = ProseMirror.dom.parseString(content, schema);
      const tr = state.tr.replaceWith(0, state.doc.content.size, newDoc.content);
      
      // Apply the transaction - this is throwing a Foundry ProseMirrorMenu plugin error, but it doesn't seem to matter as
      //    the update still happens
      try {
        dispatch(tr);
      } catch (error) {
        // just move on
      }
      
      lastSavedContent.value = content;
    } else {
      enrichedInitialContent.value = await enrichFcbHTML(currentSetting.value.uuid, content);
    }
  });

  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    if (!currentSetting.value)
      return;

    // we create a random ID so we can use multiple instances
    editorId.value  = 'fcb-editor-' + foundry.utils.randomID();

    // initialize the editor
    if (!coreEditorRef.value)
      return;

    editor.value = null;

    // show the pretty text - but only if we have a button... otherwise we're in permananent edit mode and shouldn't be enriching the text
    rawInitialContent.value = props.initialContent || '';
    enrichedInitialContent.value = !props.editOnlyMode ? await enrichFcbHTML(currentSetting.value.uuid, rawInitialContent.value) : rawInitialContent.value;

    // Initialize UUIDs for tracking if enabled
    if (props.enableRelatedEntriesTracking) {
      initialUUIDs.value = extractUUIDs(props.initialContent || '');
    }

    if (props.editOnlyMode) {
      await nextTick();
      await activateEditor();
    }
  });

</script>

<style lang="scss">
  .fcb-editor-wrapper {
    height: 100%;
    display: flex;
    flex: 1;
    position: relative;

    .editor-edit {
      position: absolute;
      z-index: 1000;
      right: 12px;
      top: 3px;
      color: coral;
      font-family: var(--font-body);
      font-size: var(--font-size-14);
      font-weight: normal;

      &:hover {
        color: green;
        background: orange;
        box-shadow: 0 0 5px red;
      }
    }

    .fcb-editor {
      height: 100%;
      width: 100%;
      display: flex;
      flex: 1;
      border: 1px solid var(--fcb-button-border-color);
      overflow-y: auto !important;
      border-radius: 4px;
      font-family: var(--font-body);
      font-size: var(--font-size-14);
      font-weight: normal;
      padding: 0;
      background: var(--fcb-dark-overlay);
      color: var(--color-dark-2);

      .editor {
        overflow: visible;
        height: 100%;
        width: 100%;
        min-height: 100%;
        position: relative;

        .editor-content {
          overflow-y: visible;
          height: unset;
          min-height: calc(100% - 8px);
          padding: 2px;
        }
      }

      .theme-dark & {
        background: var(--fcb-light-overlay);
        color: var(--color-light-2);
      }

      &:focus-within {
        border: 2px solid var(--color-warm-2);
      }

      &:disabled {
        color: var(--color-dark-4);

        .theme-dark & {
           background: var(--color-light-4);
        }
      }

      .prosemirror {
        width: 100%;
        
        .editor-menu {
          padding: 4px 0 4px 8px;
        }
        .editor-container {
          margin: 0px;

          .editor-content {
            padding: 0 8px 0 3px;

            &:focus-visible {
              outline: none;  // override the default focus outline
            }
          }
        }
      }
    }
  }

</style>