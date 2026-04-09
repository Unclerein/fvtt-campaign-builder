/**
 * Puppeteer helper utilities that provide Playwright-like API.
 */

import type { Page, ElementHandle } from 'puppeteer';

/**
 * Locator class that wraps Puppeteer ElementHandle with Playwright-like API.
 */
export class Locator<T extends Element = Element> {
  protected page: Page;
  protected selector: string;
  protected parent?: ElementHandle<Element>;

  constructor(
    page: Page,
    selector: string,
    parent?: ElementHandle<Element>
  ) {
    this.page = page;
    this.selector = selector;
    this.parent = parent;
  }

  /**
   * Get the element handle(s).
   */
  protected async getHandle(): Promise<ElementHandle<T> | null> {
    if (this.parent) {
      return this.parent.$(this.selector) as Promise<ElementHandle<T> | null>;
    }
    return this.page.$(this.selector) as Promise<ElementHandle<T> | null>;
  }

  protected async getHandles(): Promise<ElementHandle<T>[]> {
    if (this.parent) {
      return this.parent.$$(this.selector) as Promise<ElementHandle<T>[]>;
    }
    return this.page.$$(this.selector) as Promise<ElementHandle<T>[]>;
  }

  /**
   * Click the element.
   */
  async click(options?: { force?: boolean; button?: 'left' | 'right' | 'middle' }): Promise<void> {
    const handle = await this.getHandle();
    if (!handle) {
      throw new Error(`Element not found: ${this.selector}`);
    }
    
    if (options?.button === 'right') {
      // Right-click using evaluate
      await handle.evaluate((el) => {
        el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
      });
    } else {
      await handle.click();
    }
  }

  /**
   * Fill an input element.
   */
  async fill(value: string): Promise<void> {
    const handle = await this.getHandle();
    if (!handle) {
      throw new Error(`Element not found: ${this.selector}`);
    }
    
    // Clear and fill
    await handle.evaluate((el: Element) => {
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        el.value = '';
      }
    });
    await handle.type(value);
  }

  /**
   * Type into an element.
   */
  async type(text: string): Promise<void> {
    const handle = await this.getHandle();
    if (!handle) {
      throw new Error(`Element not found: ${this.selector}`);
    }
    await handle.type(text);
  }

  /**
   * Get the count of matching elements.
   */
  async count(): Promise<number> {
    const handles = await this.getHandles();
    return handles.length;
  }

  /**
   * Get the first matching element.
   */
  first(): Locator<T> {
    return new FirstLocator(this.page, this.selector, this.parent);
  }

  /**
   * Filter elements by text content.
   */
  filter(options: { hasText: string | RegExp }): Locator<T> {
    return new FilteredLocator(this.page, this.selector, options.hasText, this.parent);
  }

  /**
   * Check if element is visible.
   */
  async isVisible(): Promise<boolean> {
    const handle = await this.getHandle();
    if (!handle) return false;
    
    return handle.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    });
  }

  /**
   * Check if element is attached to DOM.
   */
  async isAttached(): Promise<boolean> {
    const handle = await this.getHandle();
    return handle !== null;
  }

  /**
   * Wait for element to be visible.
   */
  async waitFor(options?: { timeout?: number }): Promise<void> {
    await this.page.waitForSelector(this.selector, {
      visible: true,
      timeout: options?.timeout ?? 30000,
    });
  }

  /**
   * Wait for element to be attached to DOM.
   */
  async waitForAttached(options?: { timeout?: number }): Promise<void> {
    await this.page.waitForSelector(this.selector, {
      timeout: options?.timeout ?? 30000,
    });
  }

  /**
   * Get text content.
   */
  async textContent(): Promise<string | null> {
    const handle = await this.getHandle();
    if (!handle) return null;
    return handle.evaluate((el) => el.textContent);
  }

  /**
   * Get inner text.
   */
  async innerText(): Promise<string> {
    const handle = await this.getHandle();
    if (!handle) throw new Error(`Element not found: ${this.selector}`);
    return handle.evaluate((el: Element) => {
      if (el instanceof HTMLElement) {
        return el.innerText;
      }
      return '';
    });
  }

  /**
   * Get attribute value.
   */
  async getAttribute(name: string): Promise<string | null> {
    const handle = await this.getHandle();
    if (!handle) return null;
    return handle.evaluate((el, attr) => el.getAttribute(attr), name);
  }

  /**
   * Get value of input/textarea.
   */
  async inputValue(): Promise<string> {
    const handle = await this.getHandle();
    if (!handle) throw new Error(`Element not found: ${this.selector}`);
    return handle.evaluate((el: Element) => {
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
        return el.value;
      }
      return '';
    });
  }

  /**
   * Check if element is checked.
   */
  async isChecked(): Promise<boolean> {
    const handle = await this.getHandle();
    if (!handle) return false;
    return handle.evaluate((el: Element) => {
      if (el instanceof HTMLInputElement) {
        return el.checked;
      }
      return false;
    });
  }

  /**
   * Check if element has a specific class.
   */
  async hasClass(className: string): Promise<boolean> {
    const handle = await this.getHandle();
    if (!handle) return false;
    return handle.evaluate((el, cls) => el.classList.contains(cls), className);
  }

  /**
   * Select an option in a select element.
   */
  async selectOption(value: string): Promise<void> {
    const handle = await this.getHandle();
    if (!handle) throw new Error(`Element not found: ${this.selector}`);
    await handle.select(value);
  }

  /**
   * Focus the element.
   */
  async focus(): Promise<void> {
    const handle = await this.getHandle();
    if (!handle) throw new Error(`Element not found: ${this.selector}`);
    await handle.focus();
  }

  /**
   * Get a nested locator.
   */
  locator(selector: string): Locator {
    // Get parent handle synchronously by creating a new locator that will resolve it
    return new NestedLocator(this.page, selector, this);
  }

  /**
   * Evaluate a function in the context of the element.
   */
  async evaluate<R>(fn: (el: T) => R): Promise<R> {
    const handle = await this.getHandle();
    if (!handle) throw new Error(`Element not found: ${this.selector}`);
    return handle.evaluate(fn);
  }

  /**
   * Hover over the element.
   */
  async hover(): Promise<void> {
    const handle = await this.getHandle();
    if (!handle) throw new Error(`Element not found: ${this.selector}`);
    await handle.hover();
  }
}

/**
 * Locator for nested elements.
 */
class NestedLocator extends Locator {
  private parentLocator: Locator;

  constructor(page: Page, selector: string, parentLocator: Locator) {
    super(page, selector);
    this.parentLocator = parentLocator;
  }

  protected override async getHandle(): Promise<ElementHandle<Element> | null> {
    const parentHandle = await this.parentLocator['getHandle']();
    if (!parentHandle) return null;
    return parentHandle.$(this['selector']) as Promise<ElementHandle<Element> | null>;
  }

  protected override async getHandles(): Promise<ElementHandle<Element>[]> {
    const parentHandle = await this.parentLocator['getHandle']();
    if (!parentHandle) return [];
    return parentHandle.$$(this['selector']) as Promise<ElementHandle<Element>[]>;
  }
}

/**
 * Locator that returns the first matching element.
 */
class FirstLocator<T extends Element = Element> extends Locator<T> {
  private baseSelector: string;
  private baseParent?: ElementHandle<Element>;

  constructor(
    page: Page,
    selector: string,
    parent?: ElementHandle<Element>
  ) {
    super(page, selector, parent);
    this.baseSelector = selector;
    this.baseParent = parent;
  }

  protected override async getHandle(): Promise<ElementHandle<T> | null> {
    const handles = await this.getHandles();
    return handles[0] || null;
  }

  protected override async getHandles(): Promise<ElementHandle<T>[]> {
    if (this.baseParent) {
      return this.baseParent.$$(this.baseSelector) as Promise<ElementHandle<T>[]>;
    }
    return this.page.$$(this.baseSelector) as Promise<ElementHandle<T>[]>;
  }
}

/**
 * Locator that filters by text content.
 */
class FilteredLocator<T extends Element = Element> extends Locator<T> {
  private textFilter: string | RegExp;
  private baseSelector: string;
  private baseParent?: ElementHandle<Element>;

  constructor(
    page: Page,
    selector: string,
    textFilter: string | RegExp,
    parent?: ElementHandle<Element>
  ) {
    super(page, selector, parent);
    this.textFilter = textFilter;
    this.baseSelector = selector;
    this.baseParent = parent;
  }

  private async getAllHandles(): Promise<ElementHandle<T>[]> {
    if (this.baseParent) {
      return this.baseParent.$$(this.baseSelector) as Promise<ElementHandle<T>[]>;
    }
    return this.page.$$(this.baseSelector) as Promise<ElementHandle<T>[]>;
  }

  private async getFilteredHandle(): Promise<ElementHandle<T> | null> {
    const handles = await this.getAllHandles();
    
    for (const handle of handles) {
      const text = await handle.evaluate((el) => el.textContent || '');
      if (typeof this.textFilter === 'string') {
        if (text.includes(this.textFilter)) {
          return handle as ElementHandle<T>;
        }
      } else {
        if (this.textFilter.test(text)) {
          return handle as ElementHandle<T>;
        }
      }
    }
    return null;
  }

  private async getFilteredHandles(): Promise<ElementHandle<T>[]> {
    const handles = await this.getAllHandles();
    const filtered: ElementHandle<T>[] = [];
    
    for (const handle of handles) {
      const text = await handle.evaluate((el) => el.textContent || '');
      if (typeof this.textFilter === 'string') {
        if (text.includes(this.textFilter)) {
          filtered.push(handle as ElementHandle<T>);
        }
      } else {
        if (this.textFilter.test(text)) {
          filtered.push(handle as ElementHandle<T>);
        }
      }
    }
    return filtered;
  }

  override async click(options?: { force?: boolean; button?: 'left' | 'right' | 'middle' }): Promise<void> {
    const handle = await this.getFilteredHandle();
    if (!handle) throw new Error(`Element not found with text: ${this.textFilter}`);
    
    if (options?.button === 'right') {
      await handle.evaluate((el) => {
        el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
      });
    } else {
      await handle.click();
    }
  }

  override async count(): Promise<number> {
    return (await this.getFilteredHandles()).length;
  }

  override async isVisible(): Promise<boolean> {
    const handle = await this.getFilteredHandle();
    if (!handle) return false;
    return handle.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }

  override async isAttached(): Promise<boolean> {
    return (await this.getFilteredHandle()) !== null;
  }
}

/**
 * Page helpers - functions that extend Puppeteer Page with Playwright-like methods.
 */

/**
 * Create a locator for a selector.
 */
export function locator(page: Page, selector: string): Locator {
  return new Locator(page, selector);
}

/**
 * Get element by test ID.
 */
export function getByTestId(page: Page, testId: string): Locator {
  return new Locator(page, `[data-testid="${testId}"]`);
}

/**
 * Get element by text content.
 */
export function getByText(page: Page, text: string | RegExp): Locator {
  // Use XPath for text-based selection
  if (typeof text === 'string') {
    return new Locator(page, `//*[contains(text(), "${text}")]`);
  }
  return new Locator(page, `//*[contains(text(), "")]`);
}

/**
 * Get element by role.
 */
export function getByRole(page: Page, role: string, options?: { name?: string | RegExp }): Locator {
  let selector = `[role="${role}"]`;
  if (options?.name) {
    // This will be filtered later
    return new FilteredLocator(page, selector, options.name);
  }
  return new Locator(page, selector);
}

/**
 * Assertion helpers for Locators.
 */
export const locatorAssertions = {
  async toBeVisible(loc: Locator): Promise<void> {
    if (!(await loc.isVisible())) {
      throw new Error(`Expected element to be visible`);
    }
  },

  async toBeAttached(loc: Locator): Promise<void> {
    if (!(await loc.isAttached())) {
      throw new Error(`Expected element to be attached`);
    }
  },

  async toHaveCount(loc: Locator, expected: number): Promise<void> {
    const count = await loc.count();
    if (count !== expected) {
      throw new Error(`Expected count ${expected} but got ${count}`);
    }
  },

  async toHaveText(loc: Locator, expected: string | RegExp): Promise<void> {
    const text = await loc.textContent();
    if (text === null) {
      throw new Error(`Element has no text content`);
    }
    if (typeof expected === 'string') {
      if (!text.includes(expected)) {
        throw new Error(`Expected text "${expected}" but got "${text}"`);
      }
    } else {
      if (!expected.test(text)) {
        throw new Error(`Expected text to match ${expected} but got "${text}"`);
      }
    }
  },

  async toContainText(loc: Locator, expected: string | RegExp): Promise<void> {
    const text = await loc.textContent();
    if (text === null) {
      throw new Error(`Element has no text content`);
    }
    if (typeof expected === 'string') {
      if (!text.includes(expected)) {
        throw new Error(`Expected text to contain "${expected}" but got "${text}"`);
      }
    } else {
      if (!expected.test(text)) {
        throw new Error(`Expected text to match ${expected} but got "${text}"`);
      }
    }
  },

  async toHaveClass(loc: Locator, className: string): Promise<void> {
    if (!(await loc.hasClass(className))) {
      throw new Error(`Expected element to have class "${className}"`);
    }
  },

  async notToHaveClass(loc: Locator, className: string): Promise<void> {
    if (await loc.hasClass(className)) {
      throw new Error(`Expected element not to have class "${className}"`);
    }
  },
};

/**
 * Extend expect to work with Locators.
 */
export function expectLocator(loc: Locator) {
  return {
    toBeVisible: () => locatorAssertions.toBeVisible(loc),
    toBeAttached: () => locatorAssertions.toBeAttached(loc),
    toHaveCount: (n: number) => locatorAssertions.toHaveCount(loc, n),
    toHaveText: (text: string | RegExp) => locatorAssertions.toHaveText(loc, text),
    toContainText: (text: string | RegExp) => locatorAssertions.toContainText(loc, text),
    toHaveClass: (className: string) => locatorAssertions.toHaveClass(loc, className),
    not: {
      toBeVisible: async () => {
        if (await loc.isVisible()) {
          throw new Error(`Expected element not to be visible`);
        }
      },
      toBeAttached: async () => {
        if (await loc.isAttached()) {
          throw new Error(`Expected element not to be attached`);
        }
      },
      toHaveClass: (className: string) => locatorAssertions.notToHaveClass(loc, className),
      toContainText: async (text: string | RegExp) => {
        const content = await loc.textContent();
        if (content && (typeof text === 'string' ? content.includes(text) : text.test(content))) {
          throw new Error(`Expected element not to contain "${text}"`);
        }
      },
    },
  };
}
