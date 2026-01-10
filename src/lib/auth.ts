import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { prisma } from './prisma';

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
            if (account && profile?.email) {
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token;
                token.expiresAt = account.expires_at;
                token.email = profile.email;

                // Create or update user and email account in database
                try {
                    const user = await prisma.user.upsert({
                        where: { email: profile.email },
                        update: {
                            name: profile.name,
                            image: profile.picture as string | undefined,
                        },
                        create: {
                            email: profile.email,
                            name: profile.name,
                            image: profile.picture as string | undefined,
                        },
                    });

                    token.userId = user.id;

                    // Create or update the email account (primary account on first sign in)
                    await prisma.emailAccount.upsert({
                        where: {
                            userId_email: {
                                userId: user.id,
                                email: profile.email,
                            },
                        },
                        update: {
                            accessToken: account.access_token!,
                            refreshToken: account.refresh_token,
                            expiresAt: account.expires_at
                                ? new Date(account.expires_at * 1000)
                                : null,
                        },
                        create: {
                            userId: user.id,
                            email: profile.email,
                            accessToken: account.access_token!,
                            refreshToken: account.refresh_token,
                            expiresAt: account.expires_at
                                ? new Date(account.expires_at * 1000)
                                : null,
                            isPrimary: true,
                        },
                    });
                } catch (error) {
                    console.error('Error saving user to database:', error);
                }
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

                    // Update access token in database
                    if (token.userId && token.email) {
                        await prisma.emailAccount.updateMany({
                            where: {
                                userId: token.userId as string,
                                email: token.email as string,
                            },
                            data: {
                                accessToken: tokens.access_token,
                                refreshToken: tokens.refresh_token ?? undefined,
                                expiresAt: new Date(
                                    Date.now() + tokens.expires_in * 1000
                                ),
                            },
                        });
                    }

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

            if (token.userId) {
                session.user.id = token.userId as string;
            } else if (token.sub) {
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
        userId?: string;
        email?: string;
    }
}
