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

    /**
     * Get only the visible text content from the page body
     * Excludes hidden elements and form elements
     * Useful for analyzing response pages without HTML noise
     */
    async getBodyTextContent(): Promise<string> {
        if (!this.page) throw new Error('Browser not launched');

        // First, mark hidden elements in the live DOM where getComputedStyle works
        await this.page.evaluate(() => {
            document.querySelectorAll('*').forEach((el) => {
                const htmlEl = el as HTMLElement;
                const style = window.getComputedStyle(htmlEl);
                if (
                    style.display === 'none' ||
                    style.visibility === 'hidden' ||
                    style.opacity === '0' ||
                    (htmlEl.offsetWidth === 0 && htmlEl.offsetHeight === 0)
                ) {
                    // Mark element with a temporary attribute
                    htmlEl.setAttribute('data-hidden-temp', 'true');
                }
            });
        });

        // Now extract text excluding hidden and form elements
        const text = await this.page.evaluate(() => {
            const body = document.body.cloneNode(true) as HTMLElement;

            // Remove non-visible and non-content elements
            body.querySelectorAll(
                'script, style, noscript, label, input, select, textarea, button, [hidden], [data-hidden-temp="true"]'
            ).forEach((el) => el.remove());

            return body.innerText || body.textContent || '';
        });

        // Clean up temporary attributes
        await this.page.evaluate(() => {
            document
                .querySelectorAll('[data-hidden-temp="true"]')
                .forEach((el) => {
                    el.removeAttribute('data-hidden-temp');
                });
        });

        return text;
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

    /**
     * Fill an input field by CSS selector
     */
    async fillInput(selector: string, value: string): Promise<boolean> {
        if (!this.page) throw new Error('Browser not launched');

        try {
            const element = await this.page.$(selector);
            if (element) {
                await element.fill(value);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Fill input error:', error);
            return false;
        }
    }

    /**
     * Select an option from a dropdown by CSS selector
     */
    async selectOption(selector: string, value: string): Promise<boolean> {
        if (!this.page) throw new Error('Browser not launched');

        try {
            const element = await this.page.$(selector);
            if (element) {
                await element.selectOption(value);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Select option error:', error);
            return false;
        }
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
     * Keywords used to identify unsubscribe-related elements
     */
    private static readonly UNSUBSCRIBE_KEYWORDS = [
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

    /**
     * Check if text contains any unsubscribe-related keywords
     */
    private static matchesKeyword(text: string): boolean {
        const lowerText = text.toLowerCase();
        return BrowserController.UNSUBSCRIBE_KEYWORDS.some((kw) =>
            lowerText.includes(kw)
        );
    }

    /**
     * Get element HTML with parent context for better selector generation
     */
    private static getElementContext(el: Element): string {
        const parent = el.parentElement;
        if (parent) {
            const clone = parent.cloneNode(true) as Element;
            clone
                .querySelectorAll('script, style, noscript')
                .forEach((s) => s.remove());
            return clone.outerHTML.slice(0, 2000);
        }
        return el.outerHTML.slice(0, 1000);
    }

    /**
     * Extract all forms from the page
     */
    private async extractForms(): Promise<string[]> {
        if (!this.page) throw new Error('Browser not launched');

        return this.page.evaluate((keywords: string[]) => {
            const matchesKeyword = (text: string): boolean => {
                const lowerText = text.toLowerCase();
                return keywords.some((kw) => lowerText.includes(kw));
            };

            const forms: string[] = [];

            document.querySelectorAll('form').forEach((form) => {
                const formHtml = form.outerHTML;

                // Let's push the complete form if it matches keywords
                if (matchesKeyword(formHtml)) {
                    forms.push(formHtml);
                    return;
                }

                if (
                    matchesKeyword(formHtml) ||
                    form.querySelectorAll('input, button, select').length > 0
                ) {
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

                    forms.push(
                        `<form action="${form.action || ''}" method="${
                            form.method || ''
                        }">\n${buttons.join('\n')}\n</form>`
                    );
                }
            });

            return forms;
        }, BrowserController.UNSUBSCRIBE_KEYWORDS);
    }

    /**
     * Extract all unsubscribe-related buttons from the page
     */
    private async extractButtons(): Promise<string[]> {
        if (!this.page) throw new Error('Browser not launched');

        return this.page.evaluate((keywords: string[]) => {
            const matchesKeyword = (text: string): boolean => {
                const lowerText = text.toLowerCase();
                return keywords.some((kw) => lowerText.includes(kw));
            };

            const getElementContext = (el: Element): string => {
                const parent = el.parentElement;
                if (parent) {
                    const clone = parent.cloneNode(true) as Element;
                    clone
                        .querySelectorAll('script, style, noscript')
                        .forEach((s) => s.remove());
                    return clone.outerHTML.slice(0, 2000);
                }
                return el.outerHTML.slice(0, 1000);
            };

            const buttons: string[] = [];

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
                        // buttons.push(getElementContext(btn));
                        buttons.push(btn.outerHTML);
                    }
                });

            return buttons;
        }, BrowserController.UNSUBSCRIBE_KEYWORDS);
    }

    /**
     * Extract all unsubscribe-related links from the page
     */
    private async extractLinks(): Promise<string[]> {
        if (!this.page) throw new Error('Browser not launched');

        return this.page.evaluate((keywords: string[]) => {
            const matchesKeyword = (text: string): boolean => {
                const lowerText = text.toLowerCase();
                return keywords.some((kw) => lowerText.includes(kw));
            };

            const links: string[] = [];

            document.querySelectorAll('a[href]').forEach((link) => {
                const anchor = link as HTMLAnchorElement;
                const text = anchor.textContent?.trim() || '';
                const href = anchor.href || '';
                if (
                    matchesKeyword(text) ||
                    matchesKeyword(href) ||
                    matchesKeyword(anchor.className)
                ) {
                    links.push(
                        `<a href="${href}" class="${anchor.className}">${text}</a>`
                    );
                }
            });

            return links;
        }, BrowserController.UNSUBSCRIBE_KEYWORDS);
    }

    /**
     * Extract relevant sections (footer, unsubscribe areas) from the page
     */
    private async extractRelevantSections(): Promise<string[]> {
        if (!this.page) throw new Error('Browser not launched');

        return this.page.evaluate(() => {
            const sections: string[] = [];

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
                        sections.push(html);
                    }
                });

            return sections;
        });
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

        const [forms, buttons, links, relevantSections] = await Promise.all([
            this.extractForms(),
            this.extractButtons(),
            this.extractLinks(),
            this.extractRelevantSections(),
        ]);

        return { forms, buttons, links, relevantSections };
    }

    getPage(): Page | null {
        return this.page;
    }
}
