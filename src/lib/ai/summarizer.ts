/**
 * Email Summarizer
 *
 * Uses Gemini AI to generate concise summaries of emails.
 * Summaries are kept under 280 characters for easy scanning.
 */

import { genai, GEMINI_MODEL, isGeminiConfigured } from './gemini-client';
import { buildSummarizationPrompt } from './prompts';
import { trackAIUsage, extractUsageFromStream, AIStreamChunk } from './usage-tracker';
import type { EmailModel } from '@/generated/prisma/models';

const MAX_SUMMARY_LENGTH = 280;

/**
 * Summarize a single email
 */
export async function summarizeEmail(
    email: Pick<EmailModel, 'subject' | 'from' | 'body' | 'snippet'>,
    userId?: string
): Promise<string | null> {
    if (!isGeminiConfigured()) {
        console.warn('Gemini not configured, skipping summarization');
        return null;
    }

    // If email has no content, use subject as summary
    if (!email.body && !email.snippet) {
        return email.subject.slice(0, MAX_SUMMARY_LENGTH);
    }

    try {
        const prompt = buildSummarizationPrompt(email);

        // Use streaming to ensure we get the complete response
        const responseStream = await genai.models.generateContentStream({
            model: GEMINI_MODEL,
            contents: prompt,
            config: {
                temperature: 0.3,
                topP: 0.9,
                topK: 40,
                maxOutputTokens: 512,
                // Disable thinking for faster, more direct responses
                thinkingConfig: {
                    thinkingBudget: 0,
                },
            },
        });

        // Collect all chunks to get the complete response
        const chunks: AIStreamChunk[] = [];
        for await (const chunk of responseStream) {
            chunks.push(chunk);
        }

        // Track AI usage if userId provided
        if (userId) {
            const usageMetadata = extractUsageFromStream(chunks);
            await trackAIUsage(userId, 'summarization', usageMetadata, GEMINI_MODEL);
        }

        let text = chunks.map(c => c.text || '').join('').trim();
        console.log(
            `Summarization AI response (Email: ${email.subject}):`,
            text
        );

        if (!text) {
            console.warn('Empty response from Gemini for summarization');
            return email.subject.slice(0, MAX_SUMMARY_LENGTH);
        }

        // Remove any quotes if present
        if (
            (text.startsWith('"') && text.endsWith('"')) ||
            (text.startsWith("'") && text.endsWith("'"))
        ) {
            text = text.slice(1, -1);
        }

        // Truncate if too long
        if (text.length > MAX_SUMMARY_LENGTH) {
            text = text.slice(0, MAX_SUMMARY_LENGTH - 3) + '...';
        }

        return text;
    } catch (error) {
        console.error('Error summarizing email:', error);
        return email.subject.slice(0, MAX_SUMMARY_LENGTH);
    }
}

/**
 * Batch summarize multiple emails
 * Uses individual calls for reliability
 */
export async function summarizeEmails(
    emails: Pick<EmailModel, 'id' | 'subject' | 'from' | 'body' | 'snippet'>[]
): Promise<Map<string, string | null>> {
    const results = new Map<string, string | null>();

    if (!isGeminiConfigured()) {
        // Return subject-based summaries
        for (const email of emails) {
            results.set(email.id, email.subject.slice(0, MAX_SUMMARY_LENGTH));
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
            const result = await summarizeEmail(email);
            results.set(email.id, result);
        });
        await Promise.all(promises);
    }

    return results;
}
