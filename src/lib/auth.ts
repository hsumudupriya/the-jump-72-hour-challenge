import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

// Gmail API scopes we need
const GMAIL_SCOPES = [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
];

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope: GMAIL_SCOPES.join(' '),
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        }),
    ],
    callbacks: {
        async jwt({ token, account, profile }) {
            // Initial sign in
            if (account) {
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token;
                token.expiresAt = account.expires_at;
                token.email = profile?.email;
            }

            // Return previous token if the access token has not expired yet
            if (
                token.expiresAt &&
                Date.now() < (token.expiresAt as number) * 1000
            ) {
                return token;
            }

            // Access token has expired, try to refresh it
            if (token.refreshToken) {
                try {
                    const response = await fetch(
                        'https://oauth2.googleapis.com/token',
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type':
                                    'application/x-www-form-urlencoded',
                            },
                            body: new URLSearchParams({
                                client_id: process.env.GOOGLE_CLIENT_ID!,
                                client_secret:
                                    process.env.GOOGLE_CLIENT_SECRET!,
                                grant_type: 'refresh_token',
                                refresh_token: token.refreshToken as string,
                            }),
                        }
                    );

                    const tokens = await response.json();

                    if (!response.ok) throw tokens;

                    return {
                        ...token,
                        accessToken: tokens.access_token,
                        expiresAt: Math.floor(
                            Date.now() / 1000 + tokens.expires_in
                        ),
                        // Keep the refresh token if a new one wasn't provided
                        refreshToken:
                            tokens.refresh_token ?? token.refreshToken,
                    };
                } catch (error) {
                    console.error('Error refreshing access token', error);
                    // The refresh token is invalid, user will need to re-authenticate
                    return { ...token, error: 'RefreshAccessTokenError' };
                }
            }

            return token;
        },
        async session({ session, token }) {
            // Send properties to the client
            session.accessToken = token.accessToken as string;
            session.error = token.error as string | undefined;

            if (token.sub) {
                session.user.id = token.sub;
            }

            return session;
        },
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
    session: {
        strategy: 'jwt',
    },
});

// Extend the built-in types
declare module 'next-auth' {
    interface Session {
        accessToken?: string;
        error?: string;
        user: {
            id: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
        };
    }

    interface JWT {
        accessToken?: string;
        refreshToken?: string;
        expiresAt?: number;
        error?: string;
    }
}
