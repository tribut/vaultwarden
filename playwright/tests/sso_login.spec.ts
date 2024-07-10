import { test, expect, type TestInfo } from '@playwright/test';
const utils = require('../global-utils');

utils.loadEnv();

test.beforeAll('Setup', async ({ browser }, testInfo: TestInfo) => {
    await utils.startVaultwarden(browser, testInfo, {
        SSO_ENABLED: true,
        SSO_ONLY: false
    });
});

test.afterAll('Teardown', async ({}, testInfo: TestInfo) => {
    utils.stopVaultwarden(testInfo);
});

test('Account creation using SSO', async ({ page }) => {
    // Landing page
    await page.goto('/');
    await page.getByLabel(/Email address/).fill(process.env.TEST_USER_MAIL);
    await page.getByRole('button', { name: 'Continue' }).click();

    // Unlock page
    await page.getByRole('link', { name: /Enterprise single sign-on/ }).click();

    // Keycloak Login page
    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
    await page.getByLabel(/Username/).fill(process.env.TEST_USER);
    await page.getByLabel('Password', { exact: true }).fill(process.env.TEST_USER_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Back to Vault create account
    await expect(page.getByText('Set master password')).toBeVisible();
    await page.getByLabel('Master password', { exact: true }).fill('Master password');
    await page.getByLabel('Re-type master password').fill('Master password');
    await page.getByRole('button', { name: 'Submit' }).click();

    // We are now in the default vault page
    await expect(page).toHaveTitle(/Vaults/);
});

test('SSO login', async ({ page }) => {
    // Landing page
    await page.goto('/');
    await page.getByLabel(/Email address/).fill(process.env.TEST_USER_MAIL);
    await page.getByRole('button', { name: 'Continue' }).click();

    // Unlock page
    await page.getByRole('link', { name: /Enterprise single sign-on/ }).click();

    // Keycloak Login page
    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
    await page.getByLabel(/Username/).fill(process.env.TEST_USER);
    await page.getByLabel('Password', { exact: true }).fill(process.env.TEST_USER_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Back to Vault unlock page
    await expect(page).toHaveTitle('Vaultwarden Web');
    await page.getByLabel('Master password').fill('Master password');
    await page.getByRole('button', { name: 'Unlock' }).click();

    // We are now in the default vault page
    await expect(page).toHaveTitle(/Vaults/);
});

test('Non SSO login', async ({ page }) => {
    // Landing page
    await page.goto('/');
    await page.getByLabel(/Email address/).fill(process.env.TEST_USER_MAIL);
    await page.getByRole('button', { name: 'Continue' }).click();

    // Unlock page
    await page.getByLabel('Master password').fill('Master password');
    await page.getByRole('button', { name: 'Log in with master password' }).click();

    // We are now in the default vault page
    await expect(page).toHaveTitle(/Vaults/);
});


test('Non SSO login Failure', async ({ page, browser }, testInfo: TestInfo) => {
    await utils.restartVaultwarden(page, testInfo, {
        SSO_ENABLED: true,
        SSO_ONLY: true
    }, false);

    // Landing page
    await page.goto('/');
    await page.getByLabel(/Email address/).fill(process.env.TEST_USER_MAIL);
    await page.getByRole('button', { name: 'Continue' }).click();

    // Unlock page
    await page.getByLabel('Master password').fill('Master password');
    await page.getByRole('button', { name: 'Log in with master password' }).click();

    // An error should appear
    await page.getByLabel('SSO sign-in is required')
});

test('No SSO login', async ({ page }, testInfo: TestInfo) => {
    await utils.restartVaultwarden(page, testInfo, {
        SSO_ENABLED: false
    }, false);

    // Landing page
    await page.goto('/');
    await page.getByLabel(/Email address/).fill(process.env.TEST_USER_MAIL);
    await page.getByRole('button', { name: 'Continue' }).click();

    // No SSO button
    await page.getByLabel('Master password');
    await expect(page.getByRole('link', { name: /Enterprise single sign-on/ })).toHaveCount(0);
});
