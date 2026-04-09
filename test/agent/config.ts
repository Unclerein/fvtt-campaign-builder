/**
 * Configuration for Puppeteer agent tooling
 */

import { config as dotenvConfig } from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from project root
dotenvConfig({ path: path.resolve(__dirname, '../../.env') });

/** Browser mode - controls how Puppeteer connects to the browser */
export type BrowserMode = 'headless' | 'headed' | 'attach';

/** Foundry states that can be detected */
export type FoundryState = 'game' | 'login' | 'worldSelection' | 'setup' | 'unknown';

/** Configuration options */
export interface AgentConfig {
  /** Foundry URL */
  foundryUrl: string;
  /** GM username for login */
  user: string;
  /** World ID (used if on world selection page) */
  worldId: string;
  /** Admin password for setup page */
  adminPassword: string;
  /** Browser mode: headless, headed, or attach */
  browserMode: BrowserMode;
  /** Port for remote debugging (used in attach mode) */
  debuggingPort: number;
  /**
   * Host for remote debugging connection.
   * In WSL2, Windows localhost isn't directly accessible, so use 'host.docker.internal'
   * or the Windows host IP. Defaults to 'localhost' for non-WSL environments.
   */
  browserHost: string;
  /** Viewport width */
  viewportWidth: number;
  /** Viewport height */
  viewportHeight: number;
  /**
   * Path to browser executable.
   * In WSL, use Windows Edge instead of WSL's default browser for better
   * WebGL support and compatibility with Foundry VTT.
   */
  executablePath: string;
}

/** Default configuration - can be overridden via environment variables */
export const config: AgentConfig = {
  foundryUrl: process.env.FVTT_URL || 'http://localhost:30000',
  user: process.env.FVTT_GM_USER || 'Gamemaster',
  worldId: process.env.FVTT_WORLDID || 'campaignbuildertest',
  adminPassword: process.env.FVTT_ADMIN_PASSWORD || '',
  browserMode: (process.env.BROWSER_MODE as BrowserMode) || 'headless',
  debuggingPort: 9222,
  browserHost: process.env.FVTT_BROWSER_HOST || 'localhost',
  viewportWidth: 1920,
  viewportHeight: 1080,
  executablePath: process.env.FVTT_BROWSER_PATH || '/usr/bin/google-chrome',
};
