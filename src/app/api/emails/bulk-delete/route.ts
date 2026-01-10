import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/emails/bulk-delete - Delete multiple emails
export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { emailIds } = body;

        if (!Array.isArray(emailIds) || emailIds.length === 0) {
            return NextResponse.json(
                { error: 'emailIds must be a non-empty array' },
                { status: 400 }
            );
        }

        // Verify all emails belong to user's accounts
        const emails = await prisma.email.findMany({
            where: {
                id: { in: emailIds },
                account: { userId: session.user.id },
            },
            select: { id: true },
        });

        const validIds = emails.map((e) => e.id);

        if (validIds.length === 0) {
            return NextResponse.json(
                { error: 'No valid emails to delete' },
                { status: 400 }
            );
        }

        // Delete emails
        const result = await prisma.email.deleteMany({
            where: { id: { in: validIds } },
        });

        return NextResponse.json({
            success: true,
            deleted: result.count,
        });
    } catch (error) {
        console.error('Bulk delete error:', error);
        return NextResponse.json(
            { error: 'Failed to delete emails' },
            { status: 500 }
        );
    }
}
