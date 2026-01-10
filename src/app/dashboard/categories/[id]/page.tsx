import { Suspense } from 'react';
import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { CategoryEmails } from './category-emails';
import type { EmailData } from '@/components/emails/email-card';

interface CategoryPageProps {
    params: Promise<{ id: string }>;
}

async function getCategoryWithEmails(categoryId: string, userId: string) {
    const category = await prisma.category.findFirst({
        where: {
            id: categoryId,
            userId: userId,
        },
    });

    if (!category) return null;

    const emails = await prisma.email.findMany({
        where: {
            categoryId: categoryId,
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
    }));

    return { category, emails: transformedEmails };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
    const session = await auth();

    if (!session?.user?.id) {
        redirect('/auth/signin');
    }

    const { id } = await params;
    const data = await getCategoryWithEmails(id, session.user.id);

    if (!data) {
        notFound();
    }

    const { category, emails } = data;

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
                    <div
                        className='w-4 h-4 rounded-full'
                        style={{ backgroundColor: category.color || '#6b7280' }}
                    />
                    <h1 className='text-3xl font-bold'>{category.name}</h1>
                    <Badge variant='secondary'>{emails.length} emails</Badge>
                </div>

                {category.description && (
                    <p className='text-muted-foreground mt-2'>
                        {category.description}
                    </p>
                )}
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
                <CategoryEmails initialEmails={emails} />
            </Suspense>
        </div>
    );
}
