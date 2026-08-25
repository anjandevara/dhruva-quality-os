import { Page, expect } from '@playwright/test';
import { Logger } from '../utils/logger';

export class PickerControls {
  /**
   * WHAT: Sets the value of a range slider input.
   * WHY: Adjusts numeric metrics (e.g. salary, experience).
   * HOW: Evaluates fill on input[type=range].
   */
  static async setRangeSlider(page: Page, sliderLabel: string, targetValue: number): Promise<void> {
    Logger.info(`Setting range slider [${sliderLabel}] to: ${targetValue}`);
    const slider = page.getByLabel(sliderLabel);
    await expect(slider).toBeVisible({ timeout: 10000 });
    await slider.fill(targetValue.toString());
  }

  /**
   * WHAT: Uploads a local file to a file input element.
   * WHY: Submits attachments, resumes, or CSV datasets.
   * HOW: Resolves getByLabel, falling back to any file input when the field lacks an
   *      accessible label (common on real-world forms), and executes setInputFiles.
   */
  static async uploadFile(page: Page, inputLabel: string, localFilePath: string): Promise<void> {
    Logger.info(`Uploading file [${localFilePath}] to input [${inputLabel}]`);
    const fileInput = page.getByLabel(inputLabel).or(page.locator('input[type="file"]'));
    await expect(fileInput).toBeVisible({ timeout: 10000 });
    await fileInput.setInputFiles(localFilePath);
  }
}
