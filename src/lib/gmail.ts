import { google, gmail_v1 } from 'googleapis';
import Bottleneck from 'bottleneck';
import { prisma } from './prisma';

// Gmail API rate limits: 250 quota units per user per second
// Most operations cost 5-100 units, so we'll be conservative
const limiter = new Bottleneck({
    maxConcurrent: 5,
    minTime: 100, // 100ms between requests = 10 requests/second max
});

export interface GmailClient {
    gmail: gmail_v1.Gmail;
    email: string;
    accountId: string;
}

/**
 * Create an authenticated Gmail client for a specific email account
 */
export async function createGmailClient(
    accountId: string
): Promise<GmailClient | null> {
    const account = await prisma.emailAccount.findUnique({
        where: { id: accountId },
    });

    if (!account || !account.accessToken) {
        console.error(`No account or access token found for ${accountId}`);
        return null;
    }

    // Check if token is expired and needs refresh
    const isExpired =
        account.expiresAt && new Date(account.expiresAt) < new Date();

    let accessToken = account.accessToken;

    if (isExpired && account.refreshToken) {
        try {
            const refreshedToken = await refreshAccessToken(
                account.refreshToken
            );
            if (refreshedToken) {
                accessToken = refreshedToken.access_token;

                // Update token in database
                await prisma.emailAccount.update({
                    where: { id: accountId },
                    data: {
                        accessToken: refreshedToken.access_token,
                        expiresAt: new Date(
                            Date.now() + refreshedToken.expires_in * 1000
                        ),
                        refreshToken:
                            refreshedToken.refresh_token ??
                            account.refreshToken,
                    },
                });
            }
        } catch (error) {
            console.error('Failed to refresh access token:', error);
            return null;
        }
    }

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: account.refreshToken,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    return {
        gmail,
        email: account.email,
        accountId: account.id,
    };
}

/**
 * Refresh an expired access token
 */
async function refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    expires_in: number;
    refresh_token?: string;
} | null> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        }),
    });

    if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
    }

    return response.json();
}

/**
 * List messages from Gmail inbox with rate limiting
 */
export async function listMessages(
    client: GmailClient,
    options: {
        maxResults?: number;
        pageToken?: string;
        query?: string;
    } = {}
): Promise<gmail_v1.Schema$ListMessagesResponse> {
    return limiter.schedule(() =>
        client.gmail.users.messages
            .list({
                userId: 'me',
                maxResults: options.maxResults ?? 50,
                pageToken: options.pageToken,
                q: options.query ?? 'in:inbox',
            })
            .then((res) => res.data)
    );
}

/**
 * Get full message details with rate limiting
 */
export async function getMessage(
    client: GmailClient,
    messageId: string,
    format: 'full' | 'metadata' | 'minimal' = 'full'
): Promise<gmail_v1.Schema$Message> {
    return limiter.schedule(() =>
        client.gmail.users.messages
            .get({
                userId: 'me',
                id: messageId,
                format,
            })
            .then((res) => res.data)
    );
}

/**
 * Batch get multiple messages (more efficient than individual calls)
 */
export async function getMessages(
    client: GmailClient,
    messageIds: string[],
    format: 'full' | 'metadata' | 'minimal' = 'full'
): Promise<gmail_v1.Schema$Message[]> {
    const messages = await Promise.all(
        messageIds.map((id) => getMessage(client, id, format))
    );
    return messages;
}

/**
 * Archive a message (remove from inbox)
 */
export async function archiveMessage(
    client: GmailClient,
    messageId: string
): Promise<gmail_v1.Schema$Message> {
    return limiter.schedule(() =>
        client.gmail.users.messages
            .modify({
                userId: 'me',
                id: messageId,
                requestBody: {
                    removeLabelIds: ['INBOX'],
                },
            })
            .then((res) => res.data)
    );
}

/**
 * Archive multiple messages
 */
export async function archiveMessages(
    client: GmailClient,
    messageIds: string[]
): Promise<void> {
    await Promise.all(messageIds.map((id) => archiveMessage(client, id)));
}

/**
 * Delete a message (move to trash)
 */
export async function trashMessage(
    client: GmailClient,
    messageId: string
): Promise<gmail_v1.Schema$Message> {
    return limiter.schedule(() =>
        client.gmail.users.messages
            .trash({
                userId: 'me',
                id: messageId,
            })
            .then((res) => res.data)
    );
}

/**
 * Extract headers from a Gmail message
 */
export function extractHeaders(
    message: gmail_v1.Schema$Message
): Record<string, string> {
    const headers: Record<string, string> = {};
    const messageHeaders = message.payload?.headers ?? [];

    for (const header of messageHeaders) {
        if (header.name && header.value) {
            headers[header.name.toLowerCase()] = header.value;
        }
    }

    return headers;
}

/**
 * Extract email body from a Gmail message
 */
export function extractBody(message: gmail_v1.Schema$Message): {
    text: string | null;
    html: string | null;
} {
    const payload = message.payload;
    let textBody: string | null = null;
    let htmlBody: string | null = null;

    function decodeBase64(data: string): string {
        return Buffer.from(data, 'base64').toString('utf-8');
    }

    function extractFromParts(parts: gmail_v1.Schema$MessagePart[]): void {
        for (const part of parts) {
            if (part.mimeType === 'text/plain' && part.body?.data) {
                textBody = decodeBase64(part.body.data);
            } else if (part.mimeType === 'text/html' && part.body?.data) {
                htmlBody = decodeBase64(part.body.data);
            } else if (part.parts) {
                extractFromParts(part.parts);
            }
        }
    }

    if (payload?.body?.data) {
        // Simple message with body directly in payload
        const decoded = decodeBase64(payload.body.data);
        if (payload.mimeType === 'text/html') {
            htmlBody = decoded;
        } else {
            textBody = decoded;
        }
    } else if (payload?.parts) {
        // Multipart message
        extractFromParts(payload.parts);
    }

    return { text: textBody, html: htmlBody };
}

/**
 * Extract unsubscribe link from email headers or body
 */
export function extractUnsubscribeLink(
    headers: Record<string, string>,
    htmlBody: string | null
): string | null {
    // Check List-Unsubscribe header first (RFC 2369)
    const listUnsubscribe = headers['list-unsubscribe'];
    if (listUnsubscribe) {
        // Extract HTTP URL from header (format: <mailto:...>, <https://...>)
        const httpMatch = listUnsubscribe.match(/<(https?:\/\/[^>]+)>/);
        if (httpMatch) {
            return httpMatch[1];
        }
    }

    // Fall back to searching for unsubscribe links in HTML body
    if (htmlBody) {
        const unsubscribePatterns = [
            /href=["'](https?:\/\/[^"']*unsubscribe[^"']*)["']/i,
            /href=["'](https?:\/\/[^"']*optout[^"']*)["']/i,
            /href=["'](https?:\/\/[^"']*opt-out[^"']*)["']/i,
            /href=["'](https?:\/\/[^"']*remove[^"']*)["']/i,
        ];

        for (const pattern of unsubscribePatterns) {
            const match = htmlBody.match(pattern);
            if (match) {
                return match[1];
            }
        }
    }

    return null;
}

/**
 * Parse email addresses from a header value
 */
export function parseEmailAddresses(headerValue: string): string[] {
    const emailPattern = /[\w.-]+@[\w.-]+\.\w+/g;
    const matches = headerValue.match(emailPattern);
    return matches ?? [];
}
