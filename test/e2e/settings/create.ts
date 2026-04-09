import { test, expect } from '../testRunner';
import { testData } from '@e2etest/data';
import { confirmSettingInList, fillOutNameDialog } from '@e2etest/utils';
import { TestContext } from '../types';

export const createInitialSetting = (context: TestContext) => {
  test('Create a setting when none exists', async () => {
    // the box should already be there
    await fillOutSettingNameDialog(context, testData.settings[0].name);

    await confirmSettingInList(testData.settings[0].name);
  });
}

/** 
 * Creates a setting from the button on the sidebar
 */
export const createSettingFromSidebar = (context: TestContext, settingName: string) => {
  test('Create a setting from the button on the sidebar', async () => {
    const page = context.page!;

    const createSettingButtons = await page.$$('div.new-link');
    let createSettingButton: import('puppeteer').ElementHandle<Element> | null = null;
    
    for (const btn of createSettingButtons) {
      const text = await btn.evaluate(el => el.textContent);
      if (text?.includes('Create Setting')) {
        createSettingButton = btn;
        break;
      }
    }
    
    if (!createSettingButton) {
      throw new Error('Create Setting button not found');
    }
    
    await createSettingButton.click();
    
    await fillOutSettingNameDialog(context, settingName);

    // Wait for the folder header to appear
    await page.waitForSelector('.fcb-setting-directory .fcb-setting-folder > .folder-header');
    
    // Find the folder with the setting name
    const folderHeaders = await page.$$('.fcb-setting-directory .fcb-setting-folder > .folder-header');
    let found = false;
    for (const header of folderHeaders) {
      const text = await header.evaluate(el => el.textContent);
      if (text?.includes(settingName)) {
        found = true;
        break;
      }
    }
    
    console.log(found ? 'Found setting folder' : 'Setting folder not found');
    expect(found).toBe(true);

    await confirmSettingInList(settingName);
  });
}

async function fillOutSettingNameDialog(context: TestContext, settingName: string) {
  await fillOutNameDialog(context, 'Create Setting', settingName);
}

