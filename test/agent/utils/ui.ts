/**
 * Generic UI interaction utilities
 */

import { Page, ElementHandle } from 'puppeteer';
import { getPage } from './browser';

/**
 * Clicks an element and waits for it to be actionable.
 *
 * @param selector - CSS selector
 * @param page - Page handle (optional, uses shared page if not provided)
 */
export async function clickElement(selector: string, page?: Page): Promise<void> {
  const p = page || await getPage();
  await p.waitForSelector(selector, { visible: true, timeout: 5000 });
  await p.click(selector);
}

/**
 * Fills an input field with a value.
 *
 * @param selector - CSS selector
 * @param value - Value to fill
 * @param page - Page handle (optional, uses shared page if not provided)
 */
export async function fillInput(selector: string, value: string, page?: Page): Promise<void> {
  const p = page || await getPage();
  await p.waitForSelector(selector, { visible: true, timeout: 5000 });

  // Clear existing value
  await p.$eval(selector, (el: Element) => {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.value = '';
    }
  });

  // Type new value
  await p.type(selector, value);
}

/**
 * Waits for a selector to appear.
 *
 * @param selector - CSS selector
 * @param timeout - Timeout in milliseconds
 * @param page - Page handle (optional, uses shared page if not provided)
 */
export async function waitForSelector(selector: string, timeout = 5000, page?: Page): Promise<void> {
  const p = page || await getPage();
  await p.waitForSelector(selector, { timeout });
}

/**
 * Waits for a selector to be hidden.
 *
 * @param selector - CSS selector
 * @param timeout - Timeout in milliseconds
 * @param page - Page handle (optional, uses shared page if not provided)
 */
export async function waitForHidden(selector: string, timeout = 5000, page?: Page): Promise<void> {
  const p = page || await getPage();
  await p.waitForSelector(selector, { hidden: true, timeout });
}

/**
 * Gets the text content of an element.
 *
 * @param selector - CSS selector
 * @param page - Page handle (optional, uses shared page if not provided)
 * @returns Text content or null if not found
 */
export async function getText(selector: string, page?: Page): Promise<string | null> {
  const p = page || await getPage();
  const element = await p.$(selector);
  if (!element) return null;

  return element.evaluate(el => el.textContent?.trim() || null);
}

/**
 * Gets the value of an input field.
 *
 * @param selector - CSS selector
 * @param page - Page handle (optional, uses shared page if not provided)
 * @returns Input value or null if not found
 */
export async function getInputValue(selector: string, page?: Page): Promise<string | null> {
  const p = page || await getPage();
  return p.$eval(selector, (el: Element) => {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      return el.value;
    }
    return null;
  });
}

/**
 * Checks if an element is visible.
 *
 * @param selector - CSS selector
 * @param page - Page handle (optional, uses shared page if not provided)
 * @returns True if visible
 */
export async function isVisible(selector: string, page?: Page): Promise<boolean> {
  const p = page || await getPage();
  const element = await p.$(selector);
  if (!element) return false;

  return element.isIntersectingViewport();
}

/**
 * Gets an element handle for direct manipulation.
 *
 * @param selector - CSS selector
 * @param page - Page handle (optional, uses shared page if not provided)
 * @returns Element handle or null
 */
export async function getElement(selector: string, page?: Page): Promise<ElementHandle<Element> | null> {
  const p = page || await getPage();
  return p.$(selector);
}

/**
 * Waits for and clicks a button containing specific text.
 *
 * @param text - Button text to search for
 * @param page - Page handle (optional, uses shared page if not provided)
 */
export async function clickButton(text: string, page?: Page): Promise<void> {
  const p = page || await getPage();
  await p.evaluate((btnText: string) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent?.includes(btnText));
    if (btn) btn.click();
  }, text);
}

/**
 * Selects an option from a dropdown.
 *
 * @param selector - CSS selector for the select element
 * @param value - Option value to select
 * @param page - Page handle (optional, uses shared page if not provided)
 */
export async function selectOption(selector: string, value: string, page?: Page): Promise<void> {
  const p = page || await getPage();
  await p.waitForSelector(selector, { visible: true, timeout: 5000 });
  await p.select(selector, value);
}

/**
 * Hovers over an element.
 *
 * @param selector - CSS selector
 * @param page - Page handle (optional, uses shared page if not provided)
 */
export async function hoverElement(selector: string, page?: Page): Promise<void> {
  const p = page || await getPage();
  await p.waitForSelector(selector, { visible: true, timeout: 5000 });
  await p.hover(selector);
}

/**
 * Waits for a specific URL pattern.
 *
 * @param urlPattern - URL pattern to match
 * @param timeout - Timeout in milliseconds
 * @param page - Page handle (optional, uses shared page if not provided)
 */
export async function waitForUrl(urlPattern: string | RegExp, timeout = 30000, page?: Page): Promise<void> {
  const p = page || await getPage();

  await p.waitForFunction(
    (pattern: string | RegExp) => {
      if (typeof pattern === 'string') {
        return window.location.href.includes(pattern);
      }
      return pattern.test(window.location.href);
    },
    { timeout },
    urlPattern
  );
}
