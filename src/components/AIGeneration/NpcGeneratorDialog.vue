<template>
  <Teleport to="body">
    <Dialog
      v-model="show"
      title="Générateur de PNJ"
      :buttons="dialogButtons"
      @cancel="onClose"
    >
      <div class="fcb-npc-generator flexcol">

        <!-- Sélection race / sexe -->
        <div class="npc-selectors flexrow">
          <label class="npc-label">
            Race
            <select v-model="selectedRace" :disabled="loading">
              <option v-for="r in races" :key="r" :value="r">{{ r }}</option>
            </select>
          </label>
          <label class="npc-label">
            Sexe
            <select v-model="selectedGender" :disabled="loading">
              <option v-for="g in genders" :key="g" :value="g">{{ g }}</option>
            </select>
          </label>
        </div>

        <!-- Avertissement clé API manquante -->
        <div v-if="!hasApiKey" class="npc-warning">
          <i class="fas fa-exclamation-triangle"></i>
          Clé API Anthropic manquante — configure-la dans les paramètres avancés du module.
        </div>

        <!-- Chargement -->
        <div v-if="loading" class="npc-loading flexrow">
          <ProgressSpinner style="width:32px;height:32px" />
          <span>Génération en cours…</span>
        </div>

        <!-- Erreur -->
        <div v-else-if="error" class="npc-error">
          <i class="fas fa-times-circle"></i> {{ error }}
        </div>

        <!-- Prévisualisation -->
        <template v-else-if="npcData">
          <div class="npc-preview">
            <div class="npc-preview-name">{{ npcData.name }}</div>
            <table class="npc-preview-table">
              <tr><th>Âge</th><td>{{ npcData.age }}</td></tr>
              <tr><th>Physique</th><td>{{ npcData.physical }}</td></tr>
              <tr><th>Parler</th><td>{{ npcData.speech }}</td></tr>
              <tr><th>Secret</th><td>{{ npcData.secret }}</td></tr>
            </table>
          </div>
        </template>

      </div>
    </Dialog>
  </Teleport>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue';
  import { storeToRefs } from 'pinia';
  import ProgressSpinner from 'primevue/progressspinner';

  import Dialog from '@/components/dialogs/Dialog.vue';
  import { useMainStore, useNavigationStore, useSettingDirectoryStore } from '@/applications/stores';
  import { ModuleSettings, SettingKey } from '@/settings';
  import { Topics } from '@/types';
  import { generateNpc, formatNpcDescription, NPC_RACES, NPC_GENDERS, NpcRace, NpcGender, NpcData } from '@/utils/npcGenerator';

  const emit = defineEmits<{ (e: 'close'): void }>();

  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const settingDirectoryStore = useSettingDirectoryStore();
  const { currentSetting } = storeToRefs(mainStore);

  const show = ref(true);
  const selectedRace = ref<NpcRace>('Aléatoire');
  const selectedGender = ref<NpcGender>('Aléatoire');
  const loading = ref(false);
  const error = ref<string | null>(null);
  const npcData = ref<NpcData | null>(null);

  const races = NPC_RACES;
  const genders = NPC_GENDERS;

  const hasApiKey = computed(() => !!ModuleSettings.get(SettingKey.AnthropicAPIKey));

  const dialogButtons = computed(() => {
    const buttons: any[] = [
      {
        label: 'Annuler',
        default: false,
        close: true,
        callback: onClose,
      },
      {
        label: npcData.value ? 'Régénérer' : 'Générer',
        default: !npcData.value,
        close: false,
        disable: loading.value || !hasApiKey.value,
        callback: onGenerate,
      },
    ];
    if (npcData.value) {
      buttons.push({
        label: 'Créer la fiche',
        default: true,
        close: false,
        disable: loading.value,
        callback: onCreate,
      });
    }
    return buttons;
  });

  function onClose() {
    show.value = false;
    emit('close');
  }

  async function onGenerate() {
    error.value = null;
    loading.value = true;
    try {
      npcData.value = await generateNpc(selectedRace.value, selectedGender.value);
    } catch (e: any) {
      error.value = e?.message ?? 'Erreur inconnue.';
    } finally {
      loading.value = false;
    }
  }

  async function onCreate() {
    if (!npcData.value || !currentSetting.value) return;
    loading.value = true;
    error.value = null;
    try {
      const topicFolder = currentSetting.value.topicFolders[Topics.Character];
      if (!topicFolder) throw new Error('Dossier Personnages introuvable dans ce setting.');

      const entry = await settingDirectoryStore.createEntry(topicFolder, {
        name: npcData.value.name,
        type: 'NPC',
      });

      if (!entry) throw new Error('Échec de la création de la fiche.');

      entry.description = formatNpcDescription(npcData.value);
      await entry.save();

      onClose();
      await navigationStore.openEntry(entry.uuid, { newTab: true, activate: true });
    } catch (e: any) {
      error.value = e?.message ?? 'Erreur lors de la création.';
      loading.value = false;
    }
  }
</script>

<style lang="scss">
.fcb-npc-generator {
  gap: 10px;
  padding: 6px 2px;
  min-width: 380px;

  .npc-selectors {
    gap: 16px;
    align-items: flex-end;
  }

  .npc-label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: var(--font-size-12);
    font-weight: 500;
    flex: 1;

    select {
      width: 100%;
      font-size: var(--font-size-13);
    }
  }

  .npc-warning {
    font-size: var(--font-size-12);
    color: var(--color-level-warning);
    background: rgba(255, 165, 0, 0.1);
    border: 1px solid rgba(255, 165, 0, 0.4);
    border-radius: 4px;
    padding: 6px 10px;

    i { margin-right: 6px; }
  }

  .npc-loading {
    align-items: center;
    gap: 10px;
    font-size: var(--font-size-13);
    color: var(--fcb-text-muted);
    justify-content: center;
    padding: 10px 0;
  }

  .npc-error {
    font-size: var(--font-size-12);
    color: var(--color-level-error, #c00);
    background: rgba(200, 0, 0, 0.08);
    border: 1px solid rgba(200, 0, 0, 0.3);
    border-radius: 4px;
    padding: 6px 10px;

    i { margin-right: 6px; }
  }

  .npc-preview {
    border: 1px solid var(--fcb-button-border);
    border-radius: 6px;
    padding: 10px 12px;
    background: var(--fcb-surface-2);

    .npc-preview-name {
      font-size: var(--font-size-16);
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--fcb-accent, cornflowerblue);
    }

    .npc-preview-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--font-size-12);

      th {
        text-align: left;
        white-space: nowrap;
        padding: 3px 8px 3px 0;
        color: var(--fcb-text-muted);
        font-weight: 500;
        width: 80px;
        vertical-align: top;
      }

      td {
        padding: 3px 0;
        color: var(--fcb-text);
        vertical-align: top;
      }

      tr:not(:last-child) td, tr:not(:last-child) th {
        border-bottom: 1px solid var(--fcb-border-light, rgba(127,127,127,0.15));
      }
    }
  }
}
</style>
