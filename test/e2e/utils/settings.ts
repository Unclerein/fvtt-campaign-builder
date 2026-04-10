import { sharedContext } from '../sharedContext';
import { Topics, ValidTopic } from '@/types';
import { Locator, getByTestId } from '../helpers';

export const switchToSetting = async (settingName: string) => {
  const page = sharedContext.page!;

  // Debug: Check what's in the DOM
  const settingSelectExists = await page.$('[data-testid="setting-select"]');

  if (!settingSelectExists) {
    // If no setting select, there might be only one setting - check for setting folder directly
    const folderExists = await page.$(`[data-testid="setting-folder-${settingName}"]`);
    if (folderExists) {
      // Already on the right setting
      return;
    }
    // Wait a bit and try again
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Wait for setting select to be visible (it only appears when there are multiple settings)
  await page.waitForSelector('[data-testid="setting-select"]', { timeout: 10000 });

  // Click the setting select dropdown
  await getByTestId(page, 'setting-select').click();
  
  // Wait for PrimeVue dropdown portal to render (it's attached to body, not the component)
  await page.waitForSelector('.p-select-list-container', { timeout: 5000 });
  
  // Small delay for options to populate
  await new Promise(resolve => setTimeout(resolve, 100));
  
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
  await page.waitForSelector(`[data-testid="setting-folder-${settingName}"]`, { timeout: 5000 });
  
  // Wait for topic folders to load
  await page.waitForSelector('.fcb-topic-folder', { timeout: 5000 });
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

  // Small delay for DOM to update after topic expansion
  await new Promise(resolve => setTimeout(resolve, 100));

  // Find type nodes within the topic folder
  const topicFolder = await page.$(`.fcb-topic-folder[data-topic="${topic}"]`);
  if (!topicFolder) {
    return;
  }

  // Find the type node with the type name (uses .fcb-directory-type class)
  // Structure is: <div class="summary top"><div class="fcb-directory-expand-button">+/-</div><div class="fcb-directory-type">name</div></div>
  const typeNodes = await topicFolder.$$('.fcb-directory-type');
  
  // Log all type node texts first
  const typeTexts = await Promise.all(typeNodes.map(n => n.evaluate(el => el.textContent)));
  
  for (const typeNode of typeNodes) {
    const text = await typeNode.evaluate(el => el.textContent);
    if (text?.includes(typeName)) {
      // The expand button is a previous sibling within the same parent
      const expandButton = await typeNode.evaluateHandle(el => el.previousElementSibling);
      if (expandButton) {
        const btnText = await (expandButton as import('puppeteer').ElementHandle<Element>).evaluate(el => el.textContent);
        // Only click if it shows '+' (collapsed)
        if (btnText?.includes('+')) {
          await (expandButton as import('puppeteer').ElementHandle<Element>).click();
          // Wait for entries to appear
          await page.waitForSelector('.fcb-directory-entry', { timeout: 5000 });
        }
      }
      // Wait for all entries to load (Vue reactivity)
      await new Promise(resolve => setTimeout(resolve, 300));
      break;
    }
  }
};