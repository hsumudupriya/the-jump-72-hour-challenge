'use client';

import { formatDistanceToNow } from 'date-fns';
import { Mail, ExternalLink, MailOpen } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface EmailData {
    id: string;
    subject: string;
    from: string;
    summary: string | null;
    snippet: string | null;
    receivedAt: Date;
    isRead: boolean;
    aiConfidence: number | null;
    unsubscribeLink: string | null;
    category: {
        id: string;
        name: string;
        color: string;
    } | null;
}

interface EmailCardProps {
    email: EmailData;
    isSelected: boolean;
    onSelect: (id: string, selected: boolean) => void;
    onClick: () => void;
}

export function EmailCard({
    email,
    isSelected,
    onSelect,
    onClick,
}: EmailCardProps) {
    // Parse sender name and email
    const senderMatch = email.from.match(/^(.+?)\s*<(.+)>$/);
    const senderName = senderMatch ? senderMatch[1].trim() : email.from;
    const senderEmail = senderMatch ? senderMatch[2] : email.from;

    return (
        <div
            className={cn(
                'group flex items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50 cursor-pointer',
                isSelected && 'bg-muted/50 border-primary',
                !email.isRead && 'border-l-4 border-l-primary'
            )}
            onClick={onClick}
        >
            {/* Checkbox */}
            <div className='pt-1' onClick={(e) => e.stopPropagation()}>
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) =>
                        onSelect(email.id, checked === true)
                    }
                />
            </div>

            {/* Icon */}
            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted'>
                {email.isRead ? (
                    <MailOpen className='h-5 w-5 text-muted-foreground' />
                ) : (
                    <Mail className='h-5 w-5 text-primary' />
                )}
            </div>

            {/* Content */}
            <div className='flex-1 min-w-0 space-y-1'>
                {/* Header row */}
                <div className='flex items-start justify-between gap-2'>
                    <div className='min-w-0 flex-1'>
                        <p
                            className={cn(
                                'font-medium truncate',
                                !email.isRead && 'font-semibold'
                            )}
                        >
                            {senderName}
                        </p>
                        <p className='text-xs text-muted-foreground truncate'>
                            {senderEmail}
                        </p>
                    </div>
                    <div className='flex items-center gap-2 shrink-0'>
                        {email.unsubscribeLink && (
                            <ExternalLink className='h-4 w-4 text-muted-foreground' />
                        )}
                        <span className='text-xs text-muted-foreground whitespace-nowrap'>
                            {formatDistanceToNow(new Date(email.receivedAt), {
                                addSuffix: true,
                            })}
                        </span>
                    </div>
                </div>

                {/* Subject */}
                <p
                    className={cn(
                        'text-sm truncate',
                        !email.isRead && 'font-medium'
                    )}
                >
                    {email.subject}
                </p>

                {/* Summary or snippet */}
                <p className='text-sm text-muted-foreground line-clamp-2'>
                    {email.summary || email.snippet || 'No preview available'}
                </p>

                {/* Footer */}
                <div className='flex items-center gap-2 pt-1'>
                    {email.category && (
                        <Badge
                            variant='secondary'
                            className='text-xs'
                            style={{
                                backgroundColor: `${email.category.color}20`,
                                color: email.category.color,
                                borderColor: email.category.color,
                            }}
                        >
                            {email.category.name}
                        </Badge>
                    )}
                    {email.aiConfidence !== null && (
                        <span className='text-xs text-muted-foreground'>
                            {Math.round(email.aiConfidence * 100)}% confidence
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
