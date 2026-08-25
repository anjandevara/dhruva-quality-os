import { Page, expect } from '@playwright/test';
import { UserRegistrationPageInterface, UserRegistrationFormData } from './interfaces/UserRegistrationPageInterface';
import { FormHelper } from '../components/FormHelper';
import { SelectionControls } from '../components/SelectionControls';
import { Logger } from '../utils/logger';

export class UserRegistrationPage implements UserRegistrationPageInterface {
  constructor(private readonly page: Page) {}

  async navigateToRegistrationPage(): Promise<void> {
    Logger.info('Navigating to user registration page');
    await this.page.goto('/register');
  }

  async enterRegistrationDetails(details: UserRegistrationFormData): Promise<void> {
    const { firstName, lastName, emailAddress, password, genderOption, countryName, agreeToTerms } = details;

    Logger.info(`Entering registration details for email: ${emailAddress}`);
    await FormHelper.fillInput(this.page, 'First Name', firstName);
    await FormHelper.fillInput(this.page, 'Last Name', lastName);
    await FormHelper.fillInput(this.page, 'Email Address', emailAddress);
    await FormHelper.fillInput(this.page, 'Password', password);
    await SelectionControls.selectRadio(this.page, genderOption);
    await SelectionControls.selectDropdown(this.page, 'Country', countryName);
    await SelectionControls.setCheckbox(this.page, 'Agree to terms', agreeToTerms);
  }

  async submitRegistration(): Promise<void> {
    Logger.info('Submitting registration form');
    await FormHelper.clickButton(this.page, 'Create Account');
  }

  async verifyRegistrationSuccess(expectedMessage: string): Promise<void> {
    Logger.info(`Verifying success alert contains: ${expectedMessage}`);
    const alert = this.page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(expectedMessage);
  }
}
