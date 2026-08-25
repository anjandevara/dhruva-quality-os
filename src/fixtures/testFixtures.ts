import { test as base } from '@playwright/test';
import { UserRegistrationPage } from '../pages/UserRegistrationPage';
import * as authData from './data/authData.json';

type DhruvaFixtures = {
  registrationPage: UserRegistrationPage;
  testData: typeof authData;
};

export const test = base.extend<DhruvaFixtures>({
  registrationPage: async ({ page }, use) => {
    await use(new UserRegistrationPage(page));
  },
  testData: async ({}, use) => {
    await use(authData);
  },
});

export { expect } from '@playwright/test';
