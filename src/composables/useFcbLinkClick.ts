import { useNavigationStore } from '@/applications/stores';
import { WindowTabType } from '@/types';

/**
 * Returns an onClick handler that intercepts clicks on .fcb-content-link anchors
 * and opens them inside the campaign builder instead of the default Foundry sheet.
 * Used by both CampaignBuilder and SessionNotes popup.
 */
export const useFcbLinkClick = () => {
  const navigationStore = useNavigationStore();

  const onFcbLinkClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;

    if (target.tagName !== 'A')
      return;

    let found = false;
    for (let i = 0; i < target.classList.length; i++) {
      if (target.classList[i] === 'fcb-content-link' && target.dataset.uuid) {
        found = true;
        break;
      }
    }
    if (!found)
      return;

    event.stopPropagation();

    switch (parseInt(target.dataset.linkType ?? '-1')) {
      case WindowTabType.Entry:
        void navigationStore.openEntry(target.dataset.uuid, { newTab: event.ctrlKey, panelIndex: event.altKey ? -1 : undefined });
        break;
      case WindowTabType.Campaign:
        void navigationStore.openCampaign(target.dataset.uuid, { newTab: event.ctrlKey, panelIndex: event.altKey ? -1 : undefined });
        break;
      case WindowTabType.Session:
        void navigationStore.openSession(target.dataset.uuid, { newTab: event.ctrlKey, panelIndex: event.altKey ? -1 : undefined });
        break;
      case WindowTabType.Arc:
        void navigationStore.openArc(target.dataset.uuid, { newTab: event.ctrlKey, panelIndex: event.altKey ? -1 : undefined });
        break;
      case WindowTabType.Front:
        void navigationStore.openFront(target.dataset.uuid, { newTab: event.ctrlKey, panelIndex: event.altKey ? -1 : undefined });
        break;
      case WindowTabType.StoryWeb:
        void navigationStore.openStoryWeb(target.dataset.uuid, { newTab: event.ctrlKey, panelIndex: event.altKey ? -1 : undefined });
        break;
      case WindowTabType.Setting:
        void navigationStore.openSetting(target.dataset.uuid, { newTab: event.ctrlKey, panelIndex: event.altKey ? -1 : undefined });
        break;
      case WindowTabType.TagResults:
        void navigationStore.openTagResults(target.dataset.uuid, { newTab: event.ctrlKey, panelIndex: event.altKey ? -1 : undefined });
        break;
    }
  };

  return { onFcbLinkClick };
};
