import { auth } from '@/lib/auth';
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

export default async function DashboardPage() {
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

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
                            {/* Primary account */}
                            <div className='flex items-center gap-3 rounded-lg border p-3'>
                                <div className='flex h-10 w-10 items-center justify-center rounded-full bg-primary/10'>
                                    <Mail className='h-5 w-5 text-primary' />
                                </div>
                                <div className='flex-1'>
                                    <p className='font-medium'>
                                        {session.user.email}
                                    </p>
                                    <p className='text-xs text-muted-foreground'>
                                        Primary account
                                    </p>
                                </div>
                            </div>
                            {/* Placeholder for more accounts */}
                            <p className='text-center text-sm text-muted-foreground'>
                                Click &quot;Add&quot; to connect more Gmail
                                accounts
                            </p>
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
                            <Button size='sm' className='gap-1'>
                                <Plus className='h-4 w-4' />
                                Add Category
                            </Button>
                        </div>
                        <CardDescription>
                            Define categories with descriptions for AI to sort
                            your emails
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className='rounded-lg border border-dashed p-8 text-center'>
                            <FolderOpen className='mx-auto h-12 w-12 text-muted-foreground/50' />
                            <h3 className='mt-4 font-medium'>
                                No categories yet
                            </h3>
                            <p className='mt-2 text-sm text-muted-foreground'>
                                Create your first category to start organizing
                                emails with AI
                            </p>
                            <Button className='mt-4 gap-1'>
                                <Plus className='h-4 w-4' />
                                Create Category
                            </Button>
                        </div>
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
