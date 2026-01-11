import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
    test('should display the landing page', async ({ page }) => {
        await page.goto('/');

        // Check for main heading
        await expect(page.locator('h1')).toBeVisible();

        // Check for sign in button or link (use first() to handle multiple matches)
        const signInButton = page
            .getByRole('link', {
                name: /sign in|get started|login/i,
            })
            .first();
        await expect(signInButton).toBeVisible();
    });

    test('should navigate to login page', async ({ page }) => {
        await page.goto('/');

        // Click on sign in / get started (use first() to handle multiple matches)
        const signInLink = page
            .getByRole('link', {
                name: /sign in|get started/i,
            })
            .first();
        await signInLink.click();

        // Should be on login page
        await expect(page).toHaveURL(/login/);
    });
});

test.describe('Login Page', () => {
    test('should display Google sign in option', async ({ page }) => {
        await page.goto('/login');

        // Check for Google sign in button
        const googleButton = page.getByRole('button', {
            name: /google|sign in/i,
        });
        await expect(googleButton).toBeVisible();
    });
});

test.describe('Dashboard (unauthenticated)', () => {
    test('should redirect to login when not authenticated', async ({
        page,
    }) => {
        await page.goto('/dashboard');

        // Should redirect to login
        await expect(page).toHaveURL(/login/);
    });
});
