import * as path from 'path';
import { test, expect } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { MapExecutionEngine } from '../../src/engine/MapExecutionEngine';
import { OverlayControls } from '../../src/components/OverlayControls';
import { DataDisplayControls } from '../../src/components/DataDisplayControls';
import { PickerControls } from '../../src/components/PickerControls';

const sampleUploadFilePath = path.resolve(__dirname, '../../src/fixtures/data/static/sample-upload.txt');

test.describe('Complex Component Interaction Verification @regression', () => {

  test('OverlayControls resolves and dismisses a real modal dialog @smoke', async ({ page }) => {
    await allure.epic('Universal Component Action Library');
    await allure.feature('Overlay Controls');
    await allure.story('Modal Dialog Handling and Dismissal');
    await allure.description(
      'WHAT: Verifies OverlayControls.handleModalDialog opens, resolves, and dismisses a real ' +
      'ARIA-compliant modal dialog.\n' +
      'WHY: TodoMVC exposes no modal dialog; the W3C ARIA Authoring Practices reference ' +
      'implementation is a stable public target with genuine role dialog semantics, matching ' +
      'this framework\'s semantic-locator philosophy.\n' +
      'HOW: Opens the dialog via its trigger button, dismisses it via OverlayControls, and ' +
      'asserts it is hidden afterward.'
    );

    await test.step('GIVEN: Guest is on the ARIA modal dialog reference page', async () => {
      await page.goto('https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/dialog/');
    });

    await test.step('WHEN: Guest opens the delivery address modal', async () => {
      await page.getByRole('button', { name: 'Add Delivery Address' }).click();
      MapExecutionEngine.logExecutionStep('Open Modal', 'Delivery address modal opened', 'PASS');
    });

    await test.step('THEN: Modal must be visible before dismissal', async () => {
      await expect(page.getByRole('dialog', { name: 'Add Delivery Address' })).toBeVisible();
    });

    await test.step('WHEN: OverlayControls dismisses the modal via Cancel', async () => {
      await OverlayControls.handleModalDialog(page, 'Add Delivery Address', 'Cancel');
    });

    await test.step('THEN: Modal must be hidden after dismissal', async () => {
      await expect(page.getByRole('dialog', { name: 'Add Delivery Address' })).toBeHidden();
      MapExecutionEngine.logStateVerification({
        'Modal Dismissed'  : true,
        'Dismissal Action' : 'Cancel'
      });
    });
  });

  test('DataDisplayControls filters and deletes todo items dynamically @smoke', async ({ page }) => {
    await allure.epic('Universal Component Action Library');
    await allure.feature('Data Display Controls');
    await allure.story('Dynamic Row Filtering and Item Deletion');
    await allure.description(
      'WHAT: Verifies DataDisplayControls locates specific items among many via dynamic ' +
      'text filtering and removes a targeted item without disturbing the rest.\n' +
      'WHY: Ensures list-based UI actions operate on the correct item by content, not position.\n' +
      'HOW: Adds three todo items, filters to a matching subset, deletes one item, and asserts ' +
      'the remaining set is exactly what should be left.'
    );

    const itemsToAdd = ['Quarterly Report', 'Weekly Standup Notes', 'Quarterly Budget Review'];

    await test.step('GIVEN: Guest is on the TodoMVC application route with three items', async () => {
      await page.goto('/todomvc');
      for (const item of itemsToAdd) {
        await page.getByPlaceholder('What needs to be done?').fill(item);
        await page.getByPlaceholder('What needs to be done?').press('Enter');
      }
      await expect(DataDisplayControls.checkableListItems(page)).toHaveCount(3);
    });

    await test.step('WHEN: Items are dynamically filtered by matching text', async () => {
      const quarterlyItems = DataDisplayControls.checkableListItems(page).filter({ hasText: 'Quarterly' });
      await expect(quarterlyItems).toHaveCount(2);
      MapExecutionEngine.logExecutionStep('Dynamic Filter', 'Filtered to 2 items matching "Quarterly"', 'PASS');
    });

    await test.step('WHEN: A specific item is deleted', async () => {
      await DataDisplayControls.deleteListItem(page, 'Weekly Standup Notes');
    });

    await test.step('THEN: Remaining items must exclude the deleted item only', async () => {
      await expect(DataDisplayControls.checkableListItems(page)).toHaveCount(2);
      await expect(page.getByRole('listitem').filter({ hasText: 'Weekly Standup Notes' })).toHaveCount(0);
      await expect(page.getByRole('listitem').filter({ hasText: 'Quarterly Report' })).toBeVisible();
      MapExecutionEngine.logStateVerification({
        'Remaining Items' : 2,
        'Deleted Item'    : 'Weekly Standup Notes'
      });
    });
  });

  test('PickerControls uploads and validates a real file @smoke', async ({ page }) => {
    await allure.epic('Universal Component Action Library');
    await allure.feature('Picker Controls');
    await allure.story('File Upload Helper Validation');
    await allure.description(
      'WHAT: Verifies PickerControls.uploadFile submits a real local file to a real file input ' +
      'and the target application confirms receipt.\n' +
      'WHY: TodoMVC has no file input; a real upload target is required to prove the helper ' +
      'genuinely sets input files rather than only resolving a locator.\n' +
      'HOW: Uploads a local fixture file and asserts the target application reflects its name.'
    );

    await test.step('GIVEN: Guest is on a real file upload form', async () => {
      await page.goto('https://demoqa.com/upload-download');
    });

    await test.step('WHEN: PickerControls uploads a local fixture file', async () => {
      await PickerControls.uploadFile(page, 'Select a File', sampleUploadFilePath);
      MapExecutionEngine.logExecutionStep('Upload File', `Uploaded ${path.basename(sampleUploadFilePath)}`, 'PASS');
    });

    await test.step('THEN: Application must confirm the uploaded file name', async () => {
      await expect(page.locator('#uploadedFilePath')).toContainText(path.basename(sampleUploadFilePath));
      MapExecutionEngine.logStateVerification({
        'Uploaded File' : path.basename(sampleUploadFilePath),
        'Confirmed'     : true
      });
    });
  });

  test('OverlayControls and PickerControls correctly report absence of a modal or file input on TodoMVC @smoke', async ({ page }) => {
    await allure.epic('Universal Component Action Library');
    await allure.feature('Component Coverage Against Primary Target');
    await allure.story('Negative-Path Verification Against the TodoMVC Reference Application');
    await allure.description(
      'WHAT: Exercises OverlayControls.handleModalDialog and PickerControls.uploadFile directly ' +
      'against https://demo.playwright.dev/todomvc, this suite\'s primary target.\n' +
      'WHY: TodoMVC has no modal dialog and no file input. Rather than assert that from a written ' +
      'claim, this proves it against the real live app and confirms both helpers fail safely - a ' +
      'clear rejection, not a silent false positive - when the expected control is genuinely absent.\n' +
      'HOW: Invokes each helper against the real TodoMVC page and asserts both reject.'
    );

    await test.step('GIVEN: Guest is on the TodoMVC application route', async () => {
      await page.goto('/todomvc');
    });

    await test.step('WHEN: Both controls are invoked against a page with neither a modal nor a file input', async () => {
      const [overlayResult, pickerResult] = await Promise.allSettled([
        OverlayControls.handleModalDialog(page, 'Any Modal', 'Close'),
        PickerControls.uploadFile(page, 'Any File Input', sampleUploadFilePath),
      ]);
      expect(overlayResult.status).toBe('rejected');
      expect(pickerResult.status).toBe('rejected');
      MapExecutionEngine.logExecutionStep('Negative Path Check', 'Both helpers rejected as expected', 'PASS');
    });

    await test.step('THEN: Absence of both controls is confirmed against the real live application', async () => {
      MapExecutionEngine.logStateVerification({
        'Modal Present On TodoMVC'      : false,
        'File Input Present On TodoMVC' : false,
        'Both Helpers Failed Safely'    : true
      });
    });
  });

});
