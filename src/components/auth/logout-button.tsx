'use client';

import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { signOutAction } from '@/app/actions/auth';

interface LogoutButtonProps {
    variant?:
        | 'default'
        | 'ghost'
        | 'outline'
        | 'destructive'
        | 'secondary'
        | 'link';
    showIcon?: boolean;
}

export function LogoutButton({
    variant = 'ghost',
    showIcon = true,
}: LogoutButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleSignOut = async () => {
        setIsLoading(true);
        try {
            await signOutAction();
        } catch (error) {
            console.error('Sign out error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            onClick={handleSignOut}
            disabled={isLoading}
            variant={variant}
            size='sm'
            className='gap-2'
        >
            {isLoading ? (
                <div className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
            ) : (
                showIcon && <LogOut className='h-4 w-4' />
            )}
            Sign out
        </Button>
    );
}
