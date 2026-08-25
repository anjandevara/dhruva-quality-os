import { Page, expect } from '@playwright/test';
import { Logger } from '../utils/logger';

export class SelectionControls {
  /**
   * WHAT: Checks or unchecks a checkbox.
   * WHY: Toggles boolean form preferences.
   * HOW: Resolves getByRole checkbox and executes check/uncheck.
   */
  static async setCheckbox(page: Page, label: string, shouldCheck?: boolean): Promise<void> {
    if (shouldCheck === undefined) return;
    Logger.info(`Setting checkbox [${label}] to: ${shouldCheck}`);
    const checkbox = page.getByRole('checkbox', { name: label });
    await expect(checkbox).toBeVisible({ timeout: 10000 });
    if (shouldCheck) {
      await checkbox.check();
    } else {
      await checkbox.uncheck();
    }
  }

  /**
   * WHAT: Selects a radio button option.
   * WHY: Chooses a single choice from a group.
   * HOW: Resolves getByRole radio with name matching.
   */
  static async selectRadio(page: Page, optionLabel?: string): Promise<void> {
    if (!optionLabel) return;
    Logger.info(`Selecting radio button option: [${optionLabel}]`);
    const radio = page.getByRole('radio', { name: optionLabel });
    await expect(radio).toBeVisible({ timeout: 10000 });
    await radio.check();
  }

  /**
   * WHAT: Selects an option from a select dropdown.
   * WHY: Chooses values from native select elements.
   * HOW: Resolves getByLabel and executes selectOption.
   */
  static async selectDropdown(page: Page, label: string, optionValue?: string): Promise<void> {
    if (!optionValue) return;
    Logger.info(`Selecting dropdown [${label}] option: [${optionValue}]`);
    const dropdown = page.getByLabel(label);
    await expect(dropdown).toBeVisible({ timeout: 10000 });
    await dropdown.selectOption({ label: optionValue });
  }

  /**
   * WHAT: Toggles an accessible switch component.
   * WHY: Activates or deactivates feature switches.
   * HOW: Resolves role switch or checkbox and asserts state.
   */
  static async toggleSwitch(page: Page, label: string, targetState: boolean): Promise<void> {
    Logger.info(`Toggling switch [${label}] to: ${targetState}`);
    const switchControl = page.getByRole('switch', { name: label });
    await expect(switchControl).toBeVisible({ timeout: 10000 });
    const isChecked = await switchControl.isChecked();
    if (isChecked !== targetState) {
      await switchControl.click();
    }
  }
}
