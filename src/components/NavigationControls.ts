import { Page, expect } from '@playwright/test';
import { Logger } from '../utils/logger';

export class NavigationControls {
  /**
   * WHAT: Switches to a specific navigation tab.
   * WHY: Navigates across tabbed views.
   * HOW: Resolves getByRole tab with name matching.
   */
  static async switchTab(page: Page, tabName: string): Promise<void> {
    Logger.info(`Switching to navigation tab: [${tabName}]`);
    const tab = page.getByRole('tab', { name: tabName });
    await expect(tab).toBeVisible({ timeout: 10000 });
    await tab.click();
  }
}
