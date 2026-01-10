import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Mail, FolderOpen, Link as LinkIcon } from 'lucide-react';
import {
    CategoryListItem,
    CreateCategoryDialog,
} from '@/components/categories';

export default async function DashboardPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect('/login');
    }

    // Fetch connected accounts and categories from database
    const [accounts, categories] = await Promise.all([
        prisma.emailAccount.findMany({
            where: { userId: session.user.id },
            select: {
                id: true,
                email: true,
                isPrimary: true,
                isActive: true,
                _count: { select: { emails: true } },
            },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        }),
        prisma.category.findMany({
            where: { userId: session.user.id },
            include: {
                _count: { select: { emails: true } },
            },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        }),
    ]);

    return (
        <div className='space-y-8'>
            {/* Welcome Section */}
            <div>
                <h1 className='text-3xl font-bold'>
                    Welcome back, {session.user.name?.split(' ')[0] || 'there'}!
                </h1>
                <p className='text-muted-foreground'>
                    Manage your email categories and connected accounts
                </p>
            </div>

            {/* Three Sections Grid */}
            <div className='grid gap-6 md:grid-cols-1 lg:grid-cols-3'>
                {/* Connected Accounts Section */}
                <Card>
                    <CardHeader>
                        <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-2'>
                                <LinkIcon className='h-5 w-5 text-primary' />
                                <CardTitle className='text-lg'>
                                    Connected Accounts
                                </CardTitle>
                            </div>
                            <Button
                                size='sm'
                                variant='outline'
                                className='gap-1'
                                disabled
                                title='Coming soon: Connect additional Gmail accounts'
                            >
                                <Plus className='h-4 w-4' />
                                Add
                            </Button>
                        </div>
                        <CardDescription>
                            Connect Gmail accounts to sync across multiple
                            inboxes
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className='space-y-3'>
                            {accounts.map((account) => (
                                <div
                                    key={account.id}
                                    className='flex items-center gap-3 rounded-lg border p-3'
                                >
                                    <div className='flex h-10 w-10 items-center justify-center rounded-full bg-primary/10'>
                                        <Mail className='h-5 w-5 text-primary' />
                                    </div>
                                    <div className='flex-1'>
                                        <p className='font-medium'>
                                            {account.email}
                                        </p>
                                        <p className='text-xs text-muted-foreground'>
                                            {account.isPrimary
                                                ? 'Primary account'
                                                : `${account._count.emails} emails`}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {accounts.length === 0 && (
                                <p className='text-center text-sm text-muted-foreground'>
                                    Sign in to connect your first account
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Categories Section */}
                <Card className='lg:col-span-2'>
                    <CardHeader>
                        <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-2'>
                                <FolderOpen className='h-5 w-5 text-primary' />
                                <CardTitle className='text-lg'>
                                    Email Categories
                                </CardTitle>
                            </div>
                            <CreateCategoryDialog />
                        </div>
                        <CardDescription>
                            Define categories with descriptions for AI to sort
                            your emails
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {categories.length === 0 ? (
                            <div className='rounded-lg border border-dashed p-8 text-center'>
                                <FolderOpen className='mx-auto h-12 w-12 text-muted-foreground/50' />
                                <h3 className='mt-4 font-medium'>
                                    No categories yet
                                </h3>
                                <p className='mt-2 text-sm text-muted-foreground'>
                                    Create your first category to start
                                    organizing emails with AI
                                </p>
                                <div className='mt-4'>
                                    <CreateCategoryDialog
                                        trigger={
                                            <Button className='gap-1'>
                                                <Plus className='h-4 w-4' />
                                                Create Category
                                            </Button>
                                        }
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className='grid gap-4 sm:grid-cols-2'>
                                {categories.map((category) => (
                                    <CategoryListItem
                                        key={category.id}
                                        category={category}
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Debug Info (development only) */}
            {process.env.NODE_ENV === 'development' && (
                <Card className='border-dashed'>
                    <CardHeader>
                        <CardTitle className='text-sm font-medium text-muted-foreground'>
                            Debug: Session Info
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className='overflow-auto rounded bg-muted p-4 text-xs'>
                            {JSON.stringify(
                                {
                                    user: session.user,
                                    accountsCount: accounts.length,
                                    categoriesCount: categories.length,
                                    hasAccessToken: !!session.accessToken,
                                    error: session.error,
                                },
                                null,
                                2
                            )}
                        </pre>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
