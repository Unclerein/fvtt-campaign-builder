import { VueApplicationMixin } from '@/libraries/fvtt-vue/VueApplicationMixin';
import PrimeVue from 'primevue/config';

import App from '@/components/applications/PermissionSettings.vue';
import { theme } from '@/components/styles/primeVue';

const { ApplicationV2 } = foundry.applications.api;

// the most recent one; we track this so it can close itself
export let permissionSettingsApp: PermissionSettingsApplication | null = null;

export class PermissionSettingsApplication extends VueApplicationMixin(ApplicationV2) {
  constructor() { super(); permissionSettingsApp = this; }

  static DEFAULT_OPTIONS = {
    id: `app-fcb-permission-settings`,
    classes: ['fcb-permission-settings'],
    window: {
      title: 'fcb.settings.permissionSettings',
      icon: 'fa-solid fa-dice',
      resizable: false,
    },
    position: {
      width: 600,
    },
    actions: {}
  };

  static DEBUG = false;

  static SHADOWROOT = false;

  static PARTS = {
    app: {
      id: 'fcb-permission-settings-app',
      component: App,
      props: {},
      use: {
        primevue: {
          plugin: PrimeVue,
          options: {
            theme: theme
          }
        },
      }
    }
  };
}