import { sharedContext } from '@e2etest/sharedContext';

const USER = process.env.FVTT_GM_USER || 'Gamemaster';
// const PASS = process.env.FVTT_GM_PASSWORD || '';
// const WORLDID = process.env.FVTT_WORLDID || 'campaignbuildertest';

export async function loginToWorld(){
  const page = sharedContext.page!;

  // because of the backup box that's inconsistent we start on join now
  // Go to http://localhost:30000/setup
  // await page.goto('http://localhost:30000/setup', { waitUntil: 'networkidle2' });

  // if (page.url() === 'http://localhost:30000/setup') {
  //   // sometimes there's a backup popup
  //   const backupHeader = page.locator('h3:has-text("Backups Overview")');

  //   if (await backupHeader.isVisible()) {
  //     await backupHeader.locator('..')
  //       .locator('a[role="button"]')
  //       .click({ force: true });
  //   }

  //   // open the world
  //   await page.locator(`[data-package-id="${WORLDID}"] a.play`).click();
  //   await page.waitForURL('http://localhost:30000/join');
  // } 

  await page.goto('http://localhost:30000/join', { waitUntil: 'networkidle2' });

  // Select user - need to find the option value for the user name
  const options = await page.$$('select[name="userid"] option');
  let userValue: string | null = null;
  for (const opt of options) {
    const text = await opt.evaluate(el => el.textContent);
    if (text?.trim() === USER) {
      userValue = await opt.evaluate(el => (el as HTMLOptionElement).value);
      break;
    }
  }
  
  if (userValue) {
    await page.select('select[name="userid"]', userValue);
  } else {
    throw new Error(`User "${USER}" not found in select options`);
  }

  // assume no password for now

  // Click Join Game Session button
  const buttons = await page.$$('button');
  let joinButton: import('puppeteer').ElementHandle<Element> | null = null;
  for (const btn of buttons) {
    const text = await btn.evaluate(el => el.textContent);
    if (text?.includes('Join Game Session')) {
      joinButton = btn;
      break;
    }
  }
  if (joinButton) {
    await Promise.all([
      page.waitForNavigation(),
      joinButton.click()
    ]);
  }

  // Wait for Foundry
  await page.waitForFunction(() => {
    return (game as any) && (game as any).ready;
  });

  // Disable tooltips during tests to prevent interference
  await page.evaluate(() => {
    (game as any).tooltip.activate = function() {};
  });

  //Wait for campaign builder to load
  await page.waitForFunction(() => {
    return !!(jQuery as any) && (jQuery as any)('#fcb-launch').length > 0;
  });
}

export async function openCampaignBuilder(){
  const page = sharedContext.page!;

  // click on the button
  const openButton = await page.$('#fcb-launch');
  if (openButton) {
    await openButton.click();
  }

  // wait for the window
  await page.waitForSelector('.fcb-main-window', { visible: true });
}

export async function initializeWorld(){
  const page = sharedContext.page!;

  // lets delete all the settings...
  await page.evaluate(async () => {
    return await (game as any).modules.get('campaign-builder')!.api!.testAPI!.resetAll();
  });
  
  console.log(`World reset`);
}