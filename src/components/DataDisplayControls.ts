import { Page, expect } from '@playwright/test';
import { Logger } from '../utils/logger';

export class DataDisplayControls {
  /**
   * WHAT: Clicks an action button inside a specific data table row matching text.
   * WHY: Operates on dynamic list items without requiring row IDs.
   * HOW: Filters table rows using .filter({ hasText }) and locates button.
   */
  static async clickTableRowAction(page: Page, rowMatchText: string, actionButtonName: string): Promise<void> {
    Logger.info(`Clicking row action [${actionButtonName}] for row matching: [${rowMatchText}]`);
    const row = page.getByRole('row').filter({ hasText: rowMatchText });
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.getByRole('button', { name: actionButtonName }).click();
  }
}
