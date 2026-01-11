import { BrowserController } from './browser-controller';
import { genai } from '@/lib/ai/gemini-client';

export interface UnsubscribeResult {
    url: string;
    success: boolean;
    message: string;
    screenshotBeforeBase64?: string;
    screenshotAfterBase64?: string;
}

interface PageAnalysis {
    hasUnsubscribeButton: boolean;
    buttonSelector?: string;
    hasForm: boolean;
    formFields?: string[];
    requiresEmail: boolean;
    nextAction: 'click_button' | 'fill_form' | 'already_done' | 'unknown';
}

interface UnsubscribeResultAnalysis {
    success: boolean;
    reason: string;
    status:
        | 'unsubscribed'
        | 'already_unsubscribed'
        | 'error'
        | 'unknown'
        | 'requires_action';
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

            // Take screenshot before action
            const screenshotBefore = await this.browser.screenshot();

            // Extract relevant elements and analyze the page using AI
            const extractedElements =
                await this.browser.extractUnsubscribeElements();
            const fullPageContent = await this.browser.getPageContent();
            const analysis = await this.analyzePageWithAI(
                extractedElements,
                fullPageContent
            );
            console.log('Extracted elements:', extractedElements);
            console.log('Unsubscribe page analysis:', analysis);

            // Take action based on analysis
            const result = await this.performUnsubscribeAction(analysis, email);
            console.log('Unsubscribe action result:', result);

            // Take screenshot after action
            const screenshotAfter = await this.browser.screenshot();

            return {
                url,
                success: result.success,
                message: result.message,
                screenshotBeforeBase64: screenshotBefore.toString('base64'),
                screenshotAfterBase64: screenshotAfter.toString('base64'),
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
        extractedElements: {
            forms: string[];
            buttons: string[];
            links: string[];
            relevantSections: string[];
        },
        fullPageContent: string
    ): Promise<PageAnalysis> {
        // Build content from extracted elements
        const extractedContent = [
            extractedElements.forms.length > 0
                ? `FORMS:\n${extractedElements.forms.join('\n\n')}`
                : '',
            extractedElements.buttons.length > 0
                ? `BUTTONS:\n${extractedElements.buttons.join('\n\n')}`
                : '',
            extractedElements.links.length > 0
                ? `UNSUBSCRIBE-RELATED LINKS:\n${extractedElements.links.join(
                      '\n'
                  )}`
                : '',
            extractedElements.relevantSections.length > 0
                ? `RELEVANT SECTIONS (footer, etc):\n${extractedElements.relevantSections.join(
                      '\n\n'
                  )}`
                : '',
        ]
            .filter(Boolean)
            .join('\n\n---\n\n');

        // Use extracted content if available, otherwise fall back to truncated full page
        const hasExtractedContent = extractedContent.trim().length > 100;
        const contentToAnalyze = hasExtractedContent
            ? extractedContent.slice(0, 20000)
            : fullPageContent.slice(0, 15000);

        const prompt = hasExtractedContent
            ? `Analyze these extracted elements from an unsubscribe page. Return a JSON object with:
- hasUnsubscribeButton: boolean - is there a button/link to unsubscribe
- buttonSelector: string - CSS selector for the unsubscribe button (best guess based on context, e.g., "button:has-text('Unsubscribe')" or "#unsubscribe-btn")
- hasForm: boolean - is there a form to fill
- formFields: string[] - list of form field names/ids if form exists
- requiresEmail: boolean - does the form require email input
- nextAction: "click_button" | "fill_form" | "already_done" | "unknown"

Extracted page elements:
${contentToAnalyze}

Respond with ONLY valid JSON, no markdown.`
            : `Analyze this HTML page for unsubscribe functionality. Return a JSON object with:
- hasUnsubscribeButton: boolean - is there a button/link to unsubscribe
- buttonSelector: string - CSS selector for the unsubscribe button (if any)
- hasForm: boolean - is there a form to fill
- formFields: string[] - list of form field names/ids if form exists
- requiresEmail: boolean - does the form require email input
- nextAction: "click_button" | "fill_form" | "already_done" | "unknown"

HTML content:
${contentToAnalyze}

Respond with ONLY valid JSON, no markdown.`;
        // console.log('Unsubscribe analysis prompt:', prompt);

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
                nextAction: 'click_button',
            };
        }
    }

    /**
     * Performs the unsubscribe action based on the analyzed page structure.
     *
     * This method handles different unsubscribe scenarios:
     * - Already unsubscribed pages
     * - Form-based unsubscriptions (with optional email input and checkbox selection)
     * - Button-based unsubscriptions (attempting multiple selector strategies)
     * - Fallback attempts for unknown page structures
     *
     * The method will attempt to click buttons using both CSS selectors and text-based matching,
     * including `input[type="submit"]` and `input[type="button"]` elements.
     *
     * @param analysis - The page analysis result containing action type, selectors, and success indicators
     * @param email - Optional email address to fill in forms that require it
     * @returns A promise resolving to an object containing:
     *          - `success`: Whether the unsubscribe action was successful
     *          - `message`: A descriptive message about the outcome
     *
     * @remarks
     * After performing actions, the method waits for page navigation and validates success
     * by checking if any success indicators appear in the updated page content.
     */
    private async performUnsubscribeAction(
        analysis: PageAnalysis,
        email?: string
    ): Promise<{ success: boolean; message: string }> {
        switch (analysis.nextAction) {
            case 'already_done':
                return {
                    success: true,
                    message: 'Already unsubscribed',
                };

            case 'fill_form':
                return this.performFillFormAction(analysis, email);

            case 'click_button':
                return this.performClickButtonAction(analysis);

            default:
                return this.performFallbackAction();
        }
    }

    /**
     * Handle form-based unsubscription
     */
    private async performFillFormAction(
        analysis: PageAnalysis,
        email?: string
    ): Promise<{ success: boolean; message: string }> {
        const buttonTexts = [
            'unsubscribe',
            'confirm',
            'yes',
            'opt out',
            'remove',
            'submit',
        ];

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
            // Get only visible text content for cleaner analysis
            const bodyText = await this.browser.getBodyTextContent();

            // Analyze the response page
            const resultAnalysis = await this.analyzeUnsubscribeResult(
                bodyText
            );

            return {
                success: resultAnalysis.success,
                message: resultAnalysis.reason,
            };
        }

        return {
            success: false,
            message: 'Could not submit unsubscribe form',
        };
    }

    /**
     * Handle button-based unsubscription
     */
    private async performClickButtonAction(
        analysis: PageAnalysis
    ): Promise<{ success: boolean; message: string }> {
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

        // Try specific selector first
        let clicked = false;

        for (const selector of buttonSelectors) {
            clicked = await this.browser.findAndClickButton([selector]);
            console.log(
                'Clicked unsubscribe button by selector: ' + selector,
                clicked
            );
            if (clicked) break;
        }

        // If no selector worked, try by text
        if (!clicked) {
            clicked = await this.browser.findAndClickByText(buttonTexts);
            console.log(
                'Clicked unsubscribe button by text: ' + buttonTexts,
                clicked
            );
        }

        if (clicked) {
            await this.browser.waitForNavigation(3000);
            // Get only visible text content for cleaner analysis
            const bodyText = await this.browser.getBodyTextContent();

            // Analyze the response page
            const resultAnalysis = await this.analyzeUnsubscribeResult(
                bodyText
            );

            return {
                success: resultAnalysis.success,
                message: resultAnalysis.reason,
            };
        }

        return {
            success: false,
            message: 'Could not find unsubscribe button',
        };
    }

    /**
     * Analyze the response page after unsubscribe action
     * Uses heuristics first, falls back to AI for ambiguous cases
     */
    private async analyzeUnsubscribeResult(
        bodyText: string
    ): Promise<UnsubscribeResultAnalysis> {
        console.log('Analyzing unsubscribe result body text:', bodyText);
        // Try heuristics first to save API tokens
        const heuristicResult =
            this.analyzeUnsubscribeResultWithHeuristics(bodyText);
        console.log('Heuristic unsubscribe result:', heuristicResult);

        // If heuristics found a definitive result, return it
        if (heuristicResult.status !== 'unknown') {
            return heuristicResult;
        }

        // Fall back to AI for ambiguous cases
        const truncatedContent = bodyText.slice(0, 10000);

        const prompt = `Analyze this page content after an unsubscribe action was attempted. Determine if the unsubscription was successful.

Return a JSON object with:
- success: boolean - true if unsubscribe was successful, false otherwise
- reason: string - brief explanation of the result (e.g., "Successfully unsubscribed from mailing list", "Link has expired", "Email not found")
- status: one of "unsubscribed" | "already_unsubscribed" | "error" | "unknown" | "requires_action"

Look for:
- Success indicators: "successfully unsubscribed", "you have been removed", "unsubscribe confirmed", "preferences updated"
- Already done indicators: "already unsubscribed", "not subscribed", "email not found in list"
- Error indicators: "link expired", "invalid token", "error occurred", "something went wrong"
- Requires action: "confirm your email", "check your inbox", "one more step"

Page content:
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

            const cleanedText = text
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();

            return JSON.parse(cleanedText);
        } catch (error) {
            console.error('AI result analysis error:', error);
            // Return heuristic result if AI fails
            return heuristicResult;
        }
    }

    /**
     * Fallback heuristic analysis when AI fails
     */
    private analyzeUnsubscribeResultWithHeuristics(
        pageContent: string
    ): UnsubscribeResultAnalysis {
        const lowerContent = pageContent.toLowerCase();

        // Success patterns
        const successPatterns = [
            'successfully unsubscribed',
            'you have been unsubscribed',
            'unsubscribe confirmed',
            'removed from',
            'you have been removed',
            'preferences updated',
            'subscription cancelled',
            'opt-out successful',
            'you will no longer receive',
        ];

        // Already unsubscribed patterns
        const alreadyDonePatterns = [
            'already unsubscribed',
            'not subscribed',
            'email not found',
            'not on our list',
            'no subscription found',
        ];

        // Error patterns
        const errorPatterns = [
            'link expired',
            'link has expired',
            'invalid token',
            'token expired',
            'error occurred',
            'something went wrong',
            'unable to process',
            'request failed',
        ];

        // Check for success
        for (const pattern of successPatterns) {
            if (lowerContent.includes(pattern)) {
                return {
                    success: true,
                    reason: 'Successfully unsubscribed',
                    status: 'unsubscribed',
                };
            }
        }

        // Check for already unsubscribed
        for (const pattern of alreadyDonePatterns) {
            if (lowerContent.includes(pattern)) {
                return {
                    success: true,
                    reason: 'Already unsubscribed or not subscribed',
                    status: 'already_unsubscribed',
                };
            }
        }

        // Check for errors
        for (const pattern of errorPatterns) {
            if (lowerContent.includes(pattern)) {
                return {
                    success: false,
                    reason: 'Unsubscribe failed - ' + pattern,
                    status: 'error',
                };
            }
        }

        // Unknown result
        return {
            success: false,
            reason: 'Could not verify unsubscribe result',
            status: 'unknown',
        };
    }

    /**
     * Handle unknown page structures with fallback approach
     */
    private async performFallbackAction(): Promise<{
        success: boolean;
        message: string;
    }> {
        const buttonTexts = [
            'unsubscribe',
            'confirm',
            'yes',
            'opt out',
            'remove',
            'submit',
        ];

        const attemptClick = await this.browser.findAndClickByText(buttonTexts);

        return {
            success: attemptClick,
            message: attemptClick
                ? 'Attempted to unsubscribe'
                : 'Could not determine how to unsubscribe',
        };
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
