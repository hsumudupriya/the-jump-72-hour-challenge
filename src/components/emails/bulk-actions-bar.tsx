'use client';

import { useState } from 'react';
import { Trash2, Link2Off, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { EmailData } from './email-card';

interface BulkActionsBarProps {
    selectedIds: string[];
    selectedEmails: EmailData[];
    onComplete: () => void;
    onClearSelection: () => void;
}

export function BulkActionsBar({
    selectedIds,
    selectedEmails,
    onComplete,
    onClearSelection,
}: BulkActionsBarProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const emailsWithUnsubscribe = selectedEmails.filter(
        (e) => e.unsubscribeLink
    );

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const response = await fetch('/api/emails/bulk-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emailIds: selectedIds }),
            });

            if (!response.ok) {
                throw new Error('Failed to delete emails');
            }

            const data = await response.json();
            toast.success(`Deleted ${data.deleted} emails`);
            onComplete();
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Failed to delete emails');
        } finally {
            setIsDeleting(false);
            setShowDeleteDialog(false);
        }
    };

    return (
        <>
            <div className='fixed bottom-4 left-1/2 -translate-x-1/2 z-50'>
                <div className='flex items-center gap-2 rounded-lg border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 shadow-lg px-4 py-3'>
                    {/* Selection count */}
                    <span className='text-sm font-medium mr-2'>
                        {selectedIds.length} selected
                    </span>

                    {/* Delete button */}
                    <Button
                        variant='destructive'
                        size='sm'
                        className='gap-2'
                        onClick={() => setShowDeleteDialog(true)}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <Loader2 className='h-4 w-4 animate-spin' />
                        ) : (
                            <Trash2 className='h-4 w-4' />
                        )}
                        Delete
                    </Button>

                    {/* Unsubscribe button (only if emails have unsubscribe links) */}
                    {emailsWithUnsubscribe.length > 0 && (
                        <Button
                            variant='outline'
                            size='sm'
                            className='gap-2'
                            onClick={() => {
                                // Open unsubscribe links in new tabs
                                emailsWithUnsubscribe.forEach((email) => {
                                    if (email.unsubscribeLink) {
                                        window.open(
                                            email.unsubscribeLink,
                                            '_blank'
                                        );
                                    }
                                });
                                toast.info(
                                    `Opened ${emailsWithUnsubscribe.length} unsubscribe links`
                                );
                            }}
                        >
                            <Link2Off className='h-4 w-4' />
                            Unsubscribe ({emailsWithUnsubscribe.length})
                        </Button>
                    )}

                    {/* Clear selection */}
                    <Button
                        variant='ghost'
                        size='sm'
                        onClick={onClearSelection}
                    >
                        <X className='h-4 w-4' />
                    </Button>
                </div>
            </div>

            {/* Delete confirmation dialog */}
            <AlertDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Emails</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete {selectedIds.length}{' '}
                            email{selectedIds.length === 1 ? '' : 's'}? This
                            action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className='bg-destructive text-white hover:bg-destructive/90'
                        >
                            {isDeleting ? (
                                <Loader2 className='h-4 w-4 animate-spin mr-2' />
                            ) : null}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
