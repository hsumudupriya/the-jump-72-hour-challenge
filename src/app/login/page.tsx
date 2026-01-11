import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { LoginButton } from '@/components/auth';

interface LoginPageProps {
    searchParams: Promise<{ error?: string }>;
}

const ERROR_MESSAGES: Record<string, string> = {
    EmailLinkedToOtherUser:
        'This Gmail account is already linked to another user. Please sign in with your primary account.',
    OAuthAccountNotLinked:
        'This email is already associated with a different sign-in method.',
    default: 'An error occurred during sign in. Please try again.',
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
    const { error } = await searchParams;
    const errorMessage = error
        ? ERROR_MESSAGES[error] || ERROR_MESSAGES.default
        : null;

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
                    {errorMessage && (
                        <Alert variant='destructive'>
                            <AlertCircle className='h-4 w-4' />
                            <AlertDescription>{errorMessage}</AlertDescription>
                        </Alert>
                    )}
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
