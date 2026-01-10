import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { syncEmailsForUser, getSyncStats } from '@/lib/email-sync';

// POST /api/emails/sync - Trigger email sync for the current user
export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Parse options from request body
        const body = await request.json().catch(() => ({}));
        const options = {
            maxEmails: body.maxEmails ?? 50,
            archiveAfterImport: body.archiveAfterImport ?? true,
            query: body.query ?? 'in:inbox',
            runAiProcessing: body.runAiProcessing ?? true,
        };

        // Sync emails for all user's accounts
        const { results, aiStats } = await syncEmailsForUser(session.user.id, options);

        // Calculate totals
        const totals = {
            fetched: results.reduce((sum, r) => sum + r.fetched, 0),
            stored: results.reduce((sum, r) => sum + r.stored, 0),
            archived: results.reduce((sum, r) => sum + r.archived, 0),
            aiCategorized: aiStats.categorized,
            aiSummarized: aiStats.summarized,
            errors: results.flatMap((r) => r.errors),
        };

        return NextResponse.json({
            success: true,
            accounts: results.length,
            ...totals,
            details: results,
        });
    } catch (error) {
        console.error('Email sync error:', error);
        return NextResponse.json(
            { error: 'Failed to sync emails' },
            { status: 500 }
        );
    }
}

// GET /api/emails/sync - Get sync statistics
export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const stats = await getSyncStats(session.user.id);

        return NextResponse.json(stats);
    } catch (error) {
        console.error('Error fetching sync stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch sync statistics' },
            { status: 500 }
        );
    }
}
