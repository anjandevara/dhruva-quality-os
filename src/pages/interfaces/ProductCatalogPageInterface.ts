export interface ProductCategoryFilter {
  category: string;
  subCategory: string;
}

export interface ProductCatalogPageInterface {
  navigateToProductCatalog(): Promise<void>;
  searchForProduct(searchTerm: string): Promise<void>;
  filterByCategory(filter: ProductCategoryFilter): Promise<void>;
  addProductToCart(productName: string): Promise<void>;
  proceedToCheckout(): Promise<void>;
  verifyProductVisibleInResults(productName: string): Promise<void>;
  verifyCartContainsProduct(productName: string): Promise<void>;
  verifyCheckoutRequiresAccount(): Promise<void>;
}
