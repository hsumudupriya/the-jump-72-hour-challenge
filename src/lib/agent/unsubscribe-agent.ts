import { BrowserController } from './browser-controller';
import { genai } from '@/lib/ai/gemini-client';
import {
    trackAIUsage,
    extractUsageFromStream,
    AIStreamChunk,
} from '@/lib/ai/usage-tracker';
import * as fs from 'fs';
import * as path from 'path';

export interface UnsubscribeResult {
    url: string;
    success: boolean;
    message: string;
    screenshotBeforeBase64?: string;
    screenshotAfterBase64?: string;
    screenshotBeforePath?: string;
    screenshotAfterPath?: string;
}

interface FormFieldToFill {
    selector: string; // CSS selector for the form element
    type: 'text' | 'email' | 'checkbox' | 'radio' | 'select' | 'textarea';
    value: string; // Value to fill (for checkbox/radio: 'check' or 'uncheck')
    description?: string; // What this field is for
}

interface PageAnalysis {
    hasUnsubscribeButton: boolean;
    buttonSelector?: string;
    hasForm: boolean;
    formFields?: string[];
    formFieldsToFill?: FormFieldToFill[]; // Detailed form fields to fill
    submitButtonSelector?: string; // CSS selector for the form submit button
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
    private userId?: string;

    constructor(userId?: string) {
        this.browser = new BrowserController({ headless: true });
        this.userId = userId;
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

            // Generate timestamp and sanitized email for filenames
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const sanitizedEmail = (email || 'unknown').replace(
                /[^a-zA-Z0-9@.-]/g,
                '_'
            );

            // Take screenshot before action
            const screenshotBefore = await this.browser.screenshot();
            const screenshotBeforePath = await this.saveScreenshot(
                screenshotBefore,
                `${sanitizedEmail}_${timestamp}_before.png`
            );

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
            const screenshotAfterPath = await this.saveScreenshot(
                screenshotAfter,
                `${sanitizedEmail}_${timestamp}_after.png`
            );

            return {
                url,
                success: result.success,
                message: result.message,
                screenshotBeforeBase64: screenshotBefore.toString('base64'),
                screenshotAfterBase64: screenshotAfter.toString('base64'),
                screenshotBeforePath,
                screenshotAfterPath,
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

    /**
     * Save screenshot to logs/screenshots folder
     */
    private async saveScreenshot(
        buffer: Buffer,
        filename: string
    ): Promise<string> {
        const screenshotsDir = path.join(process.cwd(), 'logs', 'screenshots');

        // Ensure directory exists
        await fs.promises.mkdir(screenshotsDir, { recursive: true });

        const filePath = path.join(screenshotsDir, filename);
        await fs.promises.writeFile(filePath, buffer);

        console.log(`Screenshot saved: ${filePath}`);
        return filePath;
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
- formFieldsToFill: array of objects, each with:
  - selector: string - CSS selector for the form element (e.g., "#email", "input[name='email']", "input[type='checkbox']")
  - type: "text" | "email" | "checkbox" | "radio" | "select" | "textarea"
  - value: string - value to fill (use "{{EMAIL}}" as placeholder for user's email, for checkbox/radio use "check" or "uncheck")
  - description: string - what this field is for
- submitButtonSelector: string - CSS selector for the form's submit button
- requiresEmail: boolean - does the form require email input
- nextAction: "click_button" | "fill_form" | "already_done" | "unknown"

For formFieldsToFill, analyze the form HTML and determine:
1. Which fields are required or should be filled to unsubscribe
2. The best CSS selector to target each field
3. Appropriate values (use "{{EMAIL}}" for email fields, "check" for checkboxes that should be selected)

Extracted page elements:
${contentToAnalyze}

Respond with ONLY valid JSON, no markdown.`
            : `Analyze this HTML page for unsubscribe functionality. Return a JSON object with:
- hasUnsubscribeButton: boolean - is there a button/link to unsubscribe
- buttonSelector: string - CSS selector for the unsubscribe button (if any)
- hasForm: boolean - is there a form to fill
- formFields: string[] - list of form field names/ids if form exists
- formFieldsToFill: array of objects for each field to fill, with:
  - selector: string - CSS selector for the form element
  - type: "text" | "email" | "checkbox" | "radio" | "select" | "textarea"
  - value: string - value to fill (use "{{EMAIL}}" for email, "check"/"uncheck" for checkbox)
  - description: string - what this field is for
- submitButtonSelector: string - CSS selector for the form's submit button
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

            const chunks: AIStreamChunk[] = [];
            for await (const chunk of response) {
                chunks.push(chunk);
            }

            // Track AI usage if userId provided
            if (this.userId) {
                const usageMetadata = extractUsageFromStream(chunks);
                await trackAIUsage(
                    this.userId,
                    'page_analysis',
                    usageMetadata,
                    'gemini-2.5-flash'
                );
            }

            const text = chunks.map((c) => c.text || '').join('');

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
        // Fill form fields based on AI analysis
        if (analysis.formFieldsToFill && analysis.formFieldsToFill.length > 0) {
            for (const field of analysis.formFieldsToFill) {
                try {
                    // Replace {{EMAIL}} placeholder with actual email
                    let value = field.value;
                    if (value === '{{EMAIL}}' && email) {
                        value = email;
                    }

                    switch (field.type) {
                        case 'checkbox':
                            if (value === 'check') {
                                await this.browser.checkCheckbox([
                                    field.selector,
                                ]);
                                console.log(
                                    `Checked checkbox: ${field.selector}`
                                );
                            }
                            // For 'uncheck', we'd need an uncheckCheckbox method
                            break;
                        case 'radio':
                            if (value === 'check') {
                                await this.browser.checkCheckbox([
                                    field.selector,
                                ]);
                                console.log(
                                    `Selected radio: ${field.selector}`
                                );
                            }
                            break;
                        case 'select':
                            await this.browser.selectOption(
                                field.selector,
                                value
                            );
                            console.log(
                                `Selected option ${value} in: ${field.selector}`
                            );
                            break;
                        case 'text':
                        case 'email':
                        case 'textarea':
                        default:
                            await this.browser.fillInput(field.selector, value);
                            console.log(
                                `Filled ${field.type} field ${field.selector} with: ${value}`
                            );
                            break;
                    }
                } catch (error) {
                    console.error(
                        `Error filling field ${field.selector}:`,
                        error
                    );
                }
            }
        } else if (analysis.requiresEmail && email) {
            // Fallback: try to fill email using common selectors
            console.log(
                'No formFieldsToFill, falling back to generic email fill'
            );
            await this.browser.fillForm({ email });
        }

        // Try to submit using AI-provided submit button selector first
        let formSubmitted = false;

        if (analysis.submitButtonSelector) {
            console.log(
                'Clicking submit button:',
                analysis.submitButtonSelector
            );
            formSubmitted = await this.browser.findAndClickButton([
                analysis.submitButtonSelector,
            ]);
        }

        // Fallback to buttonSelector if submitButtonSelector didn't work
        if (!formSubmitted && analysis.buttonSelector) {
            console.log(
                'Falling back to buttonSelector:',
                analysis.buttonSelector
            );
            formSubmitted = await this.browser.findAndClickButton([
                analysis.buttonSelector,
            ]);
        }

        // Final fallback: try common button texts
        if (!formSubmitted) {
            const buttonTexts = [
                'unsubscribe',
                'confirm',
                'yes',
                'opt out',
                'remove',
                'submit',
            ];
            console.log('Falling back to button text search:', buttonTexts);
            formSubmitted = await this.browser.findAndClickByText(buttonTexts, [
                'button',
                'input[type="submit"]',
            ]);
        }

        if (formSubmitted) {
            // Wait for page to update
            await this.browser.waitForNavigation(3000);
            // Some pages doesn't navigate after submit. Instead, wait a second for the page to update.
            await new Promise((resolve) => setTimeout(resolve, 1000));
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

            const chunks: AIStreamChunk[] = [];
            for await (const chunk of response) {
                chunks.push(chunk);
            }

            // Track AI usage if userId provided
            if (this.userId) {
                const usageMetadata = extractUsageFromStream(chunks);
                await trackAIUsage(
                    this.userId,
                    'result_analysis',
                    usageMetadata,
                    'gemini-2.5-flash'
                );
            }

            const text = chunks.map((c) => c.text || '').join('');
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
    email?: string,
    userId?: string
): Promise<UnsubscribeResult> {
    const agent = new UnsubscribeAgent(userId);
    return agent.unsubscribe(url, email);
}

/**
 * Bulk unsubscribe from multiple URLs
 */
export async function bulkUnsubscribe(
    urls: string[],
    email?: string,
    userId?: string
): Promise<UnsubscribeResult[]> {
    const results: UnsubscribeResult[] = [];

    // Process one at a time to avoid overwhelming resources
    for (const url of urls) {
        const result = await unsubscribeFromUrl(url, email, userId);
        results.push(result);

        // Small delay between requests
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return results;
}
