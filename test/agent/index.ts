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
export { config } from './config';
export type { AgentConfig, BrowserMode, FoundryState } from './config';

// Browser management
export { launchBrowser, closeBrowser, getPage, screenshot } from './utils/browser';
export type { BrowserResult, LaunchOptions } from './utils/browser';

// Foundry navigation
export { detectFoundryState, navigateToGame, resetWorld, evaluate } from './utils/foundry';

// Module interaction
export {
  openCampaignBuilder,
  closeCampaignBuilder,
  switchToTab,
  getActiveTab,
  waitForCampaignBuilder,
  isCampaignBuilderOpen,
} from './utils/module';

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
