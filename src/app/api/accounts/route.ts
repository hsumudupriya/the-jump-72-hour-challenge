import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/accounts - Get all connected email accounts
export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const accounts = await prisma.emailAccount.findMany({
            where: { userId: session.user.id },
            select: {
                id: true,
                email: true,
                isPrimary: true,
                isActive: true,
                createdAt: true,
                _count: {
                    select: { emails: true },
                },
            },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        });

        return NextResponse.json(accounts);
    } catch (error) {
        console.error('Error fetching accounts:', error);
        return NextResponse.json(
            { error: 'Failed to fetch accounts' },
            { status: 500 }
        );
    }
}

// DELETE /api/accounts - Remove a connected account
export async function DELETE(request: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { accountId } = await request.json();

        if (!accountId) {
            return NextResponse.json(
                { error: 'Account ID is required' },
                { status: 400 }
            );
        }

        // Check if the account exists and belongs to the user
        const account = await prisma.emailAccount.findFirst({
            where: {
                id: accountId,
                userId: session.user.id,
            },
        });

        if (!account) {
            return NextResponse.json(
                { error: 'Account not found' },
                { status: 404 }
            );
        }

        // Don't allow deleting the primary account
        if (account.isPrimary) {
            return NextResponse.json(
                { error: 'Cannot delete primary account' },
                { status: 400 }
            );
        }

        // Delete the account and all associated emails
        await prisma.emailAccount.delete({
            where: { id: accountId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting account:', error);
        return NextResponse.json(
            { error: 'Failed to delete account' },
            { status: 500 }
        );
    }
}
