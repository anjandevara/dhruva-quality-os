import { Page, expect } from '@playwright/test';
import { ProductCatalogPageInterface, ProductCategoryFilter } from './interfaces/ProductCatalogPageInterface';
import { FormHelper } from '../components/FormHelper';
import { DataDisplayControls } from '../components/DataDisplayControls';
import { Logger } from '../utils/logger';

const productCardSelector = '.product-image-wrapper';

export class ProductCatalogPage implements ProductCatalogPageInterface {
  constructor(private readonly page: Page) {}

  async navigateToProductCatalog(): Promise<void> {
    Logger.info('Navigating to product catalog');
    await this.page.goto('https://automationexercise.com/products', { waitUntil: 'domcontentloaded' });
  }

  async searchForProduct(searchTerm: string): Promise<void> {
    Logger.info(`Searching for product: ${searchTerm}`);
    await FormHelper.fillInput(this.page, 'Search Product', searchTerm);
    await this.page.locator('#submit_search').click();
  }

  async filterByCategory({ category, subCategory }: ProductCategoryFilter): Promise<void> {
    Logger.info(`Filtering by category [${category}] > subcategory [${subCategory}]`);
    await this.page.locator(`a[href="#${category}"]`).click();
    const categoryPanel = this.page.locator(`#${category}`);
    await expect(categoryPanel).toHaveClass(/\bin\b/, { timeout: 10000 });
    await this.page.locator(`#${category} a`, { hasText: subCategory }).click();
  }

  async addProductToCart(productName: string): Promise<void> {
    Logger.info(`Adding product to cart: ${productName}`);
    await DataDisplayControls.clickCardAction(this.page, productCardSelector, productName, 'a.add-to-cart');
    await expect(this.page.locator('#cartModal')).toBeVisible();
  }

  async proceedToCheckout(): Promise<void> {
    Logger.info('Proceeding to checkout');
    await this.page.locator('#cartModal').getByRole('link', { name: 'View Cart' }).click();
    await this.page.getByText('Proceed To Checkout').click();
  }

  async verifyProductVisibleInResults(productName: string): Promise<void> {
    Logger.info(`Verifying product visible in results: ${productName}`);
    const product = this.page.locator(productCardSelector).filter({ hasText: productName });
    await expect(product).toBeVisible();
  }

  async verifyCartContainsProduct(productName: string): Promise<void> {
    Logger.info(`Verifying cart contains product: ${productName}`);
    const cartRow = this.page.locator('#cart_info tbody tr').filter({ hasText: productName });
    await expect(cartRow).toBeVisible();
  }

  async verifyCheckoutRequiresAccount(): Promise<void> {
    Logger.info('Verifying checkout is gated behind account registration');
    const checkoutModal = this.page.locator('#checkoutModal');
    await expect(checkoutModal).toBeVisible();
    await expect(checkoutModal.getByRole('link', { name: /Register/i })).toBeVisible();
  }
}
