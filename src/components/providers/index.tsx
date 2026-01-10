'use client';

import { Toaster } from '@/components/ui/sonner';

interface ProvidersProps {
    children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    return (
        <>
            {children}
            <Toaster position='top-right' richColors />
        </>
    );
}
