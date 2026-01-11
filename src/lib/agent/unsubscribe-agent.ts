import { BrowserController } from './browser-controller';
import { genai } from '@/lib/ai/gemini-client';

export interface UnsubscribeResult {
    url: string;
    success: boolean;
    message: string;
    screenshotBase64?: string;
}

interface PageAnalysis {
    hasUnsubscribeButton: boolean;
    buttonSelector?: string;
    hasForm: boolean;
    formFields?: string[];
    requiresEmail: boolean;
    successIndicators: string[];
    nextAction: 'click_button' | 'fill_form' | 'already_done' | 'unknown';
}

/**
 * AI-powered agent that navigates unsubscribe pages and completes the process
 */
export class UnsubscribeAgent {
    private browser: BrowserController;

    constructor() {
        this.browser = new BrowserController({ headless: true });
    }

    async unsubscribe(url: string, email?: string): Promise<UnsubscribeResult> {
        try {
            await this.browser.launch();

            // Navigate to the unsubscribe URL
            const navigated = await this.browser.navigateTo(url);
            if (!navigated) {
                return {
                    url,
                    success: false,
                    message: 'Failed to navigate to unsubscribe page',
                };
            }

            // Analyze the page using AI
            const pageContent = await this.browser.getPageContent();
            const analysis = await this.analyzePageWithAI(pageContent);

            // Take action based on analysis
            const result = await this.performUnsubscribeAction(analysis, email);

            // Take a screenshot for verification
            const screenshot = await this.browser.screenshot();

            return {
                url,
                success: result.success,
                message: result.message,
                screenshotBase64: screenshot.toString('base64'),
            };
        } catch (error) {
            console.error('Unsubscribe error:', error);
            return {
                url,
                success: false,
                message:
                    error instanceof Error
                        ? error.message
                        : 'Unknown error occurred',
            };
        } finally {
            await this.browser.close();
        }
    }

    private async analyzePageWithAI(
        pageContent: string
    ): Promise<PageAnalysis> {
        // Truncate content if too long
        const truncatedContent = pageContent.slice(0, 15000);

        const prompt = `Analyze this HTML page for unsubscribe functionality. Return a JSON object with:
- hasUnsubscribeButton: boolean - is there a button/link to unsubscribe
- buttonSelector: string - CSS selector for the unsubscribe button (if any)
- hasForm: boolean - is there a form to fill
- formFields: string[] - list of form field names/ids if form exists
- requiresEmail: boolean - does the form require email input
- successIndicators: string[] - text phrases that indicate successful unsubscribe
- nextAction: "click_button" | "fill_form" | "already_done" | "unknown"

HTML content:
${truncatedContent}

Respond with ONLY valid JSON, no markdown.`;

        try {
            const response = await genai.models.generateContentStream({
                model: 'gemini-2.5-flash',
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: {
                    temperature: 0.1,
                    thinkingConfig: { thinkingBudget: 0 },
                },
            });

            let text = '';
            for await (const chunk of response) {
                text += chunk.text || '';
            }

            // Clean up the response
            const cleanedText = text
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();

            return JSON.parse(cleanedText);
        } catch (error) {
            console.error('AI analysis error:', error);
            // Return default analysis
            return {
                hasUnsubscribeButton: true,
                hasForm: false,
                requiresEmail: false,
                successIndicators: [
                    'unsubscribed',
                    'success',
                    'removed',
                    'confirmed',
                ],
                nextAction: 'click_button',
            };
        }
    }

    private async performUnsubscribeAction(
        analysis: PageAnalysis,
        email?: string
    ): Promise<{ success: boolean; message: string }> {
        // Common unsubscribe button texts and selectors
        const buttonTexts = [
            'unsubscribe',
            'confirm',
            'yes',
            'opt out',
            'remove',
            'submit',
        ];

        const buttonSelectors = [
            analysis.buttonSelector,
            'button[type="submit"]',
            'input[type="submit"]',
            'a.unsubscribe',
            'button.unsubscribe',
            '#unsubscribe',
            '.unsubscribe-button',
            '[data-action="unsubscribe"]',
        ].filter(Boolean) as string[];

        switch (analysis.nextAction) {
            case 'already_done':
                return {
                    success: true,
                    message: 'Already unsubscribed',
                };

            case 'fill_form':
                if (analysis.requiresEmail && email) {
                    await this.browser.fillForm({ email });
                }

                // Check any checkboxes that might be required
                await this.browser.checkCheckbox([
                    'input[type="checkbox"]',
                    '[name*="unsubscribe"]',
                    '[name*="optout"]',
                ]);

                // Try to submit
                const formSubmitted = await this.browser.findAndClickByText(
                    buttonTexts,
                    ['button', 'input[type="submit"]']
                );

                if (formSubmitted) {
                    // Wait for page to update
                    await this.browser.waitForNavigation(3000);
                    const pageContent = await this.browser.getPageContent();

                    // Check for success indicators
                    const isSuccess = analysis.successIndicators.some(
                        (indicator) =>
                            pageContent
                                .toLowerCase()
                                .includes(indicator.toLowerCase())
                    );

                    return {
                        success: isSuccess,
                        message: isSuccess
                            ? 'Successfully unsubscribed'
                            : 'Form submitted, but success could not be verified',
                    };
                }

                return {
                    success: false,
                    message: 'Could not submit unsubscribe form',
                };

            case 'click_button':
                // Try specific selector first
                let clicked = false;

                for (const selector of buttonSelectors) {
                    clicked = await this.browser.findAndClickButton([selector]);
                    if (clicked) break;
                }

                // If no selector worked, try by text
                if (!clicked) {
                    clicked = await this.browser.findAndClickByText(
                        buttonTexts
                    );
                }

                if (clicked) {
                    await this.browser.waitForNavigation(3000);
                    const pageContent = await this.browser.getPageContent();

                    const isSuccess = analysis.successIndicators.some(
                        (indicator) =>
                            pageContent
                                .toLowerCase()
                                .includes(indicator.toLowerCase())
                    );

                    return {
                        success: isSuccess,
                        message: isSuccess
                            ? 'Successfully unsubscribed'
                            : 'Button clicked, but success could not be verified',
                    };
                }

                return {
                    success: false,
                    message: 'Could not find unsubscribe button',
                };

            default:
                // Try common approaches
                const attemptClick = await this.browser.findAndClickByText(
                    buttonTexts
                );

                return {
                    success: attemptClick,
                    message: attemptClick
                        ? 'Attempted to unsubscribe'
                        : 'Could not determine how to unsubscribe',
                };
        }
    }
}

/**
 * Convenience function to unsubscribe from a single URL
 */
export async function unsubscribeFromUrl(
    url: string,
    email?: string
): Promise<UnsubscribeResult> {
    const agent = new UnsubscribeAgent();
    return agent.unsubscribe(url, email);
}

/**
 * Bulk unsubscribe from multiple URLs
 */
export async function bulkUnsubscribe(
    urls: string[],
    email?: string
): Promise<UnsubscribeResult[]> {
    const results: UnsubscribeResult[] = [];

    // Process one at a time to avoid overwhelming resources
    for (const url of urls) {
        const result = await unsubscribeFromUrl(url, email);
        results.push(result);

        // Small delay between requests
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return results;
}
