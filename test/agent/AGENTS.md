# Puppeteer Agent Tooling

Browser automation for testing the Campaign Builder module in Foundry VTT.

## Setup (One-Time)

### 1. Run Windows Portproxy Setup

From an elevated PowerShell (run as Administrator):

```powershell
# From the repo root
.\scripts\setup-debug-proxy.ps1
```

This creates:
- Portproxy rule to forward `0.0.0.0:9222` to `127.0.0.1:9222`
- Firewall rule to allow inbound connections on port 9222

Both rules persist across reboots.

### 2. Create .env File

Copy `.env.example` to `.env` and fill in values:

```env
FVTT_ADMIN_PASSWORD=your-admin-password
```

## Usage

### Launch Edge with Remote Debugging

From Windows PowerShell:

```powershell
& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --remote-debugging-port=9222 --user-data-dir="C:\temp\foundry-edge"
```

Then:
1. Navigate to Foundry (`http://localhost:30000`)
2. Log in and select your world (optional--the test can do it too)
3. Keep this browser window open

### Run Puppeteer Agent

From WSL2:

```typescript
import { launchBrowser, navigateToGame, openCampaignBuilder } from './test/agent';

const { page, browser } = await launchBrowser({ refresh: true });
await navigateToGame(page);
await openCampaignBuilder(page);
// ... interact with module
await browser.disconnect(); // keeps browser running
```

## Why Attach Mode?

WSL2 has limitations that make headless/headed modes problematic:

- **WebGL/PIXI issues**: WSL2's software WebGL (swiftshader) has poor performance with PIXI.js, causing GPU stalls and graphical errors
- **Network isolation**: Windows localhost isn't directly accessible from WSL2
- **Hardware acceleration**: Foundry VTT requires hardware acceleration for proper rendering

Attach mode connects to a Windows browser that has full hardware acceleration and proper WebGL support.

## Configuration

Config is in `test/agent/config.ts`. Key settings:

| Setting | Default | Description |
|---------|---------|-------------|
| `browserMode` | `attach` | Browser connection mode |
| `browserHost` | auto-detected | Windows host IP (WSL2 gateway) |
| `debuggingPort` | `9222` | Remote debugging port |
| `viewportWidth` | `1920` | Viewport width |
| `viewportHeight` | `1080` | Viewport height |

Environment variables (in `.env`):

| Variable | Description |
|----------|-------------|
| `FVTT_ADMIN_PASSWORD` | Admin password for setup page |
| `FVTT_URL` | Foundry URL (default: `http://localhost:30000`) |
| `FVTT_GM_USER` | GM username (default: `Gamemaster`) |
| `FVTT_WORLDID` | World ID to select |
| `BROWSER_MODE` | Override browser mode |
| `FVTT_BROWSER_HOST` | Override Windows host IP |

## Timeout Guidelines

**Do not increase timeouts past 10 seconds.** If tests are timing out, the issue is not slowness - it's a real problem that needs investigation. Long timeouts mask real issues and slow down the test-debug cycle.

## Files

- `config.ts` - Configuration
- `utils/browser.ts` - Browser launch/connect/disconnect
- `utils/foundry.ts` - Foundry navigation, state detection
- `utils/module.ts` - Campaign Builder interactions
- `utils/ui.ts` - Generic UI helpers
- `index.ts` - Main exports

## Troubleshooting

### Connection Refused

1. Verify Edge is running with `--remote-debugging-port=9222`
2. Verify portproxy rule exists: `netsh interface portproxy show all`
3. Verify firewall rule exists: `Get-NetFirewallRule -DisplayName "Edge Remote Debug"`
4. Re-run `scripts/setup-debug-proxy.ps1` as Administrator


### Module Not Loading

Check browser console for errors. The module may have failed to initialize due to migration issues or missing dependencies.

### Viewport Resets to 800x600 After Reload

**Problem**: In attach mode, page reloads (via `page.reload()`, `page.goto()`, or navigation) reset the viewport to Puppeteer's default 800x600, even if you previously set it to 1920x1080.

**Root Cause**: When connected to an existing browser, Puppeteer doesn't control the browser's default viewport. After any navigation, Puppeteer resets to its internal default.

**Solution**: The `launchBrowser()` helper now includes a `framenavigated` listener that automatically re-applies the viewport after navigation. Using `launchBrowser()` should keep the viewport at the configured size.

For direct connection (bypassing the helper), manually re-apply after navigation:

```typescript
await page.reload({ waitUntil: 'networkidle2' });
await page.setViewport({ width: 1920, height: 1080 });
```

### Extracting Text from Elements with Icons

Many UI elements contain nested `<i>` icons. To get just the text:

```typescript
const text = await page.evaluate(() => {
  const el = document.querySelector('.some-element');
  return Array.from(el.childNodes)
    .filter(n => n.nodeType === Node.TEXT_NODE)
    .map(n => n.textContent?.trim())
    .join('')
    .trim();
});
```

## Quick Connection Pattern

For quick scripts when already in-game (avoids viewport issues):

```typescript
import puppeteer from 'puppeteer';
import { config } from './test/agent/config';

const browser = await puppeteer.connect({
  browserURL: `http://${config.browserHost}:${config.debuggingPort}`,
});
const page = (await browser.pages())[0];

// Open Campaign Builder if not already open
if (!(await page.$('.fcb-main-window'))) {
  await page.click('#fcb-launch');
  await page.waitForSelector('.fcb-main-window', { visible: true });
}

// ... interact with UI ...

await browser.disconnect(); // Keeps browser running
```
