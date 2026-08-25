import { Page, expect } from '@playwright/test';
import { Logger } from '../utils/logger';

export class OverlayControls {
  /**
   * WHAT: Confirms or cancels a modal dialog.
   * WHY: Handles UX safety confirmation prompts.
   * HOW: Locates dialog region and clicks action button.
   */
  static async handleModalDialog(page: Page, modalTitle: string, actionButtonName: string): Promise<void> {
    Logger.info(`Handling modal dialog [${modalTitle}] by clicking: [${actionButtonName}]`);
    const dialog = page.getByRole('dialog', { name: modalTitle });
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await dialog.getByRole('button', { name: actionButtonName }).click();
  }
}
