/**
 * Email Categorizer
 *
 * Uses Gemini AI to categorize emails into user-defined categories.
 * Returns category ID and confidence score.
 */

import { genai, GEMINI_MODEL, isGeminiConfigured } from './gemini-client';
import { buildCategorizationPrompt } from './prompts';
import type { CategoryModel, EmailModel } from '@/generated/prisma/models';

export interface CategorizationResult {
    categoryId: string | null;
    confidence: number;
}

/**
 * Categorize a single email against user categories
 */
export async function categorizeEmail(
    email: Pick<EmailModel, 'subject' | 'from' | 'body' | 'snippet'>,
    categories: Pick<CategoryModel, 'id' | 'name' | 'description'>[]
): Promise<CategorizationResult> {
    if (!isGeminiConfigured()) {
        console.warn('Gemini not configured, skipping categorization');
        return { categoryId: null, confidence: 0 };
    }

    if (categories.length === 0) {
        return { categoryId: null, confidence: 0 };
    }

    try {
        const prompt = buildCategorizationPrompt(email, categories);

        // Use streaming to ensure we get the complete response
        const responseStream = await genai.models.generateContentStream({
            model: GEMINI_MODEL,
            contents: prompt,
            config: {
                temperature: 0.2,
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 512,
                // Disable thinking for faster, more direct responses
                thinkingConfig: {
                    thinkingBudget: 0,
                },
            },
        });

        // Collect all chunks to get the complete response
        const chunks: string[] = [];
        for await (const chunk of responseStream) {
            if (chunk.text) {
                chunks.push(chunk.text);
            }
        }

        const text = chunks.join('').trim();
        console.log(
            `Categorization AI response (Email: ${email.subject}):`,
            text
        );

        if (!text) {
            console.warn('Empty response from Gemini for categorization');
            return { categoryId: null, confidence: 0 };
        }

        // Parse JSON response
        const result = parseCategorizationResponse(text, categories);
        return result;
    } catch (error) {
        console.error('Error categorizing email:', error);
        return { categoryId: null, confidence: 0 };
    }
}

/**
 * Parse the categorization response from Gemini
 */
function parseCategorizationResponse(
    text: string,
    categories: Pick<CategoryModel, 'id' | 'name' | 'description'>[]
): CategorizationResult {
    try {
        // Remove any markdown code blocks if present
        let jsonText = text;
        if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```/g, '');
        }
        jsonText = jsonText.trim();

        const parsed = JSON.parse(jsonText);

        // Validate categoryId exists in our categories
        const categoryId = parsed.categoryId;
        if (
            categoryId !== null &&
            !categories.some((c) => c.id === categoryId)
        ) {
            console.warn(
                `Invalid categoryId from AI: ${categoryId}, setting to null`
            );
            return { categoryId: null, confidence: 0 };
        }

        // Ensure confidence is between 0 and 1
        let confidence = parseFloat(parsed.confidence) || 0;
        confidence = Math.max(0, Math.min(1, confidence));

        return {
            categoryId: categoryId || null,
            confidence,
        };
    } catch (error) {
        console.error('Failed to parse categorization response:', text, error);
        return { categoryId: null, confidence: 0 };
    }
}

/**
 * Batch categorize multiple emails
 * Uses individual calls for reliability (batch prompts can be less accurate)
 */
export async function categorizeEmails(
    emails: Pick<EmailModel, 'id' | 'subject' | 'from' | 'body' | 'snippet'>[],
    categories: Pick<CategoryModel, 'id' | 'name' | 'description'>[]
): Promise<Map<string, CategorizationResult>> {
    const results = new Map<string, CategorizationResult>();

    if (!isGeminiConfigured() || categories.length === 0) {
        // Return empty results for all emails
        for (const email of emails) {
            results.set(email.id, { categoryId: null, confidence: 0 });
        }
        return results;
    }

    // Process emails in parallel with concurrency limit
    const CONCURRENCY = 3;
    const chunks: (typeof emails)[] = [];
    for (let i = 0; i < emails.length; i += CONCURRENCY) {
        chunks.push(emails.slice(i, i + CONCURRENCY));
    }

    for (const chunk of chunks) {
        const promises = chunk.map(async (email) => {
            const result = await categorizeEmail(email, categories);
            results.set(email.id, result);
        });
        await Promise.all(promises);
    }

    return results;
}
