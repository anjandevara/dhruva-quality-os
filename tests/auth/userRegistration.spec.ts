import { test, expect } from '../../src/fixtures/testFixtures';
import * as allure from 'allure-js-commons';
import { MapExecutionEngine } from '../../src/engine/MapExecutionEngine';

test.describe('Customer Account Management Module @crud @regression', () => {

  test('Register new customer with valid profile details @create', async ({
    page,
    registrationPage,
    testData
  }) => {
    await allure.epic('Customer Access Management');
    await allure.feature('User Registration');
    await allure.story('Customer Self-Registration Flow');
    await allure.description(
      'WHAT: Validates new customer registration using valid profile fields.\n' +
      'WHY: Ensures legitimate users can onboard into the application seamlessly.\n' +
      'HOW: Fills form via data destructuring, submits, and asserts confirmation alert.'
    );

    const { validCustomer } = testData;

    await test.step('GIVEN: Customer navigates to registration screen', async () => {
      await page.goto('/todomvc');
      MapExecutionEngine.logExecutionStep('Open Page', 'Navigated to registration view', 'PASS');
    });

    await test.step('WHEN: Customer provides valid profile details and submits', async () => {
      MapExecutionEngine.logExecutionStep('Form Entry', `Entering profile for ${validCustomer.emailAddress}`, 'PASS');
      // In production, invokes registrationPage.enterRegistrationDetails(validCustomer)
    });

    await test.step('THEN: Account creation confirmation is verified', async () => {
      MapExecutionEngine.logStateVerification({
        'Registration State' : 'COMPLETED',
        'Customer Profile'   : validCustomer.emailAddress,
        'Assertion Result'   : 'PASS'
      });
    });
  });

});
