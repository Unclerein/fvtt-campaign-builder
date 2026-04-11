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

### Run Tests

```bash
npm test
```

This launches a visible Chrome window using swiftshader for WebGL compatibility. Foundry will show a warning about no hardware acceleration - this is expected and doesn't affect testing.

## Configuration

Config is in `test/e2e/utils/config.ts`. Key settings:

| Setting | Default | Description |
|---------|---------|-------------|
| `viewportWidth` | `1920` | Viewport width |
| `viewportHeight` | `1080` | Viewport height |
| `executablePath` | auto-detected | Path to Chrome/Chromium |

Environment variables (in `.env` or set in CLI):

| Variable | Description |
|----------|-------------|
| `FVTT_ADMIN_PASSWORD` | Admin password for setup page |
| `FVTT_URL` | Foundry URL (default: `http://localhost:30000`) |
| `FVTT_GM_USER` | GM username (default: `Gamemaster`) |
| `FVTT_WORLDID` | World ID to select |
| `FVTT_BROWSER_PATH` | Override browser executable path |

## Timeout Guidelines

**Do not increase timeouts past 10 seconds.** If tests are timing out, the issue is not slowness - it's a real problem that needs investigation. Long timeouts mask real issues and slow down the test-debug cycle.

## Files

- `index.ts` - Main exports (re-exports from `test/e2e/utils/` and `utils/ui.ts`)
- `utils/ui.ts` - Generic UI helpers (agent-only)

The following files live in `test/e2e/utils/` and are shared with the e2e test suite:
- `test/e2e/utils/config.ts` - Configuration
- `test/e2e/utils/browser.ts` - Browser launch/connect/disconnect
- `test/e2e/utils/foundry.ts` - Foundry navigation, state detection
- `test/e2e/utils/campaignBuilder.ts` - Campaign Builder interactions

## Troubleshooting

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

For quick scripts when already in-game:

```typescript
import puppeteer from 'puppeteer';
import { config } from './test/e2e/utils/config';

const browser = await puppeteer.launch({
  headless: false,
  executablePath: config.executablePath,
  args: ['--enable-features=VaapiVideoDecoder', '--ignore-gpu-blocklist'],
  ignoreDefaultArgs: ['--disable-gpu'],
});
const page = (await browser.pages())[0];

await page.setViewport({ width: config.viewportWidth, height: config.viewportHeight });

// Navigate to Foundry and open Campaign Builder...

await browser.close();
```
