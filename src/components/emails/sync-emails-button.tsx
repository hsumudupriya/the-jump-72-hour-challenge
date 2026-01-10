'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface SyncResult {
    success: boolean;
    fetched: number;
    stored: number;
    archived: number;
    errors: string[];
}

export function SyncEmailsButton() {
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const response = await fetch('/api/emails/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    maxEmails: 50,
                    archiveAfterImport: true,
                }),
            });

            const result: SyncResult = await response.json();

            if (!response.ok) {
                throw new Error('Sync failed');
            }

            if (result.stored > 0) {
                toast.success(`Synced ${result.stored} new emails`, {
                    description:
                        result.archived > 0
                            ? `${result.archived} emails archived in Gmail`
                            : undefined,
                });
            } else if (result.fetched === 0) {
                toast.info('No new emails to sync');
            } else {
                toast.info('All emails already synced');
            }

            if (result.errors?.length > 0) {
                console.error('Sync errors:', result.errors);
                toast.warning(`Completed with ${result.errors.length} errors`);
            }

            // Refresh the page to show new emails
            if (result.stored > 0) {
                window.location.reload();
            }
        } catch (error) {
            console.error('Sync error:', error);
            toast.error('Failed to sync emails');
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <Button
            onClick={handleSync}
            disabled={isSyncing}
            variant='outline'
            size='sm'
            className='gap-2'
        >
            <RefreshCw
                className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`}
            />
            {isSyncing ? 'Syncing...' : 'Sync Emails'}
        </Button>
    );
}
