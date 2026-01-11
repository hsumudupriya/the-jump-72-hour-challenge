import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { bulkUnsubscribe, type UnsubscribeResult } from '@/lib/agent';

interface UnsubscribeRequest {
    emailIds: string[];
}

// POST /api/unsubscribe - Bulk unsubscribe from emails using AI agent
export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body: UnsubscribeRequest = await request.json();
        const { emailIds } = body;

        if (!Array.isArray(emailIds) || emailIds.length === 0) {
            return NextResponse.json(
                { error: 'emailIds must be a non-empty array' },
                { status: 400 }
            );
        }

        // Limit batch size to prevent timeout
        if (emailIds.length > 10) {
            return NextResponse.json(
                { error: 'Maximum 10 emails per request' },
                { status: 400 }
            );
        }

        // Get emails with unsubscribe links
        const emails = await prisma.email.findMany({
            where: {
                id: { in: emailIds },
                account: { userId: session.user.id },
                unsubscribeLink: { not: null },
            },
            select: {
                id: true,
                from: true,
                unsubscribeLink: true,
            },
        });

        if (emails.length === 0) {
            return NextResponse.json(
                { error: 'No emails with unsubscribe links found' },
                { status: 400 }
            );
        }

        // Extract unique unsubscribe URLs
        const urlsToProcess = emails
            .filter((e) => e.unsubscribeLink)
            .map((e) => e.unsubscribeLink as string);

        // Get user's email for form filling
        const userEmail = session.user.email || undefined;

        // Run the AI agent to unsubscribe
        const results = await bulkUnsubscribe(urlsToProcess, userEmail);

        // Map results back to email IDs
        const emailResults: Array<{
            emailId: string;
            from: string;
            result: UnsubscribeResult;
        }> = emails.map((email, index) => ({
            emailId: email.id,
            from: email.from,
            result: results[index] || {
                url: email.unsubscribeLink!,
                success: false,
                message: 'No result',
            },
        }));

        // Count successes
        const successCount = emailResults.filter(
            (r) => r.result.success
        ).length;

        return NextResponse.json({
            success: true,
            processed: emailResults.length,
            successCount,
            failedCount: emailResults.length - successCount,
            results: emailResults.map((r) => ({
                emailId: r.emailId,
                from: r.from,
                success: r.result.success,
                message: r.result.message,
            })),
        });
    } catch (error) {
        console.error('Unsubscribe error:', error);
        return NextResponse.json(
            { error: 'Failed to process unsubscribe requests' },
            { status: 500 }
        );
    }
}
