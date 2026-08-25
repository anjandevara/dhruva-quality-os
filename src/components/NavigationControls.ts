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

  /**
   * WHAT: Clicks a standard hyperlink by its accessible name.
   * WHY: Drives filter and menu links exposed as anchor elements.
   * HOW: Resolves getByRole link with name matching.
   */
  static async clickNavigationLink(page: Page, linkName: string): Promise<void> {
    Logger.info(`Clicking navigation link: [${linkName}]`);
    const link = page.getByRole('link', { name: linkName });
    await expect(link).toBeVisible({ timeout: 10000 });
    await link.click();
  }
}
