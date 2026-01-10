'use client';

import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from './auth-provider';

interface ProvidersProps {
    children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    return (
        <AuthProvider>
            {children}
            <Toaster position='top-right' richColors />
        </AuthProvider>
    );
}
