'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface LinkAccountResult {
    success: boolean;
    email?: string;
    message?: string;
    error?: string;
}

export function AddAccountButton() {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    // Handle messages from popup window
    const handleMessage = useCallback(
        (event: MessageEvent<LinkAccountResult>) => {
            // Only accept messages from our own origin
            if (event.origin !== window.location.origin) return;

            const result = event.data;

            // Validate it's our expected message format
            if (typeof result?.success !== 'boolean') return;

            setIsLoading(false);

            if (result.success) {
                toast.success('Account Connected', {
                    description: `${result.email} has been linked to your account`,
                });
                // Refresh the page to show the new account
                router.refresh();
            } else {
                toast.error('Failed to Connect Account', {
                    description: result.error || 'An error occurred',
                });
            }
        },
        [router]
    );

    useEffect(() => {
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [handleMessage]);

    const handleAddAccount = async () => {
        setIsLoading(true);

        try {
            // Get the OAuth URL from our API
            const response = await fetch('/api/auth/link-account');

            if (!response.ok) {
                throw new Error('Failed to get authorization URL');
            }

            const { authUrl } = await response.json();

            // Calculate popup dimensions and position (centered)
            const width = 500;
            const height = 600;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;

            // Open popup for OAuth
            const popup = window.open(
                authUrl,
                'link-gmail-account',
                `width=${width},height=${height},left=${left},top=${top},popup=1`
            );

            if (!popup) {
                toast.error('Popup Blocked', {
                    description:
                        'Please allow popups for this site and try again',
                });
                setIsLoading(false);
                return;
            }

            // Monitor popup closure (in case user closes without completing)
            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosed);
                    // Only reset if still loading (message handler didn't fire)
                    setIsLoading(false);
                }
            }, 500);
        } catch (error) {
            console.error('Add account error:', error);
            toast.error('Failed to Connect Account', {
                description: 'An error occurred while starting authorization',
            });
            setIsLoading(false);
        }
    };

    return (
        <Button
            size='sm'
            variant='outline'
            className='gap-1'
            onClick={handleAddAccount}
            disabled={isLoading}
        >
            {isLoading ? (
                <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
                <Plus className='h-4 w-4' />
            )}
            Add
        </Button>
    );
}
