/**
 * Gemini AI Client
 *
 * Configures and exports the Google Generative AI client for
 * email categorization and summarization using Gemini 2.5 Flash.
 */

import { GoogleGenAI } from '@google/genai';

// Validate environment variable
if (!process.env.GEMINI_API_KEY) {
    console.warn(
        'Warning: GEMINI_API_KEY is not set. AI features will not work.'
    );
}

// Initialize the Google Generative AI client
export const genai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
});

// Model configuration
export const GEMINI_MODEL = 'gemini-2.5-flash';

// Generation config for structured outputs
export const generationConfig = {
    temperature: 0.2, // Low temperature for consistent categorization
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 1024,
};

// Safety settings - allow all content for email processing
export const safetySettings = [
    {
        category: 'HARM_CATEGORY_HARASSMENT' as const,
        threshold: 'BLOCK_NONE' as const,
    },
    {
        category: 'HARM_CATEGORY_HATE_SPEECH' as const,
        threshold: 'BLOCK_NONE' as const,
    },
    {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT' as const,
        threshold: 'BLOCK_NONE' as const,
    },
    {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT' as const,
        threshold: 'BLOCK_NONE' as const,
    },
];

/**
 * Check if the Gemini API is configured
 */
export function isGeminiConfigured(): boolean {
    return !!process.env.GEMINI_API_KEY;
}
