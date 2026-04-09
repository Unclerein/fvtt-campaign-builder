import { test } from '../testRunner';
import { confirmSettingInList, switchToSetting } from '@e2etest/utils';
import { TestContext } from '../types';

export const updateSetting = (context: TestContext, settingName: string) => {
  test('Update setting name', async () => {  
    await updateName(context, settingName);
  });

  test('Update setting fields', async () => {
    // open the setting page
    await switchToSetting(settingName);
    // await openSettingContent(settingName);

    // edit the fields

    // other fields
    // close and reopen campaign builder

    // make sure the setting is there and the fields are correct

  });
}

const updateName = async (context: TestContext, name: string) => {
  const page = context.page!;

  const newName = 'Temporary Test Name';
  
  // Wait for the setting name header and find the input
  await page.waitForSelector('[data-testid="setting-name-header"]');
  const header = await page.$('[data-testid="setting-name-header"]');
  
  if (header) {
    const input = await header.$('input');
    
    if (input) {
      // Clear and type new name
      await input.evaluate((el: Element) => {
        if (el instanceof HTMLInputElement) {
          el.value = '';
        }
      });
      await input.type(newName);

      // make sure it updated in the tree
      await confirmSettingInList(newName);

      // change it back
      await input.evaluate((el: Element) => {
        if (el instanceof HTMLInputElement) {
          el.value = '';
        }
      });
      await input.type(name);

      // make sure it updated again
      await confirmSettingInList(name);
    }
  }
}
  