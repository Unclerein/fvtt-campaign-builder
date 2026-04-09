/**
 * Campaign Builder module interaction utilities
 */

import { Page } from 'puppeteer';
import { getPage } from './browser';

/**
 * Opens the Campaign Builder main window.
 * Assumes Foundry is already in game view.
 *
 * @param page - Page handle (optional, uses shared page if not provided)
 */
export async function openCampaignBuilder(page?: Page): Promise<void> {
  const p = page || await getPage();

  // Wait for the launch button to appear
  await p.waitForSelector('#fcb-launch', { timeout: 10000 });

  // Click the launch button
  await p.click('#fcb-launch');

  // Wait for the main window to appear
  await p.waitForSelector('.fcb-main-window', { visible: true, timeout: 10000 });

  // Wait for Vue app to be ready
  await p.waitForFunction(() => {
    const win = document.querySelector('.fcb-main-window');
    return win && win.querySelectorAll('.fcb-content-tab').length > 0;
  }, { timeout: 10000 });
}

/**
 * Closes the Campaign Builder main window.
 *
 * @param page - Page handle (optional, uses shared page if not provided)
 */
export async function closeCampaignBuilder(page?: Page): Promise<void> {
  const p = page || await getPage();

  // Click the close button in the header
  const closeButton = await p.$('.fcb-main-window .fcb-header-close');
  if (closeButton) {
    await closeButton.click();
    await p.waitForSelector('.fcb-main-window', { hidden: true, timeout: 5000 });
  }
}

/**
 * Switches to a specific tab in the Campaign Builder.
 *
 * @param tabName - Name of the tab (e.g., 'settings', 'campaigns', 'sessions')
 * @param page - Page handle (optional, uses shared page if not provided)
 */
export async function switchToTab(tabName: string, page?: Page): Promise<void> {
  const p = page || await getPage();

  const tabSelector = `[data-tab="${tabName}"]`;
  await p.waitForSelector(tabSelector, { timeout: 5000 });
  await p.click(tabSelector);

  // Wait for tab content to be visible
  await p.waitForSelector(`.fcb-tab-content.active`, { timeout: 5000 });
}

/**
 * Gets the currently active tab name.
 *
 * @param page - Page handle (optional, uses shared page if not provided)
 * @returns Active tab name or null
 */
export async function getActiveTab(page?: Page): Promise<string | null> {
  const p = page || await getPage();

  const activeTab = await p.$('.fcb-content-tab.active');
  if (!activeTab) return null;

  return activeTab.evaluate(el => el.getAttribute('data-tab'));
}

/**
 * Waits for the Campaign Builder to be ready.
 *
 * @param page - Page handle (optional, uses shared page if not provided)
 */
export async function waitForCampaignBuilder(page?: Page): Promise<void> {
  const p = page || await getPage();

  // Wait for launch button (Foundry ready)
  await p.waitForSelector('#fcb-launch', { timeout: 30000 });

  // Wait for module to initialize
  await p.waitForFunction(() => {
    return typeof game !== 'undefined' &&
           game?.modules?.get('campaign-builder')?.active;
  }, { timeout: 30000 });
}

/**
 * Checks if the Campaign Builder window is open.
 *
 * @param page - Page handle (optional, uses shared page if not provided)
 * @returns True if window is open
 */
export async function isCampaignBuilderOpen(page?: Page): Promise<boolean> {
  const p = page || await getPage();

  const win = await p.$('.fcb-main-window');
  return win !== null;
}
