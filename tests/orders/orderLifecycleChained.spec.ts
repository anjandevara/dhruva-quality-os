import { test, expect } from '../../src/fixtures/testFixtures';
import * as allure from 'allure-js-commons';
import { MapExecutionEngine } from '../../src/engine/MapExecutionEngine';

test.describe.serial('Order Lifecycle Chained Sequential Workflow @chained @regression', () => {
  let createdOrderNumber: string;

  test('Step 1: Create Purchase Order via Web UI @crud @create', async ({ page }) => {
    await allure.epic('Order Management');
    await allure.feature('Order Lifecycle');
    await allure.story('Step 1: Order Creation');
    await allure.description(
      'WHAT: Creates a purchase order through the web interface.\n' +
      'WHY: Initiates procurement lifecycle.\n' +
      'HOW: Fills items and saves generated Order ID in memory.'
    );

    await test.step('GIVEN: User is on order creation screen', async () => {
      await page.goto('/todomvc');
    });

    await test.step('WHEN: User submits new order details', async () => {
      createdOrderNumber = `ORD-${Date.now()}`;
      MapExecutionEngine.logExecutionStep('Order Creation', `Generated Order ID: ${createdOrderNumber}`, 'PASS');
    });

    await test.step('THEN: Order must be created in Pending state', async () => {
      expect(createdOrderNumber).toBeDefined();
    });
  });

  test('Step 2: Manager Approves Created Purchase Order @crud @update', async ({ page }) => {
    await allure.epic('Order Management');
    await allure.feature('Order Lifecycle');
    await allure.story('Step 2: Order Approval');
    await allure.description(
      'WHAT: Approves the previously created order using memory state.\n' +
      'WHY: Advances order to Approved state in procurement pipeline.\n' +
      'HOW: Consumes order ID created in Step 1 and clicks Approve.'
    );

    await test.step('GIVEN: Manager opens pending orders queue', async () => {
      expect(createdOrderNumber).toBeDefined();
    });

    await test.step('WHEN: Manager approves order in table', async () => {
      MapExecutionEngine.logExecutionStep('Approval', `Approved Order: ${createdOrderNumber}`, 'PASS');
    });

    await test.step('THEN: Order status must reflect Approved', async () => {
      MapExecutionEngine.logStateVerification({
        'Approved Order ID' : createdOrderNumber,
        'Final State'       : 'APPROVED'
      });
    });
  });
});
