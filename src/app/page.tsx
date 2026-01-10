import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Mail, Sparkles, FolderOpen, Zap } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
    return (
        <div className='flex min-h-screen flex-col'>
            {/* Header */}
            <header className='border-b'>
                <div className='container mx-auto flex h-16 items-center justify-between px-4'>
                    <div className='flex items-center gap-2'>
                        <Mail className='h-6 w-6' />
                        <span className='text-xl font-bold'>
                            AI Email Sorter
                        </span>
                    </div>
                    <Link href='/login'>
                        <Button>Sign In</Button>
                    </Link>
                </div>
            </header>

            {/* Hero Section */}
            <main className='flex-1'>
                <section className='container mx-auto px-4 py-24 text-center'>
                    <h1 className='text-4xl font-bold tracking-tight sm:text-6xl'>
                        Sort Your Inbox with{' '}
                        <span className='text-primary'>AI Power</span>
                    </h1>
                    <p className='mx-auto mt-6 max-w-2xl text-lg text-muted-foreground'>
                        Automatically categorize, summarize, and manage your
                        emails. Define custom categories and let AI do the rest.
                        Works with multiple Gmail accounts.
                    </p>
                    <div className='mt-10 flex items-center justify-center gap-4'>
                        <Link href='/login'>
                            <Button size='lg' className='gap-2'>
                                <Mail className='h-5 w-5' />
                                Sign in with Google
                            </Button>
                        </Link>
                    </div>
                </section>

                {/* Features Section */}
                <section className='container mx-auto px-4 py-16'>
                    <h2 className='mb-12 text-center text-3xl font-bold'>
                        Powerful Features
                    </h2>
                    <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
                        <Card>
                            <CardHeader>
                                <Sparkles className='h-10 w-10 text-primary' />
                                <CardTitle className='mt-4'>
                                    AI Categorization
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription>
                                    Define custom categories with descriptions.
                                    AI automatically sorts new emails into the
                                    right place.
                                </CardDescription>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <FolderOpen className='h-10 w-10 text-primary' />
                                <CardTitle className='mt-4'>
                                    Smart Summaries
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription>
                                    Get AI-generated summaries for every email.
                                    Quickly scan your inbox without reading
                                    everything.
                                </CardDescription>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <Zap className='h-10 w-10 text-primary' />
                                <CardTitle className='mt-4'>
                                    Bulk Actions
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription>
                                    Select multiple emails and delete or
                                    unsubscribe in one click. AI handles the
                                    unsubscribe process.
                                </CardDescription>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <Mail className='h-10 w-10 text-primary' />
                                <CardTitle className='mt-4'>
                                    Multi-Account
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription>
                                    Connect multiple Gmail accounts and manage
                                    all your inboxes from one dashboard.
                                </CardDescription>
                            </CardContent>
                        </Card>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className='border-t py-8'>
                <div className='container mx-auto px-4 text-center text-sm text-muted-foreground'>
                    <p>
                        © 2026 AI Email Sorter. Built for The Jump coding
                        challenge.
                    </p>
                </div>
            </footer>
        </div>
    );
}
