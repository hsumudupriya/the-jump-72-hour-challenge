import { chromium, Browser, Page, BrowserContext } from 'playwright';

export interface BrowserControllerOptions {
    headless?: boolean;
    timeout?: number;
}

export class BrowserController {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private page: Page | null = null;
    private options: BrowserControllerOptions;

    constructor(options: BrowserControllerOptions = {}) {
        this.options = {
            headless: true,
            timeout: 30000,
            ...options,
        };
    }

    async launch(): Promise<void> {
        this.browser = await chromium.launch({
            headless: this.options.headless,
        });
        this.context = await this.browser.newContext({
            userAgent:
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        });
        this.page = await this.context.newPage();
        this.page.setDefaultTimeout(this.options.timeout!);
    }

    async close(): Promise<void> {
        if (this.context) {
            await this.context.close();
            this.context = null;
        }
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
        this.page = null;
    }

    async navigateTo(url: string): Promise<boolean> {
        if (!this.page) throw new Error('Browser not launched');

        try {
            const response = await this.page.goto(url, {
                waitUntil: 'domcontentloaded',
            });
            return response?.ok() ?? false;
        } catch (error) {
            console.error('Navigation error:', error);
            return false;
        }
    }

    async getPageContent(): Promise<string> {
        if (!this.page) throw new Error('Browser not launched');
        return this.page.content();
    }

    async screenshot(): Promise<Buffer> {
        if (!this.page) throw new Error('Browser not launched');
        return this.page.screenshot({ fullPage: true });
    }

    async findAndClickButton(selectors: string[]): Promise<boolean> {
        if (!this.page) throw new Error('Browser not launched');

        for (const selector of selectors) {
            try {
                const element = await this.page.$(selector);
                if (element) {
                    await element.click();
                    await this.page.waitForLoadState('networkidle', {
                        timeout: 5000,
                    });
                    return true;
                }
            } catch {
                // Try next selector
            }
        }
        return false;
    }

    async findAndClickByText(
        textPatterns: string[],
        elementTypes: string[] = ['button', 'a', 'input[type="submit"]']
    ): Promise<boolean> {
        if (!this.page) throw new Error('Browser not launched');

        for (const pattern of textPatterns) {
            for (const elementType of elementTypes) {
                try {
                    // Try exact text match
                    const element = await this.page.$(
                        `${elementType}:has-text("${pattern}")`
                    );
                    if (element && (await element.isVisible())) {
                        await element.click();
                        await this.page.waitForLoadState('networkidle', {
                            timeout: 5000,
                        });
                        return true;
                    }
                } catch {
                    // Try next pattern
                }
            }
        }
        return false;
    }

    async fillForm(formData: Record<string, string>): Promise<boolean> {
        if (!this.page) throw new Error('Browser not launched');

        try {
            for (const [field, value] of Object.entries(formData)) {
                // Try common selectors for form fields
                const selectors = [
                    `input[name="${field}"]`,
                    `input[id="${field}"]`,
                    `input[placeholder*="${field}" i]`,
                    `textarea[name="${field}"]`,
                    `select[name="${field}"]`,
                ];

                for (const selector of selectors) {
                    const element = await this.page.$(selector);
                    if (element) {
                        const tagName = await element.evaluate((el) =>
                            el.tagName.toLowerCase()
                        );
                        if (tagName === 'select') {
                            await element.selectOption(value);
                        } else {
                            await element.fill(value);
                        }
                        break;
                    }
                }
            }
            return true;
        } catch (error) {
            console.error('Form fill error:', error);
            return false;
        }
    }

    async checkCheckbox(selectors: string[]): Promise<boolean> {
        if (!this.page) throw new Error('Browser not launched');

        for (const selector of selectors) {
            try {
                const element = await this.page.$(selector);
                if (element) {
                    await element.check();
                    return true;
                }
            } catch {
                // Try next selector
            }
        }
        return false;
    }

    async selectAll(selector: string): Promise<void> {
        if (!this.page) throw new Error('Browser not launched');
        await this.page.$$eval(selector, (elements) => {
            elements.forEach((el) => {
                if (el instanceof HTMLInputElement && el.type === 'checkbox') {
                    el.checked = true;
                }
            });
        });
    }

    async waitForNavigation(timeout: number = 5000): Promise<void> {
        if (!this.page) throw new Error('Browser not launched');
        await this.page.waitForLoadState('networkidle', { timeout });
    }

    async getTitle(): Promise<string> {
        if (!this.page) throw new Error('Browser not launched');
        return this.page.title();
    }

    async getUrl(): Promise<string> {
        if (!this.page) throw new Error('Browser not launched');
        return this.page.url();
    }

    getPage(): Page | null {
        return this.page;
    }
}
