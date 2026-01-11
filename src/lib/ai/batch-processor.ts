/**
 * AI Batch Processor
 *
 * Processes emails in batches for AI categorization and summarization.
 * Handles database updates and error recovery.
 */

import { prisma } from '../prisma';
import { categorizeEmail } from './categorizer';
import { summarizeEmail } from './summarizer';
import { isGeminiConfigured } from './gemini-client';
import type { CategoryModel } from '@/generated/prisma/models';

export interface ProcessingStats {
    total: number;
    categorized: number;
    summarized: number;
    errors: number;
    skipped: number;
}

/**
 * Process uncategorized emails for a user
 */
export async function processEmailsForUser(
    userId: string,
    options: { limit?: number } = {}
): Promise<ProcessingStats> {
    const { limit = 50 } = options;

    const stats: ProcessingStats = {
        total: 0,
        categorized: 0,
        summarized: 0,
        errors: 0,
        skipped: 0,
    };

    if (!isGeminiConfigured()) {
        console.warn('Gemini not configured, skipping AI processing');
        return stats;
    }

    try {
        // Get user's categories
        const categories = await prisma.category.findMany({
            where: { userId },
            select: { id: true, name: true, description: true },
        });

        if (categories.length === 0) {
            console.log(
                'No categories defined, skipping AI categorization for user:',
                userId
            );
        }

        // Get emails that need processing (no summary or no category when categories exist)
        const emails = await prisma.email.findMany({
            where: {
                account: { userId },
                OR: [
                    { summary: null },
                    ...(categories.length > 0 ? [{ categoryId: null }] : []),
                ],
            },
            select: {
                id: true,
                subject: true,
                from: true,
                body: true,
                snippet: true,
                summary: true,
                categoryId: true,
            },
            take: limit,
            orderBy: { receivedAt: 'desc' },
        });

        stats.total = emails.length;

        if (emails.length === 0) {
            console.log('No emails need AI processing for user:', userId);
            return stats;
        }

        console.log(`Processing ${emails.length} emails for AI...`);

        // Process each email
        for (const email of emails) {
            try {
                const updates: {
                    summary?: string;
                    categoryId?: string | null;
                    aiConfidence?: number;
                } = {};

                // Summarize if needed
                if (!email.summary) {
                    const summary = await summarizeEmail(email, userId);
                    if (summary) {
                        updates.summary = summary;
                        stats.summarized++;
                    }
                }

                // Categorize if needed and categories exist
                if (!email.categoryId && categories.length > 0) {
                    const result = await categorizeEmail(email, categories, userId);
                    if (result.categoryId && result.confidence >= 0.5) {
                        updates.categoryId = result.categoryId;
                        updates.aiConfidence = result.confidence;
                        stats.categorized++;
                    }
                }

                // Update database if we have changes
                if (Object.keys(updates).length > 0) {
                    await prisma.email.update({
                        where: { id: email.id },
                        data: updates,
                    });
                } else {
                    stats.skipped++;
                }
            } catch (error) {
                console.error(`Error processing email ${email.id}:`, error);
                stats.errors++;
            }

            // Small delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        console.log(
            `AI processing complete: ${stats.categorized} categorized, ${stats.summarized} summarized, ${stats.errors} errors`
        );
        return stats;
    } catch (error) {
        console.error('Error in AI batch processing:', error);
        throw error;
    }
}

/**
 * Process emails for all users (for cron job)
 */
export async function processAllEmails(
    options: { limitPerUser?: number } = {}
): Promise<Map<string, ProcessingStats>> {
    const { limitPerUser = 20 } = options;
    const results = new Map<string, ProcessingStats>();

    if (!isGeminiConfigured()) {
        console.warn('Gemini not configured, skipping all AI processing');
        return results;
    }

    try {
        // Get all users with connected accounts
        const users = await prisma.user.findMany({
            where: {
                emailAccounts: { some: { isActive: true } },
            },
            select: { id: true, email: true },
        });

        console.log(`Processing emails for ${users.length} users...`);

        for (const user of users) {
            try {
                const stats = await processEmailsForUser(user.id, {
                    limit: limitPerUser,
                });
                results.set(user.id, stats);
            } catch (error) {
                console.error(
                    `Error processing emails for user ${user.email}:`,
                    error
                );
            }
        }

        return results;
    } catch (error) {
        console.error('Error in processAllEmails:', error);
        throw error;
    }
}

/**
 * Re-categorize emails after category changes
 */
export async function recategorizeEmails(
    userId: string,
    categories: Pick<CategoryModel, 'id' | 'name' | 'description'>[],
    options: { limit?: number } = {}
): Promise<ProcessingStats> {
    const { limit = 100 } = options;

    const stats: ProcessingStats = {
        total: 0,
        categorized: 0,
        summarized: 0,
        errors: 0,
        skipped: 0,
    };

    if (!isGeminiConfigured() || categories.length === 0) {
        return stats;
    }

    try {
        // Get all user's emails
        const emails = await prisma.email.findMany({
            where: { account: { userId } },
            select: {
                id: true,
                subject: true,
                from: true,
                body: true,
                snippet: true,
            },
            take: limit,
            orderBy: { receivedAt: 'desc' },
        });

        stats.total = emails.length;

        for (const email of emails) {
            try {
                const result = await categorizeEmail(email, categories, userId);
                if (result.categoryId) {
                    await prisma.email.update({
                        where: { id: email.id },
                        data: {
                            categoryId: result.categoryId,
                            aiConfidence: result.confidence,
                        },
                    });
                    stats.categorized++;
                } else {
                    // Clear category if no match
                    await prisma.email.update({
                        where: { id: email.id },
                        data: {
                            categoryId: null,
                            aiConfidence: null,
                        },
                    });
                    stats.skipped++;
                }
            } catch (error) {
                console.error(`Error recategorizing email ${email.id}:`, error);
                stats.errors++;
            }

            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        return stats;
    } catch (error) {
        console.error('Error in recategorizeEmails:', error);
        throw error;
    }
}
