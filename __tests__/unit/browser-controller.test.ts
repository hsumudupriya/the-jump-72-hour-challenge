import { BrowserController } from '@/lib/agent/browser-controller';

// Mock Playwright
jest.mock('playwright', () => ({
    chromium: {
        launch: jest.fn().mockResolvedValue({
            newContext: jest.fn().mockResolvedValue({
                newPage: jest.fn().mockResolvedValue({
                    setDefaultTimeout: jest.fn(),
                    goto: jest.fn().mockResolvedValue({ ok: () => true }),
                    content: jest
                        .fn()
                        .mockResolvedValue('<html><body>Test</body></html>'),
                    screenshot: jest
                        .fn()
                        .mockResolvedValue(Buffer.from('screenshot')),
                    $: jest.fn().mockResolvedValue(null),
                    $$eval: jest.fn(),
                    waitForLoadState: jest.fn(),
                    title: jest.fn().mockResolvedValue('Test Page'),
                    url: jest.fn().mockResolvedValue('https://example.com'),
                }),
                close: jest.fn(),
            }),
            close: jest.fn(),
        }),
    },
}));

describe('BrowserController', () => {
    let controller: BrowserController;

    beforeEach(() => {
        controller = new BrowserController({ headless: true });
    });

    afterEach(async () => {
        await controller.close();
    });

    describe('launch', () => {
        it('should launch browser successfully', async () => {
            await expect(controller.launch()).resolves.not.toThrow();
        });
    });

    describe('navigateTo', () => {
        it('should navigate to URL after launch', async () => {
            await controller.launch();
            const result = await controller.navigateTo('https://example.com');
            expect(result).toBe(true);
        });

        it('should throw if browser not launched', async () => {
            await expect(
                controller.navigateTo('https://example.com')
            ).rejects.toThrow('Browser not launched');
        });
    });

    describe('getPageContent', () => {
        it('should return page content', async () => {
            await controller.launch();
            const content = await controller.getPageContent();
            expect(content).toContain('<html>');
        });

        it('should throw if browser not launched', async () => {
            await expect(controller.getPageContent()).rejects.toThrow(
                'Browser not launched'
            );
        });
    });

    describe('screenshot', () => {
        it('should take screenshot', async () => {
            await controller.launch();
            const screenshot = await controller.screenshot();
            expect(screenshot).toBeInstanceOf(Buffer);
        });
    });

    describe('getTitle', () => {
        it('should return page title', async () => {
            await controller.launch();
            const title = await controller.getTitle();
            expect(title).toBe('Test Page');
        });
    });

    describe('getUrl', () => {
        it('should return current URL', async () => {
            await controller.launch();
            const url = await controller.getUrl();
            expect(url).toBe('https://example.com');
        });
    });

    describe('close', () => {
        it('should close browser without error', async () => {
            await controller.launch();
            await expect(controller.close()).resolves.not.toThrow();
        });

        it('should handle close when not launched', async () => {
            await expect(controller.close()).resolves.not.toThrow();
        });
    });
});
