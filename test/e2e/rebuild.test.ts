// resets the world and then repopulates with the setup test data

import { describe, test, beforeAll, afterAll } from './testRunner';
import { sharedContext } from './sharedContext';
import { populateSetting } from './setup';
import { testData } from './data';
import { ensureSetup } from './ensureSetup';

// Step functions are imported from separate files for organization

beforeAll(async () => {
	// the initialization of everything could take a while
	await ensureSetup(true);
});

describe.serial('Setup', () => {
	test('Populate Settings', async () => {
		await populateSetting(testData.settings[0]);
		await populateSetting(testData.settings[1]);
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
