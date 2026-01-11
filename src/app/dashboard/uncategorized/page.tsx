import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';
import { UncategorizedEmails } from './uncategorized-emails';
import type { EmailData } from '@/components/emails/email-card';

async function getUncategorizedEmails(userId: string) {
    const emails = await prisma.email.findMany({
        where: {
            categoryId: null,
            account: { userId: userId },
        },
        select: {
            id: true,
            subject: true,
            from: true,
            summary: true,
            snippet: true,
            receivedAt: true,
            isRead: true,
            aiConfidence: true,
            unsubscribeLink: true,
            category: {
                select: { id: true, name: true, color: true },
            },
            account: {
                select: { email: true },
            },
        },
        orderBy: { receivedAt: 'desc' },
    });

    // Transform to match EmailData type
    const transformedEmails: EmailData[] = emails.map((email) => ({
        ...email,
        category: email.category
            ? {
                  id: email.category.id,
                  name: email.category.name,
                  color: email.category.color || '#6b7280',
              }
            : null,
        account: email.account ? { email: email.account.email } : null,
    }));

    return transformedEmails;
}

export default async function UncategorizedPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect('/auth/signin');
    }

    const emails = await getUncategorizedEmails(session.user.id);

    return (
        <div className='container mx-auto py-8 px-4'>
            <div className='mb-6'>
                <Link href='/dashboard'>
                    <Button variant='ghost' size='sm' className='mb-4'>
                        <ArrowLeft className='mr-2 h-4 w-4' />
                        Back to Dashboard
                    </Button>
                </Link>

                <div className='flex items-center gap-4'>
                    <div className='flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/10'>
                        <Mail className='h-4 w-4 text-orange-500' />
                    </div>
                    <h1 className='text-3xl font-bold'>Uncategorized Emails</h1>
                    <Badge variant='secondary'>{emails.length} emails</Badge>
                </div>

                <p className='text-muted-foreground mt-2'>
                    Emails that haven&apos;t been assigned to a category yet.
                    Run AI processing to categorize them automatically.
                </p>
            </div>

            <Suspense
                fallback={
                    <Card>
                        <CardHeader>
                            <CardTitle>Loading emails...</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className='space-y-4'>
                                {[1, 2, 3].map((i) => (
                                    <div
                                        key={i}
                                        className='h-24 bg-muted animate-pulse rounded-lg'
                                    />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                }
            >
                <UncategorizedEmails initialEmails={emails} />
            </Suspense>
        </div>
    );
}
