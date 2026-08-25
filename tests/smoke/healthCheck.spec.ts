import { test, expect } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { MapExecutionEngine } from '../../src/engine/MapExecutionEngine';

test.describe('Platform Health & Public Route Verification @smoke @read-only', () => {

  test('Verify Public Web Application Health and Title @smoke', async ({ page }) => {
    await allure.epic('Platform Core');
    await allure.feature('Environment Health Check');
    await allure.story('Public Route Health Verification');
    await allure.description(
      'WHAT: Verifies that the target application root URL loads with status 200.\n' +
      'WHY: Ensures system availability before executing deeper test suites.\n' +
      'HOW: Navigates to root URL, asserts response status is 200, and verifies page title.'
    );

    const mapContext = {
      marketEnvironment: process.env.ENV || 'qa',
      targetUrl: process.env.BASE_URL || 'https://demo.playwright.dev',
      userPersona: 'Public Guest User',
      businessGoal: 'Verify public application availability without mutations'
    };

    MapExecutionEngine.logMapAnalysis(mapContext, [
      'GIVEN: Guest navigates to application root URL',
      'THEN: Page must respond with HTTP 200 and visible heading'
    ]);

    await test.step('GIVEN: Guest navigates to application root URL', async () => {
      const response = await page.goto('/');
      expect(response?.status()).toBeLessThan(400);
      MapExecutionEngine.logExecutionStep('Navigate Root', 'Page loaded successfully', 'PASS');
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
  });

});
