import { Page, Locator } from '@playwright/test';

export class ProductsPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly cartBadge: Locator;
  readonly cartLink: Locator;
  readonly inventoryItems: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('[data-test="title"]');
    this.cartBadge = page.locator('[data-test="shopping-cart-badge"]');
    this.cartLink = page.locator('[data-test="shopping-cart-link"]');
    this.inventoryItems = page.locator('[data-test="inventory-item"]');
  }

  async addProductToCartByName(productName: string) {
    const item = this.inventoryItems.filter({ hasText: productName });
    await item.locator('button', { hasText: 'Add to cart' }).click();
  }

  async getProductPrice(productName: string): Promise<string> {
    const item = this.inventoryItems.filter({ hasText: productName });
    return (await item.locator('[data-test="inventory-item-price"]').innerText()).trim();
  }

  async openCart() {
    await this.cartLink.click();
  }
}
