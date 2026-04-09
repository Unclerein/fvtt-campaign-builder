import { TestContext } from '../types';
import { expect } from '../testRunner';

export async function deleteSetting(context: TestContext, _settingName: string) {
  const page = context.page!;
  
  // Find the setting header
  const settingHeaders = await page.$$('.fcb-setting-folder:not(.collapsed) > .folder-header');
  if (settingHeaders.length === 0) {
    throw new Error('No setting header found');
  }
  
  const settingHeader = settingHeaders[0];
  
  // Right-click on the header
  await settingHeader.evaluate((el) => {
    el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
  });
  
  // Wait for context menu and click Delete
  await page.waitForSelector('.v-contextmenu, .fcb');
  
  // Find and click the Delete menu item
  const menuItems = await page.$$('.v-contextmenu li, .fcb li');
  for (const item of menuItems) {
    const text = await item.evaluate(el => el.textContent);
    if (text?.match(/Delete/i)) {
      await item.click();
      break;
    }
  }
  
  // Wait for confirmation dialog
  const dialogs = await page.$$('.dialog');
  for (const dialog of dialogs) {
    const text = await dialog.evaluate(el => el.textContent);
    if (text?.includes('Delete setting?')) {
      // Click confirm button
      const confirmButtons = await dialog.$$('.dialog-buttons button, .footer button');
      if (confirmButtons.length > 0) {
        await confirmButtons[0].click();
      }
      break;
    }
  }
  
  // Wait a moment for the delete to complete
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Verify the setting is gone
  const headers = await page.$$('.fcb-setting-folder:not(.collapsed) > .folder-header');
  let found = false;
  for (const header of headers) {
    const text = await header.evaluate(el => el.textContent);
    if (text?.includes('E2E Setting')) {
      found = true;
      break;
    }
  }
  expect(found).toBe(false);
}
