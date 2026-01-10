import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// NextAuth.js auth wrapper for proxy
const authMiddleware = auth((req) => {
    const isLoggedIn = !!req.auth;
    const isOnDashboard = req.nextUrl.pathname.startsWith('/dashboard');
    const isOnLogin = req.nextUrl.pathname === '/login';
    const isOnHome = req.nextUrl.pathname === '/';
    const isAuthRoute = req.nextUrl.pathname.startsWith('/api/auth');

    // Allow auth routes to pass through
    if (isAuthRoute) {
        return NextResponse.next();
    }

    // Redirect logged-in users from login page to dashboard
    if (isLoggedIn && isOnLogin) {
        return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
    }

    // Redirect unauthenticated users from dashboard to login
    if (!isLoggedIn && isOnDashboard) {
        return NextResponse.redirect(new URL('/login', req.nextUrl));
    }

    // Redirect logged-in users from home to dashboard
    if (isLoggedIn && isOnHome) {
        return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
    }

    return NextResponse.next();
});

// Export as proxy for Next.js 16
export function proxy(request: NextRequest) {
    return authMiddleware(request, {} as any);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/cron).*)',
    ],
};
