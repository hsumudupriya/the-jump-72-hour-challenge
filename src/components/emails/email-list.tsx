'use client';

import { useState } from 'react';
import { EmailCard, type EmailData } from './email-card';
import { EmailViewerSheet } from './email-viewer-sheet';
import { BulkActionsBar } from './bulk-actions-bar';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Inbox } from 'lucide-react';

interface EmailListProps {
    emails: EmailData[];
    onRefresh?: () => void;
}

export function EmailList({ emails, onRefresh }: EmailListProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [viewingEmail, setViewingEmail] = useState<EmailData | null>(null);

    const handleSelect = (id: string, selected: boolean) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (selected) {
                next.add(id);
            } else {
                next.delete(id);
            }
            return next;
        });
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(emails.map((e) => e.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleBulkActionComplete = () => {
        setSelectedIds(new Set());
        onRefresh?.();
    };

    const allSelected = emails.length > 0 && selectedIds.size === emails.length;
    const someSelected =
        selectedIds.size > 0 && selectedIds.size < emails.length;

    if (emails.length === 0) {
        return (
            <div className='flex flex-col items-center justify-center py-16 text-center'>
                <div className='flex h-16 w-16 items-center justify-center rounded-full bg-muted'>
                    <Inbox className='h-8 w-8 text-muted-foreground' />
                </div>
                <h3 className='mt-4 text-lg font-medium'>No emails</h3>
                <p className='mt-2 text-sm text-muted-foreground'>
                    No emails found in this category yet.
                </p>
            </div>
        );
    }

    return (
        <div className='flex flex-col h-full'>
            {/* Header with select all */}
            <div className='flex items-center gap-3 border-b px-4 py-3'>
                <Checkbox
                    checked={allSelected}
                    ref={(el) => {
                        if (el) {
                            (
                                el as HTMLButtonElement & {
                                    indeterminate?: boolean;
                                }
                            ).indeterminate = someSelected;
                        }
                    }}
                    onCheckedChange={handleSelectAll}
                />
                <span className='text-sm text-muted-foreground'>
                    {selectedIds.size > 0
                        ? `${selectedIds.size} of ${emails.length} selected`
                        : `${emails.length} emails`}
                </span>
            </div>

            {/* Email list */}
            <ScrollArea className='flex-1'>
                <div className='space-y-2 p-4'>
                    {emails.map((email) => (
                        <EmailCard
                            key={email.id}
                            email={email}
                            isSelected={selectedIds.has(email.id)}
                            onSelect={handleSelect}
                            onClick={() => setViewingEmail(email)}
                        />
                    ))}
                </div>
            </ScrollArea>

            {/* Bulk actions bar */}
            {selectedIds.size > 0 && (
                <BulkActionsBar
                    selectedIds={Array.from(selectedIds)}
                    selectedEmails={emails.filter((e) => selectedIds.has(e.id))}
                    onComplete={handleBulkActionComplete}
                    onClearSelection={() => setSelectedIds(new Set())}
                />
            )}

            {/* Email viewer sheet */}
            <EmailViewerSheet
                email={viewingEmail}
                onClose={() => setViewingEmail(null)}
            />
        </div>
    );
}
