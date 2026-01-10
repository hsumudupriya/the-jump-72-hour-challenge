import { prisma } from './prisma';
import {
    createGmailClient,
    listMessages,
    getMessages,
    archiveMessages,
    extractHeaders,
    extractBody,
    extractUnsubscribeLink,
    parseEmailAddresses,
} from './gmail';
import { processEmailsForUser } from './ai';

export interface SyncResult {
    accountId: string;
    email: string;
    fetched: number;
    stored: number;
    archived: number;
    aiProcessed: number;
    errors: string[];
}

export interface SyncOptions {
    maxEmails?: number;
    archiveAfterImport?: boolean;
    query?: string;
    runAiProcessing?: boolean;
}

const DEFAULT_OPTIONS: SyncOptions = {
    maxEmails: 50,
    archiveAfterImport: true,
    query: 'in:inbox',
    runAiProcessing: true,
};

/**
 * Sync emails for a specific account
 */
export async function syncEmailsForAccount(
    accountId: string,
    options: SyncOptions = {}
): Promise<SyncResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const result: SyncResult = {
        accountId,
        email: '',
        fetched: 0,
        stored: 0,
        archived: 0,
        aiProcessed: 0,
        errors: [],
    };

    try {
        // Create Gmail client
        const client = await createGmailClient(accountId);
        if (!client) {
            result.errors.push('Failed to create Gmail client');
            return result;
        }
        result.email = client.email;

        // List messages from inbox
        const messageList = await listMessages(client, {
            maxResults: opts.maxEmails,
            query: opts.query,
        });

        const messageIds =
            messageList.messages?.map((m) => m.id!).filter(Boolean) ?? [];
        result.fetched = messageIds.length;

        if (messageIds.length === 0) {
            return result;
        }

        // Get existing email IDs to avoid duplicates
        const existingEmails = await prisma.email.findMany({
            where: {
                accountId,
                gmailId: { in: messageIds },
            },
            select: { gmailId: true },
        });
        const existingIds = new Set(existingEmails.map((e) => e.gmailId));

        // Filter out already imported emails
        const newMessageIds = messageIds.filter((id) => !existingIds.has(id));

        if (newMessageIds.length === 0) {
            return result;
        }

        // Fetch full message details
        const messages = await getMessages(client, newMessageIds, 'full');

        // Process and store each message
        const emailsToCreate = [];
        const idsToArchive: string[] = [];

        for (const message of messages) {
            try {
                const emailData = processMessage(message, accountId);
                if (emailData) {
                    emailsToCreate.push(emailData);
                    if (opts.archiveAfterImport && message.id) {
                        idsToArchive.push(message.id);
                    }
                }
            } catch (error) {
                result.errors.push(
                    `Failed to process message ${message.id}: ${error}`
                );
            }
        }

        // Bulk insert emails
        if (emailsToCreate.length > 0) {
            await prisma.email.createMany({
                data: emailsToCreate,
                skipDuplicates: true,
            });
            result.stored = emailsToCreate.length;
        }

        // Archive processed emails in Gmail
        if (opts.archiveAfterImport && idsToArchive.length > 0) {
            try {
                await archiveMessages(client, idsToArchive);
                result.archived = idsToArchive.length;
            } catch (error) {
                result.errors.push(`Failed to archive messages: ${error}`);
            }
        }
    } catch (error) {
        result.errors.push(`Sync failed: ${error}`);
    }

    return result;
}

/**
 * Sync emails for all active accounts of a user
 */
export async function syncEmailsForUser(
    userId: string,
    options: SyncOptions = {}
): Promise<{ results: SyncResult[]; aiStats: { categorized: number; summarized: number } }> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const accounts = await prisma.emailAccount.findMany({
        where: { userId, isActive: true },
        select: { id: true },
    });

    const results = await Promise.all(
        accounts.map((account) => syncEmailsForAccount(account.id, opts))
    );

    // Run AI processing after sync if enabled
    let aiStats = { categorized: 0, summarized: 0 };
    if (opts.runAiProcessing) {
        try {
            const processingStats = await processEmailsForUser(userId, {
                limit: opts.maxEmails,
            });
            aiStats = {
                categorized: processingStats.categorized,
                summarized: processingStats.summarized,
            };
            
            // Add AI processing count to results
            for (const result of results) {
                result.aiProcessed = processingStats.categorized + processingStats.summarized;
            }
        } catch (error) {
            console.error('AI processing failed:', error);
            for (const result of results) {
                result.errors.push(`AI processing failed: ${error}`);
            }
        }
    }

    return { results, aiStats };
}

/**
 * Sync emails for all active accounts (for cron job)
 */
export async function syncAllEmails(
    options: SyncOptions = {}
): Promise<SyncResult[]> {
    const accounts = await prisma.emailAccount.findMany({
        where: { isActive: true },
        select: { id: true },
    });

    // Process accounts sequentially to avoid rate limiting issues
    const results: SyncResult[] = [];
    for (const account of accounts) {
        const result = await syncEmailsForAccount(account.id, options);
        results.push(result);
    }

    return results;
}

/**
 * Process a Gmail message into our database format
 */
function processMessage(
    message: Awaited<ReturnType<typeof getMessages>>[0],
    accountId: string
): {
    accountId: string;
    gmailId: string;
    threadId: string | null;
    subject: string;
    snippet: string | null;
    body: string | null;
    bodyHtml: string | null;
    from: string;
    to: string[];
    headers: Record<string, string>;
    unsubscribeLink: string | null;
    isRead: boolean;
    receivedAt: Date;
} | null {
    if (!message.id) return null;

    const headers = extractHeaders(message);
    const { text: textBody, html: htmlBody } = extractBody(message);
    const unsubscribeLink = extractUnsubscribeLink(headers, htmlBody);

    // Parse date
    const dateHeader = headers['date'];
    const internalDate = message.internalDate;
    let receivedAt: Date;

    if (internalDate) {
        receivedAt = new Date(parseInt(internalDate, 10));
    } else if (dateHeader) {
        receivedAt = new Date(dateHeader);
    } else {
        receivedAt = new Date();
    }

    // Parse recipients
    const toHeader = headers['to'] ?? '';
    const toAddresses = parseEmailAddresses(toHeader);

    // Check if read
    const labelIds = message.labelIds ?? [];
    const isRead = !labelIds.includes('UNREAD');

    return {
        accountId,
        gmailId: message.id,
        threadId: message.threadId ?? null,
        subject: headers['subject'] ?? '(No Subject)',
        snippet: message.snippet ?? null,
        body: textBody,
        bodyHtml: htmlBody,
        from: headers['from'] ?? 'Unknown',
        to: toAddresses,
        headers,
        unsubscribeLink,
        isRead,
        receivedAt,
    };
}

/**
 * Get sync statistics for a user
 */
export async function getSyncStats(userId: string): Promise<{
    totalEmails: number;
    categorizedEmails: number;
    uncategorizedEmails: number;
    emailsByCategory: { categoryId: string; name: string; count: number }[];
}> {
    const [totalEmails, categorizedEmails, emailsByCategory] =
        await Promise.all([
            prisma.email.count({
                where: {
                    account: { userId },
                },
            }),
            prisma.email.count({
                where: {
                    account: { userId },
                    categoryId: { not: null },
                },
            }),
            prisma.category.findMany({
                where: { userId },
                select: {
                    id: true,
                    name: true,
                    _count: { select: { emails: true } },
                },
            }),
        ]);

    return {
        totalEmails,
        categorizedEmails,
        uncategorizedEmails: totalEmails - categorizedEmails,
        emailsByCategory: emailsByCategory.map((c) => ({
            categoryId: c.id,
            name: c.name,
            count: c._count.emails,
        })),
    };
}
