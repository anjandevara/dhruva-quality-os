import { Page, expect } from '@playwright/test';
import { test } from '../../src/fixtures/testFixtures';
import * as allure from 'allure-js-commons';
import { MapExecutionEngine } from '../../src/engine/MapExecutionEngine';

interface PublicRouteExpectation {
  path: string;
  expectedTitleFragment: string;
}

async function verifyPublicRouteIsHealthy(page: Page, route: PublicRouteExpectation): Promise<void> {
  let responseStatus: number | undefined;

  await test.step(`GIVEN: Guest navigates to ${route.path}`, async () => {
    const response = await page.goto(`https://automationexercise.com${route.path}`, { waitUntil: 'domcontentloaded' });
    responseStatus = response?.status();
  });

  await test.step('THEN: Response status must be healthy', async () => {
    expect(responseStatus).toBeLessThan(400);
  });

  await test.step('THEN: Page title must match the expected route content', async () => {
    await expect(page).toHaveTitle(new RegExp(route.expectedTitleFragment));
  });

  await test.step('THEN: Header and footer landmarks must be visible', async () => {
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('footer, #footer')).toBeVisible();
    MapExecutionEngine.logStateVerification({
      'Route'          : route.path,
      'Status Code'    : responseStatus ?? 'unknown',
      'Header Visible' : true,
      'Footer Visible' : true
    });
  });
}

test.describe('Production Route Health Audit @read-only @smoke @prod-safe', () => {

  test('Public catalog route responds healthy: home page', async ({ page }) => {
    await allure.epic('Production Safety');
    await allure.feature('Route Health Audit');
    await allure.story('Health Check for Home Page');
    await allure.description(
      'WHAT: Verifies the home page on the real PRJ-003 store returns a healthy HTTP status, ' +
      'correct title, and visible header/footer.\n' +
      'WHY: RAKSHA permits only read-only smoke checks in production; this proves the app is ' +
      'reachable and rendering correctly without performing any form mutation.\n' +
      'HOW: Navigates to the route and asserts response status, title, and layout landmarks.'
    );
    await verifyPublicRouteIsHealthy(page, { path: '/', expectedTitleFragment: 'Automation Exercise' });
  });

  test('Public catalog route responds healthy: products listing', async ({ page }) => {
    await allure.epic('Production Safety');
    await allure.feature('Route Health Audit');
    await allure.story('Health Check for Products Listing');
    await allure.description(
      'WHAT: Verifies the all-products listing on the real PRJ-003 store returns a healthy HTTP ' +
      'status, correct title, and visible header/footer.\n' +
      'WHY: RAKSHA permits only read-only smoke checks in production; this proves the catalog is ' +
      'reachable without performing any form mutation.\n' +
      'HOW: Navigates to the route and asserts response status, title, and layout landmarks.'
    );
    await verifyPublicRouteIsHealthy(page, { path: '/products', expectedTitleFragment: 'All Products' });
  });

  test('Public catalog route responds healthy: category products page', async ({ page }) => {
    await allure.epic('Production Safety');
    await allure.feature('Route Health Audit');
    await allure.story('Health Check for Category Products Page');
    await allure.description(
      'WHAT: Verifies a filtered category page on the real PRJ-003 store returns a healthy HTTP ' +
      'status, correct title, and visible header/footer.\n' +
      'WHY: RAKSHA permits only read-only smoke checks in production; this proves category ' +
      'filtering routes stay reachable without performing any form mutation.\n' +
      'HOW: Navigates to the route and asserts response status, title, and layout landmarks.'
    );
    await verifyPublicRouteIsHealthy(page, { path: '/category_products/1', expectedTitleFragment: 'Dress Products' });
  });

});
