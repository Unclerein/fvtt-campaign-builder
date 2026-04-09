import { sharedContext } from '../sharedContext';
import { Topics, ValidTopic } from '@/types';
import { Locator, getByTestId } from '../helpers';

export const switchToSetting = async (settingName: string) => {
  const page = sharedContext.page!;

  await getByTestId(page, 'setting-select').click();
  
  // Click the option with the setting name
  const options = await page.$$('.p-select-option-label');
  for (const option of options) {
    const text = await option.evaluate(el => el.textContent);
    if (text?.includes(settingName)) {
      await option.click();
      break;
    }
  }

  // Wait for the setting folder header to be visible
  await page.waitForSelector(`[data-testid="setting-folder-${settingName}"]`);
  
  // Wait for topic folders to load
  await page.waitForSelector('.fcb-topic-folder');
}

export const confirmSettingInList = async (settingName: string): Promise<Locator> => {
  const page = sharedContext.page!;

  await getByTestId(page, 'setting-select').click();
  
  // Click the option with the setting name
  const options = await page.$$('.p-select-option-label');
  for (const option of options) {
    const text = await option.evaluate(el => el.textContent);
    if (text?.includes(settingName)) {
      await option.click();
      break;
    }
  }

  // return the locator for the folder header
  const folderHeader = getByTestId(page, `setting-folder-${settingName}`);
  await folderHeader.waitFor();

  return folderHeader;
}

const topicText = {
  [Topics.Character]: 'Characters',
  [Topics.Location]: 'Locations',
  [Topics.Organization]: 'Organizations',
  [Topics.PC]: 'PCs',
};

/** ensures that the topic node is expanded, regardless of starting state */
export const expandTopicNode = async (topic: ValidTopic) => {
  const page = sharedContext.page!;

  // see if it's collapsed
  const collapsedFolders = await page.$$(`.fcb-topic-folder.collapsed`);
  
  for (const folder of collapsedFolders) {
    const text = await folder.evaluate(el => el.textContent);
    if (text?.includes(topicText[topic])) {
      // Click the inner div which has the actual click handler
      await getByTestId(page, `topic-folder-${topic}`).click();

      // Wait for it to no longer be collapsed
      const topicTextValue = topicText[topic];
      await page.waitForFunction((topicTextValue: string) => {
        const folders = Array.from(document.querySelectorAll('.fcb-topic-folder'));
        return folders.some(f => f.textContent?.includes(topicTextValue) && !f.classList.contains('collapsed'));
      }, {}, topicTextValue);
      break;
    }
  }
}

/** assumes the topic is expanded */
export const expandTypeNode = async (topic: ValidTopic, typeName: string) => {
  const page = sharedContext.page!;

  await expandTopicNode(topic);

  // Find the folder with the topic text
  const folders = await page.$$('.fcb-topic-folder');
  let topicFolder: import('puppeteer').ElementHandle<Element> | null = null;
  
  for (const folder of folders) {
    const text = await folder.evaluate(el => el.textContent);
    if (text?.includes(topicText[topic])) {
      topicFolder = folder;
      break;
    }
  }
  
  if (!topicFolder) return;

  // Find the type node with the type name
  const typeNodes = await topicFolder.$$('.fcb-directory-type');
  for (const typeNode of typeNodes) {
    const text = await typeNode.evaluate(el => el.textContent);
    if (text?.includes(typeName)) {
      // the actual click button is on the previous sibling div
      const parent = await typeNode.evaluateHandle(el => el.parentElement);
      if (parent) {
        const expandButton = await (parent as import('puppeteer').ElementHandle<Element>).$('.fcb-directory-expand-button');
        if (expandButton) {
          await expandButton.click();
        }
      }
      break;
    }
  }
};