import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Mail } from 'lucide-react';
import Link from 'next/link';
import { LoginButton } from '@/components/auth';

export default function LoginPage() {
    return (
        <div className='flex min-h-screen items-center justify-center bg-muted/50'>
            <Card className='w-full max-w-md'>
                <CardHeader className='text-center'>
                    <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary'>
                        <Mail className='h-6 w-6 text-primary-foreground' />
                    </div>
                    <CardTitle className='text-2xl'>Welcome Back</CardTitle>
                    <CardDescription>
                        Sign in with your Google account to access your email
                        dashboard
                    </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                    <LoginButton />
                    <p className='text-center text-sm text-muted-foreground'>
                        By signing in, you agree to grant access to your Gmail
                        account for email sorting and management.
                    </p>
                    <div className='text-center'>
                        <Link
                            href='/'
                            className='text-sm text-muted-foreground hover:underline'
                        >
                            ← Back to home
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
