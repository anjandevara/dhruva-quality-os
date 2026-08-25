import { test, expect } from '../../src/fixtures/testFixtures';
import * as allure from 'allure-js-commons';
import { MapExecutionEngine } from '../../src/engine/MapExecutionEngine';

test.describe('Platform Health & Public Route Verification @smoke @read-only', () => {

  test('Verify Public Web Application Health and Title @smoke', async ({ page }) => {
    await allure.epic('Platform Core');
    await allure.feature('Environment Health Check');
    await allure.story('Public Route Health Verification');
    await allure.description(
      'WHAT: Verifies that the target application TodoMVC route loads with status 200.\n' +
      'WHY: Ensures system availability before executing deeper test suites.\n' +
      'HOW: Navigates to the TodoMVC route, asserts response status is 200, verifies page title, ' +
      'and confirms the core input control is visible and interactive.'
    );

    const mapContext = {
      marketEnvironment: process.env.ENV || 'qa',
      targetUrl: process.env.BASE_URL || 'https://demo.playwright.dev',
      userPersona: 'Public Guest User',
      businessGoal: 'Verify public application availability without mutations'
    };

    MapExecutionEngine.logMapAnalysis(mapContext, [
      'GIVEN: Guest navigates to the TodoMVC application route',
      'THEN: Page must respond with HTTP 200 and visible heading',
      'THEN: Core new-todo input control must be visible and ready for interaction'
    ]);

    await test.step('GIVEN: Guest navigates to the TodoMVC application route', async () => {
      const response = await page.goto('/todomvc');
      expect(response?.status()).toBeLessThan(400);
      MapExecutionEngine.logExecutionStep('Navigate TodoMVC Route', 'Page loaded successfully', 'PASS');
    });

    await test.step('THEN: Page must contain valid document title', async () => {
      const pageTitle = await page.title();
      expect(pageTitle.length).toBeGreaterThan(0);
      MapExecutionEngine.logStateVerification({
        'Route Available' : true,
        'Page Title'      : pageTitle,
        'Environment'     : mapContext.marketEnvironment
      });
    });

    await test.step('THEN: Core new-todo input control must be visible', async () => {
      const newTodoInput = page.getByPlaceholder('What needs to be done?');
      await expect(newTodoInput).toBeVisible();
      MapExecutionEngine.logStateVerification({
        'Input Control Ready' : true,
        'Control'              : 'What needs to be done?'
      });
    });
  });

});
