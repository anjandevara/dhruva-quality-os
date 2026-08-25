import { Page, Locator, expect } from '@playwright/test';
import { Logger } from '../utils/logger';

export class FormHelper {
  /**
   * WHAT: Fills text, email, password, or numeric inputs using semantic label or placeholder.
   * WHY: Resolves inputs reliably without hardcoded element IDs.
   * HOW: Tries getByLabel, falling back to getByPlaceholder.
   */
  static async fillInput(page: Page, labelOrPlaceholder: string, value?: string): Promise<void> {
    if (!value) return;
    Logger.info(`Filling input [${labelOrPlaceholder}] with value: ${value}`);
    const inputLocator = page.getByLabel(labelOrPlaceholder).or(page.getByPlaceholder(labelOrPlaceholder));
    await expect(inputLocator).toBeVisible({ timeout: 10000 });
    await inputLocator.fill(value);
  }

  /**
   * WHAT: Clicks a button using its accessible role and text.
   * WHY: Triggers form submission or navigation.
   * HOW: Resolves via getByRole button with name matching.
   */
  static async clickButton(page: Page, buttonName: string): Promise<void> {
    Logger.info(`Clicking button: [${buttonName}]`);
    const buttonLocator = page.getByRole('button', { name: buttonName });
    await expect(buttonLocator).toBeVisible({ timeout: 10000 });
    await buttonLocator.click();
  }

  /**
   * WHAT: Submits an input by pressing Enter, for forms with no submit button.
   * WHY: Some components (search boxes, quick-add lists) commit via keyboard only.
   * HOW: Resolves the same label-or-placeholder locator and presses Enter.
   */
  static async submitViaEnterKey(page: Page, labelOrPlaceholder: string): Promise<void> {
    Logger.info(`Submitting via Enter key on input: [${labelOrPlaceholder}]`);
    const inputLocator = page.getByLabel(labelOrPlaceholder).or(page.getByPlaceholder(labelOrPlaceholder));
    await inputLocator.press('Enter');
  }
}
