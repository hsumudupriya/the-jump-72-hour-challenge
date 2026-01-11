import { test, expect } from '@playwright/test';

test.describe('API Routes', () => {
    test.describe('Categories API', () => {
        test('GET /api/categories should require authentication', async ({
            request,
        }) => {
            const response = await request.get('/api/categories');
            expect(response.status()).toBe(401);
        });

        test('POST /api/categories should require authentication', async ({
            request,
        }) => {
            const response = await request.post('/api/categories', {
                data: { name: 'Test', color: '#ff0000' },
            });
            expect(response.status()).toBe(401);
        });
    });

    test.describe('Emails API', () => {
        test('GET /api/emails/sync should require authentication', async ({
            request,
        }) => {
            const response = await request.get('/api/emails/sync');
            // Either 401 or 405 (method not allowed) is acceptable
            expect([401, 405]).toContain(response.status());
        });

        test('POST /api/emails/bulk-delete should require authentication', async ({
            request,
        }) => {
            const response = await request.post('/api/emails/bulk-delete', {
                data: { emailIds: ['test-id'] },
            });
            expect(response.status()).toBe(401);
        });
    });

    test.describe('Unsubscribe API', () => {
        test('POST /api/unsubscribe should require authentication', async ({
            request,
        }) => {
            const response = await request.post('/api/unsubscribe', {
                data: { emailIds: ['test-id'] },
            });
            expect(response.status()).toBe(401);
        });
    });

    test.describe('Cron API', () => {
        test('POST /api/cron/sync-emails should require authorization', async ({
            request,
        }) => {
            const response = await request.post('/api/cron/sync-emails');
            expect(response.status()).toBe(401);
        });
    });
});
