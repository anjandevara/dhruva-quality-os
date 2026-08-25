import { test } from '../../src/fixtures/testFixtures';
import * as allure from 'allure-js-commons';
import { MapExecutionEngine } from '../../src/engine/MapExecutionEngine';

test.describe('Customer Account Management Module @crud @regression', () => {

  test('Register new customer and manage their task list @create', async ({
    todoListPage,
    testData
  }) => {
    await allure.epic('Customer Access Management');
    await allure.feature('User Registration');
    await allure.story('Customer Self-Registration Flow');
    await allure.description(
      'WHAT: Validates customer onboarding using live interactions against the TodoMVC ' +
      'reference application, standing in for the real registration and task management screens.\n' +
      'WHY: Ensures legitimate users can onboard and manage their records seamlessly.\n' +
      'HOW: Adds task items via FormHelper, toggles completion via DataDisplayControls, ' +
      'and asserts every state change with web-first assertions.'
    );

    const { validCustomer } = testData;
    const firstTaskDescription = `${validCustomer.firstName} - Complete profile setup`;
    const secondTaskDescription = `${validCustomer.firstName} - Verify email address`;

    await test.step('GIVEN: Customer navigates to their task management screen', async () => {
      await todoListPage.navigateToTodoApplication();
      MapExecutionEngine.logExecutionStep('Open Page', 'Navigated to task management view', 'PASS');
    });

    await test.step('WHEN: Customer adds onboarding tasks to their list', async () => {
      await todoListPage.addTodoItem(firstTaskDescription);
      await todoListPage.addTodoItem(secondTaskDescription);
      MapExecutionEngine.logExecutionStep('Task Entry', `Added tasks for ${validCustomer.emailAddress}`, 'PASS');
    });

    await test.step('THEN: Both tasks must be visible in the list', async () => {
      await todoListPage.verifyTodoItemVisible(firstTaskDescription);
      await todoListPage.verifyTodoItemVisible(secondTaskDescription);
      await todoListPage.verifyVisibleTodoItemCount(2);
    });

    await test.step('WHEN: Customer completes the first onboarding task', async () => {
      await todoListPage.toggleTodoItemCompletion(firstTaskDescription);
      MapExecutionEngine.logExecutionStep('Task Completion', `Completed: ${firstTaskDescription}`, 'PASS');
    });

    await test.step('THEN: Filtering by Active must show only the remaining task', async () => {
      await todoListPage.filterTodoItemsBy('Active');
      await todoListPage.verifyVisibleTodoItemCount(1);
      await todoListPage.verifyTodoItemVisible(secondTaskDescription);
    });

    await test.step('THEN: Filtering by Completed must show only the finished task', async () => {
      await todoListPage.filterTodoItemsBy('Completed');
      await todoListPage.verifyVisibleTodoItemCount(1);
      await todoListPage.verifyTodoItemVisible(firstTaskDescription);
      MapExecutionEngine.logStateVerification({
        'Registration State' : 'COMPLETED',
        'Customer Profile'   : validCustomer.emailAddress,
        'Completed Task'     : firstTaskDescription,
        'Assertion Result'   : 'PASS'
      });
    });
  });

});
