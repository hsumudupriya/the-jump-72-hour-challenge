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
                    // Check if element is visible before clicking
                    const isVisible = await element
                        .isVisible()
                        .catch(() => false);
                    console.log(
                        'Trying selector:',
                        selector,
                        'Found:',
                        !!element,
                        'Visible:',
                        isVisible
                    );

                    if (!isVisible) {
                        // Try to scroll element into view
                        await element.scrollIntoViewIfNeeded().catch(() => {});
                    }

                    // Try clicking with force if needed
                    try {
                        await element.click({ timeout: 5000 });
                    } catch (clickError) {
                        console.log(
                            'Normal click failed, trying force click:',
                            clickError
                        );
                        await element.click({ force: true, timeout: 5000 });
                    }

                    // Wait for navigation, but don't fail if it times out
                    try {
                        await this.page.waitForLoadState('domcontentloaded', {
                            timeout: 5000,
                        });
                    } catch (error) {
                        // Navigation timeout is okay, page might not navigate
                        console.log(
                            'Navigation wait timed out, continuing.',
                            error
                        );
                    }
                    return true;
                }
            } catch (error) {
                console.log('Error with selector', selector, ':', error);
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
                        await this.page.waitForLoadState('domcontentloaded', {
                            timeout: 5000,
                        });
                        return true;
                    }
                } catch {
                    // Try next pattern
                    console.log(
                        'Error clicking element by text:',
                        pattern,
                        'of type:',
                        elementType
                    );
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
        await this.page.waitForLoadState('domcontentloaded', { timeout });
    }

    async getTitle(): Promise<string> {
        if (!this.page) throw new Error('Browser not launched');
        return this.page.title();
    }

    async getUrl(): Promise<string> {
        if (!this.page) throw new Error('Browser not launched');
        return this.page.url();
    }

    /**
     * Extract relevant unsubscribe-related elements from the page
     * This ensures we capture forms, buttons, and links that may be in the footer
     * regardless of their position in the HTML
     */
    async extractUnsubscribeElements(): Promise<{
        forms: string[];
        buttons: string[];
        links: string[];
        relevantSections: string[];
    }> {
        if (!this.page) throw new Error('Browser not launched');

        return this.page.evaluate(() => {
            const results = {
                forms: [] as string[],
                buttons: [] as string[],
                links: [] as string[],
                relevantSections: [] as string[],
            };

            const unsubscribeKeywords = [
                'unsubscribe',
                'opt-out',
                'optout',
                'opt out',
                'remove',
                'preference',
                'manage',
                'subscription',
                'email settings',
                'stop receiving',
                'confirm',
                'submit',
            ];

            const matchesKeyword = (text: string): boolean => {
                const lowerText = text.toLowerCase();
                return unsubscribeKeywords.some((kw) => lowerText.includes(kw));
            };

            const getElementContext = (el: Element): string => {
                // Get element with its parent context for better selector generation
                const parent = el.parentElement;
                if (parent) {
                    const clone = parent.cloneNode(true) as Element;
                    // Remove script and style tags
                    clone
                        .querySelectorAll('script, style, noscript')
                        .forEach((s) => s.remove());
                    return clone.outerHTML.slice(0, 2000);
                }
                return el.outerHTML.slice(0, 1000);
            };

            // Extract all forms
            document.querySelectorAll('form').forEach((form) => {
                const formHtml = form.outerHTML;
                if (
                    matchesKeyword(formHtml) ||
                    form.querySelectorAll('input, button, select').length > 0
                ) {
                    // Simplified form representation
                    // const inputs = Array.from(
                    //     form.querySelectorAll('input, select, textarea')
                    // )
                    //     .filter((input) => {
                    //         const el = input as HTMLElement;
                    //         return (
                    //             el.offsetParent !== null &&
                    //             el.offsetWidth > 0 &&
                    //             el.offsetHeight > 0
                    //         );
                    //     })
                    //     .map((input) => {
                    //         const el = input as HTMLInputElement;
                    //         return `<input type="${el.type || 'text'}" name="${
                    //             el.name || ''
                    //         }" id="${el.id || ''}" class="${
                    //             el.className || ''
                    //         }" placeholder="${el.placeholder || ''}" />`;
                    //     });
                    const buttons = Array.from(
                        form.querySelectorAll(
                            'button, input[type="submit"], input[type="button"]'
                        )
                    )
                        .filter((btn) => {
                            const el = btn as HTMLElement;
                            return (
                                el.offsetParent !== null &&
                                el.offsetWidth > 0 &&
                                el.offsetHeight > 0
                            );
                        })
                        .map((btn) => {
                            const el = btn as HTMLElement;
                            const tagName = el.tagName.toLowerCase();

                            if (tagName === 'button') {
                                return `<button type="${
                                    (el as HTMLButtonElement).type || 'button'
                                }" id="${el.id || ''}" class="${
                                    el.className || ''
                                }" name="${
                                    (el as HTMLButtonElement).name || ''
                                }">${btn.textContent?.trim() || ''}</button>`;
                            } else {
                                return `<input type="${
                                    (el as HTMLInputElement).type
                                }" id="${el.id || ''}" class="${
                                    el.className || ''
                                }" name="${
                                    (el as HTMLInputElement).name || ''
                                }" value="${
                                    (el as HTMLInputElement).value || ''
                                }" />`;
                            }
                        });
                    // results.forms.push(
                    //     `<form action="${form.action || ''}" method="${
                    //         form.method || ''
                    //     }">\n${inputs.join('\n')}\n${buttons.join(
                    //         '\n'
                    //     )}\n</form>`
                    // );
                    results.forms.push(
                        `<form action="${form.action || ''}" method="${
                            form.method || ''
                        }">\n${buttons.join('\n')}\n</form>`
                    );
                }
            });

            // Extract all buttons (including those outside forms)
            document
                .querySelectorAll(
                    'button, input[type="submit"], input[type="button"], [role="button"]'
                )
                .forEach((btn) => {
                    const text = btn.textContent?.trim() || '';
                    const el = btn as HTMLElement;
                    if (
                        matchesKeyword(text) ||
                        matchesKeyword(el.className) ||
                        matchesKeyword(el.id) ||
                        matchesKeyword(el.getAttribute('value') || '')
                    ) {
                        results.buttons.push(getElementContext(btn));
                    }
                });

            // Extract relevant links
            document.querySelectorAll('a[href]').forEach((link) => {
                const anchor = link as HTMLAnchorElement;
                const text = anchor.textContent?.trim() || '';
                const href = anchor.href || '';
                if (
                    matchesKeyword(text) ||
                    matchesKeyword(href) ||
                    matchesKeyword(anchor.className)
                ) {
                    results.links.push(
                        `<a href="${href}" class="${anchor.className}">${text}</a>`
                    );
                }
            });

            // Look for sections that might contain unsubscribe content
            document
                .querySelectorAll(
                    'footer, [class*="footer"], [id*="footer"], [class*="unsubscribe"], [id*="unsubscribe"], [class*="preference"], [class*="optout"]'
                )
                .forEach((section) => {
                    const clone = section.cloneNode(true) as Element;
                    clone
                        .querySelectorAll('script, style, noscript, img')
                        .forEach((s) => s.remove());
                    const html = clone.outerHTML.slice(0, 3000);
                    if (html.trim()) {
                        results.relevantSections.push(html);
                    }
                });

            return results;
        });
    }

    getPage(): Page | null {
        return this.page;
    }
}
