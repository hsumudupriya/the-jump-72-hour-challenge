import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

// Gmail API scopes we need
const GMAIL_SCOPES = [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
];

export async function GET() {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate the Google OAuth URL for linking an additional account
    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        redirect_uri: `${process.env.AUTH_URL}/api/auth/link-account/callback`,
        response_type: 'code',
        scope: GMAIL_SCOPES.join(' '),
        access_type: 'offline',
        prompt: 'consent select_account', // Force account selection
        state: session.user.id, // Pass user ID for verification
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

    return NextResponse.json({ authUrl });
}
