'use client';

import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from './auth-provider';
import { QueryProvider } from './query-provider';

interface ProvidersProps {
    children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    return (
        <AuthProvider>
            <QueryProvider>
                {children}
                <Toaster position='top-right' richColors />
            </QueryProvider>
        </AuthProvider>
    );
}
