import { Page, Locator, expect } from '@playwright/test';
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

  /**
   * WHAT: Toggles the checkbox inside a specific list item matching text.
   * WHY: List-based components (todo lists, task queues) repeat identical checkbox labels per item.
   * HOW: Filters listitem-role elements that contain a checkbox and match the given text, then toggles it.
   */
  static async toggleListItemCheckbox(page: Page, itemMatchText: string): Promise<void> {
    Logger.info(`Toggling checkbox for list item matching: [${itemMatchText}]`);
    const listItem = DataDisplayControls.checkableListItems(page).filter({ hasText: itemMatchText });
    await expect(listItem).toBeVisible({ timeout: 10000 });
    await listItem.getByRole('checkbox').click();
  }

  /**
   * WHAT: Locates list items that contain a checkbox, excluding unrelated navigation lists.
   * WHY: Pages often render multiple role=listitem groups (data lists, nav menus, filters).
   * HOW: Filters listitem-role elements down to those with a nested checkbox.
   */
  static checkableListItems(page: Page): Locator {
    return page.getByRole('listitem').filter({ has: page.getByRole('checkbox') });
  }

  /**
   * WHAT: Deletes a specific list item matching text via its labeled delete control.
   * WHY: List UIs commonly reveal delete controls only on hover, via aria-label rather
   *      than a control the accessibility tree exposes as a queryable role.
   * HOW: Filters to the matching item, hovers to reveal the control, then clicks by label.
   */
  static async deleteListItem(page: Page, itemMatchText: string, deleteControlLabel: string = 'Delete'): Promise<void> {
    Logger.info(`Deleting list item matching: [${itemMatchText}]`);
    const listItem = DataDisplayControls.checkableListItems(page).filter({ hasText: itemMatchText });
    await expect(listItem).toBeVisible({ timeout: 10000 });
    await listItem.hover();
    await listItem.getByLabel(deleteControlLabel).click();
  }
}
