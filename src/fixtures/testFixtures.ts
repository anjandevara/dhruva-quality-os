import { test as base } from '@playwright/test';
import { UserRegistrationPage } from '../pages/UserRegistrationPage';
import { TodoListPage } from '../pages/TodoListPage';
import { ProductionShield } from '../engine/ProductionShield';
import * as authData from './data/authData.json';

type DhruvaFixtures = {
  registrationPage: UserRegistrationPage;
  todoListPage: TodoListPage;
  testData: typeof authData;
  productionSafetyGuard: void;
};

export const test = base.extend<DhruvaFixtures>({
  registrationPage: async ({ page }, use) => {
    await use(new UserRegistrationPage(page));
  },
  todoListPage: async ({ page }, use) => {
    await use(new TodoListPage(page));
  },
  testData: async ({}, use) => {
    await use(authData);
  },
  productionSafetyGuard: [async ({}, use, testInfo) => {
    ProductionShield.enforceProductionSafety(testInfo.title, testInfo.tags);
    await use();
  }, { auto: true }],
});

export { expect } from '@playwright/test';
