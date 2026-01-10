import { NextResponse } from 'next/server';
import { syncAllEmails } from '@/lib/email-sync';
import { processAllEmails } from '@/lib/ai';

// POST /api/cron/sync-emails - Cron job endpoint for Render
// Protected by CRON_SECRET to prevent unauthorized access
export async function POST(request: Request) {
    try {
        // Verify cron secret
        const authHeader = request.headers.get('authorization');
        const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

        if (!process.env.CRON_SECRET) {
            console.error('CRON_SECRET not configured');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        if (authHeader !== expectedAuth) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        console.log('Starting scheduled email sync...');
        const startTime = Date.now();

        // Sync all active accounts
        const results = await syncAllEmails({
            maxEmails: 25, // Lower limit for cron to process faster
            archiveAfterImport: true,
        });

        const syncDuration = Date.now() - startTime;

        // Run AI processing for all users
        console.log('Starting AI processing...');
        const aiStartTime = Date.now();
        const aiResults = await processAllEmails({ limitPerUser: 20 });
        const aiDuration = Date.now() - aiStartTime;

        // Calculate AI totals
        let aiCategorized = 0;
        let aiSummarized = 0;
        let aiErrors = 0;
        for (const [, stats] of aiResults) {
            aiCategorized += stats.categorized;
            aiSummarized += stats.summarized;
            aiErrors += stats.errors;
        }

        const totalDuration = Date.now() - startTime;

        // Calculate totals
        const totals = {
            accounts: results.length,
            fetched: results.reduce((sum, r) => sum + r.fetched, 0),
            stored: results.reduce((sum, r) => sum + r.stored, 0),
            archived: results.reduce((sum, r) => sum + r.archived, 0),
            aiCategorized,
            aiSummarized,
            aiErrors,
            errors: results.flatMap((r) => r.errors),
        };

        console.log(
            `Sync completed in ${syncDuration}ms: ${totals.stored} emails stored, ${totals.archived} archived`
        );
        console.log(
            `AI processing completed in ${aiDuration}ms: ${aiCategorized} categorized, ${aiSummarized} summarized`
        );

        if (totals.errors.length > 0) {
            console.error('Sync errors:', totals.errors);
        }

        return NextResponse.json({
            success: true,
            duration: totalDuration,
            syncDuration,
            aiDuration,
            ...totals,
        });
    } catch (error) {
        console.error('Cron sync error:', error);
        return NextResponse.json(
            { error: 'Sync failed', details: String(error) },
            { status: 500 }
        );
    }
}

// GET endpoint for health check
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        endpoint: '/api/cron/sync-emails',
        method: 'POST',
        auth: 'Bearer token required',
    });
}
