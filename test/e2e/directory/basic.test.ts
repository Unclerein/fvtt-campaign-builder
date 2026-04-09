import { describe, test, beforeAll, afterAll, expect, runTests } from '../testRunner';
import { sharedContext } from '@e2etest/sharedContext';
import { testData } from '@e2etest/data';
import { ensureSetup } from '../ensureSetup';
import { expandTopicNode, expandTypeNode, switchToSetting } from '@e2etest/utils';
import { Topics, ValidTopic } from '@/types';
import { getByTestId } from '../helpers';

describe.serial('Basic Directory functions', () => {
	beforeAll(async () => {
		// Ensure setup is done with test data populated
		await ensureSetup(true);
		
		const setting = testData.settings[0];

		// pick the right setting
		await switchToSetting(setting.name);

		// close the tabs?
	});

	test('Expand entry folders', async () => {
		const page = sharedContext.page!;
		const setting = testData.settings[0];

		// make sure everything closed to start, just in case
		await getByTestId(page, 'collapse-all-button').click();

		// Wait for the collapse to complete
		await page.waitForSelector('.fcb-topic-folder.collapsed');

		// make sure the 1st topic isn't visible (check visibility, not just DOM presence)
		const found = await page.evaluate((entryName: string) => {
			const entries = Array.from(document.querySelectorAll('.fcb-directory-entry'));
			return entries.some(el => {
				// Check if visible (not hidden by collapsed parent)
				const style = window.getComputedStyle(el);
				const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
				return isVisible && el.textContent?.includes(entryName);
			});
		}, setting.topics[Topics.Character][0].name);
		expect(found).toBe(false);

		// open each folder and make sure the 1st node is visible
		for (const topicKey in setting.topics) {
			const topic = Number.parseInt(topicKey) as ValidTopic;
			await expandTopicNode(topic);

			// for characters, we need to expand the 'none' folder first
			if (topic === Topics.Character) {
				await expandTypeNode(topic, '(none)');
			}

			const topicEntries = setting.topics[topic];
			await page.waitForSelector('.fcb-directory-entry');
			
			// Verify the entry is visible
			const entriesAfter = await page.$$('.fcb-directory-entry');
			let entryFound = false;
			for (const entry of entriesAfter) {
				const text = await entry.evaluate(el => el.textContent);
				if (text?.includes(topicEntries[0].name)) {
					entryFound = true;
					break;
				}
			}
			expect(entryFound).toBe(true);
		}

		// also check collapse all
		await getByTestId(page, 'collapse-all-button').click();

		// make sure the 1st topic isn't visible (check visibility, not just DOM presence)
		const foundAfterCollapse = await page.evaluate((entryName: string) => {
			const entries = Array.from(document.querySelectorAll('.fcb-directory-entry'));
			return entries.some(el => {
				// Check if visible (not hidden by collapsed parent)
				const style = window.getComputedStyle(el);
				const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
				return isVisible && el.textContent?.includes(entryName);
			});
		}, setting.topics[Topics.Character][0].name);
		expect(foundAfterCollapse).toBe(false);
	});

	test('Expand campaign folders', async () => {
		// also check collapse all
	});

	test('Open a setting', async () => {
	});

	test('Open a character', async () => {
	});

	test('Open a location', async () => {
	});

	test('Open a organization', async () => {
	});

	test('Open a PC', async () => {
	});

	test('Open a campaign', async () => {
	});

	test('Open a session', async () => {
	});

		
	// runCampaignTests(page);

	// identify the priorities (data existing and saving and changing) and list the others but don't build for now
	// settings - change name; edit all the fields and make sure they stick (switch between settings to reload)
	// campaigns - create, add sessions, change name and check that it changes 
	// sessions - create; check renumbering; change name and check that it changes everywhere
	// entries - change name and check that it changes everywhere
	// ensure we can close and reopen the main window and that all the tabs are preserved
	// header - make sure bookmarks work, forward/back buttons, close tab controls
	// check the compendium folder structure and contents and that you
	//    can open each content type from there


	afterAll(async () => {
		// In attach mode, disconnect from browser instead of closing it
		if (sharedContext.context) {
			try {
				await sharedContext.context.disconnect();
			} catch {
				// Ignore disconnect errors
			}
		}
	});
});

// Run tests after file is fully loaded
runTests().then(passed => {
	process.exit(passed ? 0 : 1);
});
