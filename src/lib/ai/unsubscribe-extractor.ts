/**
 * AI-powered Unsubscribe Link Extractor
 *
 * Uses Gemini AI to extract unsubscribe links from email content
 * when the regex-based extraction fails.
 */

import { genai, GEMINI_MODEL, isGeminiConfigured } from './gemini-client';
import { buildUnsubscribeExtractionPrompt } from './prompts';

/**
 * Extract unsubscribe link from email content using AI
 */
export async function extractUnsubscribeLinkWithAI(
    htmlBody: string | null,
    textBody: string | null
): Promise<string | null> {
    if (!isGeminiConfigured()) {
        console.warn(
            'Gemini not configured, skipping AI unsubscribe extraction'
        );
        return null;
    }

    const content = htmlBody || textBody;
    if (!content) {
        return null;
    }

    // Truncate content to avoid token limits
    const truncatedContent = content.slice(0, 15000);
    const truncatedContentFromEnd = content.slice(-15000);

    try {
        let result = await requestUnsubscribeExtractionAI(truncatedContent);
        console.log('AI unsubscribe extraction result:', result);

        if (!result || result === 'NONE' || result.toLowerCase() === 'none') {
            result = await requestUnsubscribeExtractionAI(
                truncatedContentFromEnd
            );
            console.log('AI unsubscribe extraction result from end:', result);

            if (
                !result ||
                result === 'NONE' ||
                result.toLowerCase() === 'none'
            ) {
                return null;
            }
        }

        // Validate that it's a URL
        if (result.startsWith('http://') || result.startsWith('https://')) {
            return result;
        }

        return null;
    } catch (error) {
        console.error('AI unsubscribe extraction error:', error);
        return null;
    }
}

/**
 * Function to request the AI to extract unsubscribe link
 */
async function requestUnsubscribeExtractionAI(
    content: string
): Promise<string | null> {
    const prompt = buildUnsubscribeExtractionPrompt(content);

    const response = await genai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
            {
                role: 'user',
                parts: [{ text: prompt }],
            },
        ],
        config: {
            temperature: 0,
            maxOutputTokens: 500,
            thinkingConfig: {
                thinkingBudget: 0,
            },
        },
    });

    return response.text?.trim() || null;
}
