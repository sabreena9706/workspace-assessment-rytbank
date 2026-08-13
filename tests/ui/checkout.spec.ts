import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { ProductsPage } from '../../pages/ProductsPage';
import { CartPage } from '../../pages/CartPage';
import { CheckoutPage } from '../../pages/CheckoutPage';

const VALID_USER = { username: 'standard_user', password: 'secret_sauce' };
const PRODUCT_NAME = 'Sauce Labs Backpack';
const CUSTOMER = { firstName: 'John', lastName: 'Doe', postalCode: '12345' };

test.describe('Swag Labs checkout flow', () => {
  test('standard user can log in, add a product to cart, and complete checkout', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const productsPage = new ProductsPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);

    await test.step('Navigate to the login page and log in', async () => {
      await loginPage.goto();
      await loginPage.login(VALID_USER.username, VALID_USER.password);
    });

    await test.step('Verify the products page loads', async () => {
      await expect(page).toHaveURL(/inventory\.html/);
      await expect(productsPage.pageTitle).toHaveText('Products');
    });

    await test.step('Add a product to the cart', async () => {
      await productsPage.addProductToCartByName(PRODUCT_NAME);
      await expect(productsPage.cartBadge).toHaveText('1');
    });

    await test.step('Open the cart and verify the correct item is listed', async () => {
      await productsPage.openCart();
      await expect(page).toHaveURL(/cart\.html/);
      const itemNames = await cartPage.getItemNames();
      expect(itemNames).toEqual([PRODUCT_NAME]);
    });

    await test.step('Proceed to checkout and fill in the required details', async () => {
      await cartPage.checkout();
      await expect(page).toHaveURL(/checkout-step-one\.html/);
      await checkoutPage.fillCheckoutInfo(CUSTOMER.firstName, CUSTOMER.lastName, CUSTOMER.postalCode);
      await expect(page).toHaveURL(/checkout-step-two\.html/);
    });

    await test.step('Complete the purchase', async () => {
      await checkoutPage.finish();
      await expect(page).toHaveURL(/checkout-complete\.html/);
    });

    await test.step('Validate the confirmation message appears', async () => {
      await expect(checkoutPage.completeHeader).toHaveText('Thank you for your order!');
    });
  });

  test('login fails with an error message for invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login('invalid_user', 'wrong_password');

    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.errorMessage).toContainText('Username and password do not match');
  });
});
