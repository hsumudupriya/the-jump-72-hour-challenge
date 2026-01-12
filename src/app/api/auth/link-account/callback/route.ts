import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAppUrl } from '@/lib/url';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // This is the user ID
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
        return new NextResponse(
            generateCallbackHTML({
                success: false,
                error:
                    error === 'access_denied'
                        ? 'You cancelled the authorization'
                        : `OAuth error: ${error}`,
            }),
            { headers: { 'Content-Type': 'text/html' } }
        );
    }

    if (!code || !state) {
        return new NextResponse(
            generateCallbackHTML({
                success: false,
                error: 'Missing authorization code or state',
            }),
            { headers: { 'Content-Type': 'text/html' } }
        );
    }

    try {
        // Exchange authorization code for tokens
        const appUrl = getAppUrl();
        const tokenResponse = await fetch(
            'https://oauth2.googleapis.com/token',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: process.env.GOOGLE_CLIENT_ID!,
                    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                    code,
                    grant_type: 'authorization_code',
                    redirect_uri: `${appUrl}/api/auth/link-account/callback`,
                }),
            }
        );

        const tokens = await tokenResponse.json();

        if (!tokenResponse.ok) {
            console.error('Token exchange failed:', tokens);
            return new NextResponse(
                generateCallbackHTML({
                    success: false,
                    error: 'Failed to exchange authorization code',
                }),
                { headers: { 'Content-Type': 'text/html' } }
            );
        }

        // Get user info from the new account
        const userInfoResponse = await fetch(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            {
                headers: { Authorization: `Bearer ${tokens.access_token}` },
            }
        );

        const userInfo = await userInfoResponse.json();

        if (!userInfoResponse.ok) {
            console.error('Failed to get user info:', userInfo);
            return new NextResponse(
                generateCallbackHTML({
                    success: false,
                    error: 'Failed to get account information',
                }),
                { headers: { 'Content-Type': 'text/html' } }
            );
        }

        const userId = state; // User ID from state parameter
        const newAccountEmail = userInfo.email;

        // Verify the user exists
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return new NextResponse(
                generateCallbackHTML({
                    success: false,
                    error: 'User session expired. Please try again.',
                }),
                { headers: { 'Content-Type': 'text/html' } }
            );
        }

        // Check if this email is already linked to a DIFFERENT user
        const accountLinkedToOtherUser = await prisma.emailAccount.findFirst({
            where: {
                email: newAccountEmail,
                userId: { not: userId },
            },
        });

        if (accountLinkedToOtherUser) {
            return new NextResponse(
                generateCallbackHTML({
                    success: false,
                    error: 'This Gmail account is already linked to another user',
                }),
                { headers: { 'Content-Type': 'text/html' } }
            );
        }

        // Check if this account is already linked to current user
        const existingAccount = await prisma.emailAccount.findUnique({
            where: {
                userId_email: {
                    userId,
                    email: newAccountEmail,
                },
            },
        });

        if (existingAccount) {
            // Update existing account with new tokens
            await prisma.emailAccount.update({
                where: { id: existingAccount.id },
                data: {
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    expiresAt: tokens.expires_in
                        ? new Date(Date.now() + tokens.expires_in * 1000)
                        : null,
                    isActive: true,
                },
            });

            return new NextResponse(
                generateCallbackHTML({
                    success: true,
                    email: newAccountEmail,
                    message: 'Account tokens refreshed',
                }),
                { headers: { 'Content-Type': 'text/html' } }
            );
        }

        // Create new email account
        await prisma.emailAccount.create({
            data: {
                userId,
                email: newAccountEmail,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresAt: tokens.expires_in
                    ? new Date(Date.now() + tokens.expires_in * 1000)
                    : null,
                isPrimary: false, // Additional accounts are not primary
                isActive: true,
            },
        });

        return new NextResponse(
            generateCallbackHTML({
                success: true,
                email: newAccountEmail,
                message: 'Account connected successfully',
            }),
            { headers: { 'Content-Type': 'text/html' } }
        );
    } catch (error) {
        console.error('Link account callback error:', error);
        return new NextResponse(
            generateCallbackHTML({
                success: false,
                error: 'An unexpected error occurred',
            }),
            { headers: { 'Content-Type': 'text/html' } }
        );
    }
}

interface CallbackResult {
    success: boolean;
    email?: string;
    message?: string;
    error?: string;
}

function generateCallbackHTML(result: CallbackResult): string {
    const statusEmoji = result.success ? '✅' : '❌';
    const statusText = result.success ? 'Success!' : 'Error';
    const message = result.success
        ? `${result.email} has been connected!`
        : result.error;

    return `
<!DOCTYPE html>
<html>
<head>
    <title>Account Linking - ${statusText}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            text-align: center;
            max-width: 400px;
        }
        .emoji {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        h1 {
            margin: 0 0 0.5rem 0;
            color: #1a1a1a;
        }
        p {
            color: #666;
            margin: 0 0 1.5rem 0;
        }
        .closing-text {
            font-size: 0.875rem;
            color: #999;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- <div class="emoji">${statusEmoji}</div> -->
        <h1>${statusText}</h1>
        <p>${message}</p>
        <p class="closing-text">This window will close automatically...</p>
    </div>
    <script>
        // Post message to parent window and close
        if (window.opener) {
            window.opener.postMessage(${JSON.stringify(result)}, '*');
            setTimeout(() => window.close(), 2000);
        } else {
            // If no opener, redirect to dashboard after delay
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 2000);
        }
    </script>
</body>
</html>
`;
}
