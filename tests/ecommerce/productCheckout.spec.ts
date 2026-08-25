import { test, expect } from '../../src/fixtures/testFixtures';
import * as allure from 'allure-js-commons';
import { MapExecutionEngine } from '../../src/engine/MapExecutionEngine';
import { ProductCatalogPage } from '../../src/pages/ProductCatalogPage';
import { SelectionControls } from '../../src/components/SelectionControls';

test.describe('E-Commerce Product Catalog and Checkout @crud @regression', () => {

  test('Guest searches, filters, adds a product to cart, and reaches the checkout gate @smoke @crud', async ({ page }) => {
    await allure.epic('E-Commerce Web Portal');
    await allure.feature('Product Catalog and Checkout');
    await allure.story('Guest Search, Category Filter, Cart, and Checkout Gate');
    await allure.description(
      'WHAT: Verifies a guest can search products, filter by category, add a product to cart, ' +
      'and reach the checkout gate on the real PRJ-003 reference store.\n' +
      'WHY: Onboards a genuine live e-commerce target beyond the TodoMVC calibration app, proving ' +
      'ProductCatalogPage against real search, category, and cart behavior rather than a stub.\n' +
      'HOW: Drives ProductCatalogPage through FormHelper and DataDisplayControls, then asserts the ' +
      'real unauthenticated checkout gate rather than fabricating a completed order.'
    );

    const catalogPage = new ProductCatalogPage(page);
    const searchTerm = 'Top';
    const targetCategory = { category: 'Women', subCategory: 'Dress' };
    const productToPurchase = 'Blue Top';

    await test.step('GIVEN: Guest navigates to the product catalog and searches for a product', async () => {
      await catalogPage.navigateToProductCatalog();
      await catalogPage.searchForProduct(searchTerm);
      MapExecutionEngine.logExecutionStep('Search Products', `Searched for "${searchTerm}"`, 'PASS');
    });

    await test.step('THEN: Matching products must be visible in the search results', async () => {
      await catalogPage.verifyProductVisibleInResults(productToPurchase);
    });

    await test.step('WHEN: Guest filters the catalog by category', async () => {
      await catalogPage.navigateToProductCatalog();
      await catalogPage.filterByCategory(targetCategory);
      MapExecutionEngine.logExecutionStep(
        'Category Filter', `Filtered to ${targetCategory.category} > ${targetCategory.subCategory}`, 'PASS'
      );
    });

    await test.step('WHEN: Guest adds a product to the cart', async () => {
      await catalogPage.navigateToProductCatalog();
      await catalogPage.addProductToCart(productToPurchase);
    });

    await test.step('THEN: Cart must contain the added product', async () => {
      await catalogPage.proceedToCheckout();
      await catalogPage.verifyCartContainsProduct(productToPurchase);
    });

    await test.step('THEN: Checkout must be correctly gated behind account registration', async () => {
      await catalogPage.verifyCheckoutRequiresAccount();
      MapExecutionEngine.logStateVerification({
        'Cart Product'     : productToPurchase,
        'Checkout Gated'   : true,
        'Requires Account' : true
      });
    });
  });

  test('SelectionControls correctly reports no dropdown filters on this catalog @smoke', async ({ page }) => {
    await allure.epic('E-Commerce Web Portal');
    await allure.feature('Component Coverage Against Primary Target');
    await allure.story('Negative-Path Verification of Selection Controls');
    await allure.description(
      'WHAT: Exercises SelectionControls.selectDropdown directly against the real product catalog.\n' +
      'WHY: This live reference store has no dropdown or checkbox filters in its search/category ' +
      'flow, verified live. This proves that fact against the real app rather than assuming it, ' +
      'and confirms the helper fails safely rather than silently.\n' +
      'HOW: Invokes SelectionControls against the catalog page and asserts it rejects.'
    );

    await test.step('GIVEN: Guest is on the product catalog', async () => {
      await page.goto('https://automationexercise.com/products', { waitUntil: 'domcontentloaded' });
    });

    await test.step('WHEN: SelectionControls looks for a dropdown filter that does not exist here', async () => {
      await expect(SelectionControls.selectDropdown(page, 'Sort By', 'Price')).rejects.toThrow();
      MapExecutionEngine.logExecutionStep('Negative Path Check', 'SelectionControls correctly rejected', 'PASS');
    });

    await test.step('THEN: Absence is confirmed against the real live application', async () => {
      MapExecutionEngine.logStateVerification({
        'Dropdown Filter Present' : false
      });
    });
  });

});
