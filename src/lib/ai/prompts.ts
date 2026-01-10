/**
 * AI Prompt Templates
 *
 * Contains all prompt templates for email categorization and summarization.
 * Prompts are designed to work with Gemini 2.5 Flash for structured output.
 */

import type { CategoryModel } from '@/generated/prisma/models';

/**
 * Build the categorization prompt for an email
 */
export function buildCategorizationPrompt(
    email: {
        subject: string;
        from: string;
        body: string | null;
        snippet: string | null;
    },
    categories: Pick<CategoryModel, 'id' | 'name' | 'description'>[]
): string {
    const categoryList = categories
        .map(
            (c) =>
                `- ID: "${c.id}", Name: "${c.name}"${
                    c.description ? `, Description: "${c.description}"` : ''
                }`
        )
        .join('\n');

    const emailContent = email.body?.slice(0, 2000) || email.snippet || '';

    return `You are an email categorization assistant. Analyze the following email and determine which category it belongs to.

## Available Categories:
${categoryList}

## Email to Categorize:
**From:** ${email.from}
**Subject:** ${email.subject}
**Content:**
${emailContent}

## Instructions:
1. Analyze the email content, sender, and subject
2. Match it to the most appropriate category based on the category descriptions
3. If no category fits well, respond with null for categoryId
4. Provide a confidence score between 0 and 1 (1 = very confident)

## Response Format:
Respond with ONLY valid JSON in this exact format (no markdown, no explanation):
{"categoryId": "category_id_here_or_null", "confidence": 0.85}`;
}

/**
 * Build the summarization prompt for an email
 */
export function buildSummarizationPrompt(email: {
    subject: string;
    from: string;
    body: string | null;
    snippet: string | null;
}): string {
    const emailContent = email.body?.slice(0, 3000) || email.snippet || '';

    return `Summarize this email in 1-2 complete sentences (maximum 280 characters total).

## Email:
**From:** ${email.from}
**Subject:** ${email.subject}
**Content:**
${emailContent}

## Instructions:
1. Summarize the key points of the email
2. Focus on actionable items or main purpose
3. Use plain, professional language
4. Do not include "Summary:" prefix
5. Do not include content from the subject in the summary

## Response Format:
Respond with ONLY the summary text, nothing else. No quotes, no markdown, just the plain text summary.`;
}

/**
 * Build a batch categorization prompt for multiple emails
 * More efficient when processing many emails at once
 */
export function buildBatchCategorizationPrompt(
    emails: {
        id: string;
        subject: string;
        from: string;
        body: string | null;
        snippet: string | null;
    }[],
    categories: Pick<CategoryModel, 'id' | 'name' | 'description'>[]
): string {
    const categoryList = categories
        .map(
            (c) =>
                `- ID: "${c.id}", Name: "${c.name}"${
                    c.description ? `, Description: "${c.description}"` : ''
                }`
        )
        .join('\n');

    const emailList = emails
        .map((e, i) => {
            const content = e.body?.slice(0, 500) || e.snippet || '';
            return `### Email ${i + 1} (ID: ${e.id})
**From:** ${e.from}
**Subject:** ${e.subject}
**Preview:** ${content.slice(0, 200)}...`;
        })
        .join('\n\n');

    return `You are an email categorization assistant. Categorize each email into the most appropriate category.

## Available Categories:
${categoryList}

## Emails to Categorize:
${emailList}

## Instructions:
1. Analyze each email's content, sender, and subject
2. Match each to the most appropriate category
3. If no category fits, use null for categoryId
4. Provide confidence scores between 0 and 1

## Response Format:
Respond with ONLY a valid JSON array (no markdown, no explanation):
[{"emailId": "id", "categoryId": "category_id_or_null", "confidence": 0.85}, ...]`;
}

/**
 * Build a batch summarization prompt for multiple emails
 */
export function buildBatchSummarizationPrompt(
    emails: {
        id: string;
        subject: string;
        from: string;
        body: string | null;
        snippet: string | null;
    }[]
): string {
    const emailList = emails
        .map((e, i) => {
            const content = e.body?.slice(0, 800) || e.snippet || '';
            return `### Email ${i + 1} (ID: ${e.id})
**From:** ${e.from}
**Subject:** ${e.subject}
**Content:** ${content}`;
        })
        .join('\n\n');

    return `You are an email summarization assistant. Create concise summaries for each email.

## Emails:
${emailList}

## Instructions:
1. Summarize the key points of each email
2. Keep each summary under 280 characters
3. Focus on actionable items or main purpose
4. Use plain, professional language

## Response Format:
Respond with ONLY a valid JSON array (no markdown, no explanation):
[{"emailId": "id", "summary": "Concise summary here..."}, ...]`;
}
