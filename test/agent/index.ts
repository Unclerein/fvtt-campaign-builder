/**
 * Puppeteer agent tooling for Foundry VTT Campaign Builder testing
 *
 * Usage:
 * ```typescript
 * import { launchBrowser, navigateToGame, openCampaignBuilder } from './test/agent';
 *
 * const { page, browser } = await launchBrowser({ refresh: true });
 * await navigateToGame(page);
 * await openCampaignBuilder(page);
 * // ... interact with module
 * await browser.close();
 * ```
 */

// Configuration
export { config } from '../e2e/utils/config';
export type { AgentConfig, BrowserMode, FoundryState } from '../e2e/utils/config';

// Browser management
export { launchBrowser, closeBrowser, getPage, screenshot } from '../e2e/utils/browser';
export type { BrowserResult, LaunchOptions } from '../e2e/utils/browser';

// Foundry navigation
export { detectFoundryState, navigateToGame, resetWorld, evaluate } from '../e2e/utils/foundry';

// Module interaction
export {
  openCampaignBuilder,
  closeCampaignBuilder,
  switchToTab,
  getActiveTab,
  waitForCampaignBuilder,
  isCampaignBuilderOpen,
} from '../e2e/utils/campaignBuilder';

// UI helpers
export {
  clickElement,
  fillInput,
  waitForSelector,
  waitForHidden,
  getText,
  getInputValue,
  isVisible,
  getElement,
  clickButton,
  selectOption,
  hoverElement,
  waitForUrl,
} from './utils/ui';
