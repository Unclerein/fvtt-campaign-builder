<template>
  <section class="window-content standard-form">
    <div class="standard-form scrollable">
      <div
        v-for="permission in permissions"
        :key="permission.setting"
        class="form-group"
      >
        <label style="flex:8">{{ localize(permission.label) }}</label>
        <div class="form-fields">
          <Select
          v-model="permission.value"
          :options="permissionLevels"
          optionLabel="label"
          optionValue="value"
          style="width: 200px"
          />
        </div>
        <p class="hint">
          {{ localize(permission.hint) }}
        </p>
      </div>

      <footer class="form-footer" data-application-part="footer">
        <button 
          @click="onSubmitClick"
        >
          <i class="fa-solid fa-save"></i>
          <label>{{ localize('labels.saveChanges') }}</label>
        </button>
      </footer>
    </div>
  </section>
</template> 

<script setup lang="ts">
  // library imports
  import { onMounted, ref, reactive} from 'vue';

  // local imports
  import { ModuleSettings, SettingKey } from '@/settings';
  import { localize } from '@/utils/game';
  import { permissionSettingsApp } from '@/applications/settings/PermissionSettingsApplication';

  // library components
  import Select from 'primevue/select';

  // local components

  // types

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store

  ////////////////////////////////
  // data
  const permissions = reactive([
    {
      setting: SettingKey.playerAccessEntryRead,
      label: 'settings.permissions.playerAccessEntryRead',
      hint: 'settings.permissions.playerAccessEntryReadHelp',
      value: ModuleSettings.get(SettingKey.playerAccessEntryRead) as CONST.USER_ROLES,
    },
    {
      setting: SettingKey.playerAccessEntryWrite,
      label: 'settings.permissions.playerAccessEntryWrite',
      hint: 'settings.permissions.playerAccessEntryWriteHelp',
      value: ModuleSettings.get(SettingKey.playerAccessEntryWrite) as CONST.USER_ROLES,
    },
    {
      setting: SettingKey.playerAccessEntryFull,
      label: 'settings.permissions.playerAccessEntryFull',
      hint: 'settings.permissions.playerAccessEntryFullHelp',
      value: ModuleSettings.get(SettingKey.playerAccessEntryFull) as CONST.USER_ROLES,
    },
    {
      setting: SettingKey.playerAccessBackend,
      label: 'settings.permissions.playerAccessBackend',
      hint: 'settings.permissions.playerAccessBackendHelp',
      value: ModuleSettings.get(SettingKey.playerAccessBackend) as CONST.USER_ROLES,
    },
    {
      setting: SettingKey.playerAccessSessionNotes,
      label:  'settings.permissions.playerAccessSessionNotes',
      hint: 'settings.permissions.playerAccessSessionNotesHelp',
      value: ModuleSettings.get(SettingKey.playerAccessSessionNotes) as CONST.USER_ROLES,
    },
    {
      setting: SettingKey.playerAccessSessionFull,
      label: 'settings.permissions.playerAccessSessionFull',
      hint: 'settings.permissions.playerAccessSessionFullHelp',
      value: ModuleSettings.get(SettingKey.playerAccessSessionFull) as CONST.USER_ROLES,
    },
  ]);

  const permissionLevels = ref<{ value: CONST.USER_ROLES; label: string }[]>([
    { value: CONST.USER_ROLES.PLAYER, label: game.i18n.localize('USER.RolePlayer') },
    { value: CONST.USER_ROLES.TRUSTED, label: game.i18n.localize('USER.RoleTrusted') },
    { value: CONST.USER_ROLES.ASSISTANT, label: game.i18n.localize('USER.RoleAssistant') },
    { value: CONST.USER_ROLES.GAMEMASTER, label: game.i18n.localize('USER.RoleGamemaster') },
  ]);

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onSubmitClick = async () => {
    // update all the settings
    for (const permission of permissions) {
      await ModuleSettings.set(permission.setting, permission.value);
    }

    // close
    permissionSettingsApp?.close();
  };


  ////////////////////////////////
  // watchers
  
  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    // load the settings
    for (const permission of permissions) {
      permission.value = ModuleSettings.get(permission.setting) as CONST.USER_ROLES;
    }
  });

</script>

<style lang="scss">
</style>