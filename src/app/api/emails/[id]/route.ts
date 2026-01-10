import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/emails/[id] - Get a single email with full content
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { id } = await params;

        const email = await prisma.email.findFirst({
            where: {
                id,
                account: { userId: session.user.id },
            },
            include: {
                category: {
                    select: { id: true, name: true, color: true },
                },
            },
        });

        if (!email) {
            return NextResponse.json(
                { error: 'Email not found' },
                { status: 404 }
            );
        }

        // Mark as read if not already
        if (!email.isRead) {
            await prisma.email.update({
                where: { id },
                data: { isRead: true },
            });
        }

        return NextResponse.json(email);
    } catch (error) {
        console.error('Get email error:', error);
        return NextResponse.json(
            { error: 'Failed to get email' },
            { status: 500 }
        );
    }
}

// DELETE /api/emails/[id] - Delete a single email
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { id } = await params;

        // Verify email belongs to user
        const email = await prisma.email.findFirst({
            where: {
                id,
                account: { userId: session.user.id },
            },
        });

        if (!email) {
            return NextResponse.json(
                { error: 'Email not found' },
                { status: 404 }
            );
        }

        await prisma.email.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete email error:', error);
        return NextResponse.json(
            { error: 'Failed to delete email' },
            { status: 500 }
        );
    }
}
