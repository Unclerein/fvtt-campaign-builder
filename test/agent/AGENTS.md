# Puppeteer Agent Tooling

Browser automation for testing the Campaign Builder module in Foundry VTT.

## Setup (One-Time)

### 1. Install Google Chrome

```bash
# Ubuntu/Debian
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
sudo apt-get update && sudo apt-get install google-chrome-stable
```

### 2. Create .env File

Copy `.env.example` to `.env` and fill in values:

```env
FVTT_ADMIN_PASSWORD=your-admin-password
```

## Usage

### Run Tests (Headed Mode - Default)

```bash
npm test
```

This launches a visible Chrome window using swiftshader for WebGL compatibility. Foundry will show a warning about no hardware acceleration - this is expected and doesn't affect testing.

### Attach Mode (Optional)

For full hardware acceleration, connect to a Windows browser:

1. **Start Edge with remote debugging** (from Windows PowerShell):

```powershell
& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --remote-debugging-port=9222 --remote-debugging-address=0.0.0.0 --user-data-dir="C:\temp\foundry-edge"
```

2. **Run tests with attach mode:**

```bash
BROWSER_MODE=attach npm test
```

## Browser Modes

### Headed Mode (Default)

Uses ANGLE + swiftshader for software WebGL rendering. Works on both WSL2 and native Linux. No hardware acceleration, but sufficient for testing.

### Attach Mode (Optional)

Connects to a Windows browser via remote debugging. Provides full hardware acceleration. Requires:
- Windows portproxy setup (run `.\scripts\setup-debug-proxy.ps1` as Administrator)
- Edge running with `--remote-debugging-port=9222`

## Configuration

Config is in `test/agent/config.ts`. Key settings:

| Setting | Default | Description |
|---------|---------|-------------|
| `browserMode` | `headed` | Browser connection mode (`headed` or `attach`) |
| `browserHost` | auto-detected | Windows host IP (WSL2 gateway) |
| `debuggingPort` | `9222` | Remote debugging port |
| `viewportWidth` | `1920` | Viewport width |
| `viewportHeight` | `1080` | Viewport height |
| `executablePath` | auto-detected | Path to Chrome/Chromium |

Environment variables (in `.env`):

| Variable | Description |
|----------|-------------|
| `FVTT_ADMIN_PASSWORD` | Admin password for setup page |
| `FVTT_URL` | Foundry URL (default: `http://localhost:30000`) |
| `FVTT_GM_USER` | GM username (default: `Gamemaster`) |
| `FVTT_WORLDID` | World ID to select |
| `BROWSER_MODE` | Override browser mode (`headed` or `attach`) |
| `FVTT_BROWSER_HOST` | Override Windows host IP |
| `FVTT_BROWSER_PATH` | Override browser executable path |

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

### WebGL Errors (PIXI.js)

If you see `Cannot read properties of undefined (reading 'getExtension')`, WebGL isn't initializing. Headed mode uses swiftshader which should handle this. If using attach mode, ensure the Windows browser has hardware acceleration available.

### Connection Refused (Attach Mode)

1. Verify Edge is running with `--remote-debugging-port=9222`
2. Verify portproxy rule exists: `netsh interface portproxy show all`
3. Verify firewall rule exists: `Get-NetFirewallRule -DisplayName "Edge Remote Debug"`
4. Re-run `scripts/setup-debug-proxy.ps1` as Administrator

### Module Not Loading

Check browser console for errors. The module may have failed to initialize due to migration issues or missing dependencies.

### Viewport Resets to 800x600 After Reload (Attach Mode)

**Problem**: In attach mode, page reloads reset the viewport to Puppeteer's default 800x600.

**Solution**: The `launchBrowser()` helper includes a `framenavigated` listener that automatically re-applies the viewport after navigation.

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

## Quick Connection Pattern (Attach Mode)

For quick scripts when already in-game:

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

await browser.close(); 
```
