/**
 * Search component tests.
 * Tests search input, results display, and navigation.
 */

import { describe, test, beforeAll, afterAll, expect, runTests } from '../testRunner';
import { sharedContext } from '@e2etest/sharedContext';
import { testData } from '@e2etest/data';
import { ensureSetup } from '../ensureSetup';
import { switchToSetting } from '@e2etest/utils';
import { getByTestId, Locator } from '../helpers';

/**
 * Helper delay function.
 */
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Gets the search input element.
 */
const getSearchInput = async (): Promise<boolean> => {
  const page = sharedContext.page!;
  const input = await page.$('[data-testid="search-input"], .fcb-search-input');
  return input !== null;
};

/**
 * Types in the search input.
 */
const typeInSearch = async (text: string): Promise<void> => {
  const page = sharedContext.page!;
  
  // Find and clear the input
  const input = await page.$('[data-testid="search-input"], .fcb-search-input');
  if (input) {
    await input.click();
    await input.evaluate(el => { (el as HTMLInputElement).value = ''; });
    
    // Type the text
    for (const char of text) {
      await page.keyboard.type(char);
    }
    
    // Wait for debounce
    await delay(300);
  }
};

/**
 * Clears the search input.
 */
const clearSearch = async (): Promise<void> => {
  const page = sharedContext.page!;
  
  const input = await page.$('[data-testid="search-input"], .fcb-search-input');
  if (input) {
    await input.click();
    await input.evaluate(el => { (el as HTMLInputElement).value = ''; });
    await page.keyboard.press('Escape');
    await delay(100);
  }
};

/**
 * Gets the search results.
 */
const getSearchResults = async (): Promise<number> => {
  const page = sharedContext.page!;
  const results = await page.$$('.fcb-search-result');
  return results.length;
};

/**
 * Checks if search results are visible.
 */
const areResultsVisible = async (): Promise<boolean> => {
  const page = sharedContext.page!;
  const results = await page.$('.fcb-search-results');
  return results !== null;
};

/**
 * Gets the selected result index.
 */
const getSelectedResultIndex = async (): Promise<number> => {
  const page = sharedContext.page!;
  const results = await page.$$('.fcb-search-result');
  
  for (let i = 0; i < results.length; i++) {
    const isSelected = await results[i].evaluate(el => el.classList.contains('fcb-search-result-selected'));
    if (isSelected) {
      return i;
    }
  }
  
  return -1;
};

/**
 * Clicks a search result by index.
 */
const clickSearchResult = async (index: number): Promise<void> => {
  const page = sharedContext.page!;
  const results = await page.$$('.fcb-search-result');
  
  if (index >= 0 && index < results.length) {
    await results[index].click();
    await delay(300);
  }
};

describe.serial('Search Component Tests', () => {
  beforeAll(async () => {
    await ensureSetup(false);
    const setting = testData.settings[0];
    await switchToSetting(setting.name);
  });

  test('Search input is visible', async () => {
    const hasInput = await getSearchInput();
    expect(hasInput).toBe(true);
  });

  test('Search input has placeholder', async () => {
    const page = sharedContext.page!;
    const input = await page.$('[data-testid="search-input"], .fcb-search-input');
    
    if (input) {
      const placeholder = await input.evaluate(el => (el as HTMLInputElement).placeholder);
      expect(placeholder.length).toBeGreaterThan(0);
    }
  });

  test('Type in search input', async () => {
    await typeInSearch('test');
    
    const page = sharedContext.page!;
    const input = await page.$('[data-testid="search-input"], .fcb-search-input');
    
    if (input) {
      const value = await input.evaluate(el => (el as HTMLInputElement).value);
      expect(value).toBe('test');
    }
    
    await clearSearch();
  });

  test('Search with 3 characters shows results', async () => {
    // Use a search term that should match something
    const setting = testData.settings[0];
    const characters = setting.topics[1]; // Topics.Character
    
    if (characters && characters.length > 0) {
      // Search for first character name (partial)
      const searchTerm = characters[0].name.substring(0, 3);
      await typeInSearch(searchTerm);
      
      // Wait for results to appear
      await delay(500);
      
      const isVisible = await areResultsVisible();
      expect(isVisible).toBe(true);
    }
    
    await clearSearch();
  });

  test('Search results contain matching entries', async () => {
    const setting = testData.settings[0];
    const characters = setting.topics[1]; // Topics.Character
    
    if (characters && characters.length > 0) {
      const searchTerm = characters[0].name.substring(0, 3);
      await typeInSearch(searchTerm);
      
      await delay(500);
      
      const resultCount = await getSearchResults();
      expect(resultCount).toBeGreaterThan(0);
    }
    
    await clearSearch();
  });

  test('Arrow down selects next result', async () => {
    const setting = testData.settings[0];
    const characters = setting.topics[1];
    
    if (characters && characters.length > 0) {
      const searchTerm = characters[0].name.substring(0, 3);
      await typeInSearch(searchTerm);
      
      await delay(500);
      
      const resultCount = await getSearchResults();
      if (resultCount > 0) {
        // Press arrow down
        const page = sharedContext.page!;
        await page.keyboard.press('ArrowDown');
        await delay(100);
        
        const selectedIndex = await getSelectedResultIndex();
        expect(selectedIndex).toBe(0);
      }
    }
    
    await clearSearch();
  });

  test('Arrow up selects previous result', async () => {
    const setting = testData.settings[0];
    const characters = setting.topics[1];
    
    if (characters && characters.length > 0) {
      const searchTerm = characters[0].name.substring(0, 3);
      await typeInSearch(searchTerm);
      
      await delay(500);
      
      const resultCount = await getSearchResults();
      if (resultCount > 1) {
        const page = sharedContext.page!;
        
        // Press arrow down twice
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await delay(100);
        
        // Press arrow up
        await page.keyboard.press('ArrowUp');
        await delay(100);
        
        const selectedIndex = await getSelectedResultIndex();
        expect(selectedIndex).toBe(0);
      }
    }
    
    await clearSearch();
  });

  test('Escape closes results', async () => {
    const setting = testData.settings[0];
    const characters = setting.topics[1];
    
    if (characters && characters.length > 0) {
      const searchTerm = characters[0].name.substring(0, 3);
      await typeInSearch(searchTerm);
      
      await delay(500);
      
      // Press escape
      const page = sharedContext.page!;
      await page.keyboard.press('Escape');
      await delay(100);
      
      const isVisible = await areResultsVisible();
      expect(isVisible).toBe(false);
    }
    
    await clearSearch();
  });

  test('Click result opens entry', async () => {
    const setting = testData.settings[0];
    const characters = setting.topics[1];
    
    if (characters && characters.length > 0) {
      const searchTerm = characters[0].name.substring(0, 3);
      await typeInSearch(searchTerm);
      
      await delay(500);
      
      const resultCount = await getSearchResults();
      if (resultCount > 0) {
        // Click first result
        await clickSearchResult(0);
        
        // Verify content opened
        const page = sharedContext.page!;
        const content = await page.$('.fcb-name-header, .fcb-content-wrapper');
        expect(content).not.toBeNull();
      }
    }
    
    await clearSearch();
  });

  test('Search icon is visible', async () => {
    const page = sharedContext.page!;
    const icon = await page.$('.fcb-search-icon');
    expect(icon).not.toBeNull();
  });

  test('Clear search input', async () => {
    await typeInSearch('test');
    
    const page = sharedContext.page!;
    const input = await page.$('[data-testid="search-input"], .fcb-search-input');
    
    if (input) {
      let value = await input.evaluate(el => (el as HTMLInputElement).value);
      expect(value).toBe('test');
      
      await clearSearch();
      
      value = await input.evaluate(el => (el as HTMLInputElement).value);
      expect(value).toBe('');
    }
  });
});

// Note: runTests() is called by the main runner (all.test.ts)
