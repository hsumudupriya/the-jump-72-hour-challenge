import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserUsageStats } from '@/lib/ai/usage-tracker';

export async function GET(request: Request) {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all';

    let startDate: Date | undefined;
    const endDate = new Date();

    switch (period) {
        case 'today':
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'week':
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);
            break;
        case 'month':
            startDate = new Date();
            startDate.setMonth(startDate.getMonth() - 1);
            break;
        case 'all':
        default:
            startDate = undefined;
            break;
    }

    try {
        const stats = await getUserUsageStats(
            session.user.id,
            startDate,
            startDate ? endDate : undefined
        );

        return NextResponse.json({
            period,
            ...stats,
            // Format cost for display
            formattedCost: `$${stats.totalCost.toFixed(4)}`,
        });
    } catch (error) {
        console.error('Failed to fetch usage stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch usage statistics' },
            { status: 500 }
        );
    }
}
