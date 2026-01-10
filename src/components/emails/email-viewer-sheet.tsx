'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ExternalLink, Mail, Loader2 } from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { EmailData } from './email-card';

interface EmailViewerSheetProps {
    email: EmailData | null;
    onClose: () => void;
}

interface FullEmailData extends EmailData {
    body?: string | null;
    bodyHtml?: string | null;
    to?: string[];
}

export function EmailViewerSheet({ email, onClose }: EmailViewerSheetProps) {
    const [fullEmail, setFullEmail] = useState<FullEmailData | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch full email content when email changes
    useEffect(() => {
        if (!email) {
            setFullEmail(null);
            return;
        }

        const fetchFullEmail = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`/api/emails/${email.id}`);
                if (response.ok) {
                    const data = await response.json();
                    setFullEmail(data);
                } else {
                    // Fallback to partial data
                    setFullEmail(email as FullEmailData);
                }
            } catch (error) {
                console.error('Failed to fetch email:', error);
                setFullEmail(email as FullEmailData);
            } finally {
                setIsLoading(false);
            }
        };

        fetchFullEmail();
    }, [email]);

    if (!email) return null;

    // Parse sender
    const senderMatch = email.from.match(/^(.+?)\s*<(.+)>$/);
    const senderName = senderMatch ? senderMatch[1].trim() : email.from;
    const senderEmail = senderMatch ? senderMatch[2] : email.from;

    return (
        <Sheet open={!!email} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className='w-full sm:max-w-2xl p-0 flex flex-col h-full max-h-screen overflow-hidden'>
                <SheetHeader className='px-6 py-4 border-b shrink-0'>
                    <div className='flex items-start justify-between gap-4'>
                        <div className='flex-1 min-w-0'>
                            <SheetTitle className='text-left truncate pr-8'>
                                {email.subject}
                            </SheetTitle>
                            <p className='text-sm text-muted-foreground mt-1'>
                                {format(new Date(email.receivedAt), 'PPpp')}
                            </p>
                        </div>
                    </div>
                </SheetHeader>

                <ScrollArea className='flex-1 min-h-0'>
                    <div className='px-6 py-4 space-y-4'>
                        {/* Sender info */}
                        <div className='flex items-start gap-3'>
                            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10'>
                                <Mail className='h-5 w-5 text-primary' />
                            </div>
                            <div className='flex-1 min-w-0'>
                                <p className='font-medium'>{senderName}</p>
                                <p className='text-sm text-muted-foreground'>
                                    {senderEmail}
                                </p>
                                {fullEmail?.to && fullEmail.to.length > 0 && (
                                    <p className='text-sm text-muted-foreground mt-1'>
                                        To: {fullEmail.to.join(', ')}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Category & Confidence */}
                        {(email.category || email.aiConfidence !== null) && (
                            <div className='flex items-center gap-2 flex-wrap'>
                                {email.category && (
                                    <Badge
                                        variant='secondary'
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
                                        AI Confidence:{' '}
                                        {Math.round(email.aiConfidence * 100)}%
                                    </span>
                                )}
                            </div>
                        )}

                        {/* AI Summary */}
                        {email.summary && (
                            <>
                                <Separator />
                                <div>
                                    <h4 className='text-sm font-medium mb-2'>
                                        AI Summary
                                    </h4>
                                    <p className='text-sm text-muted-foreground bg-muted/50 rounded-lg p-3'>
                                        {email.summary}
                                    </p>
                                </div>
                            </>
                        )}

                        {/* Unsubscribe link */}
                        {email.unsubscribeLink && (
                            <>
                                <Separator />
                                <div>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        className='gap-2'
                                        asChild
                                    >
                                        <a
                                            href={email.unsubscribeLink}
                                            target='_blank'
                                            rel='noopener noreferrer'
                                        >
                                            <ExternalLink className='h-4 w-4' />
                                            Unsubscribe
                                        </a>
                                    </Button>
                                </div>
                            </>
                        )}

                        {/* Email body */}
                        <Separator />
                        <div>
                            <h4 className='text-sm font-medium mb-2'>
                                Email Content
                            </h4>
                            {isLoading ? (
                                <div className='flex items-center justify-center py-8'>
                                    <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
                                </div>
                            ) : fullEmail?.bodyHtml ? (
                                <div
                                    className='prose prose-sm max-w-none dark:prose-invert border rounded-lg p-4 bg-background overflow-auto'
                                    dangerouslySetInnerHTML={{
                                        __html: fullEmail.bodyHtml,
                                    }}
                                />
                            ) : fullEmail?.body ? (
                                <pre className='text-sm whitespace-pre-wrap font-sans border rounded-lg p-4 bg-muted/30'>
                                    {fullEmail.body}
                                </pre>
                            ) : (
                                <p className='text-sm text-muted-foreground italic'>
                                    {email.snippet || 'No content available'}
                                </p>
                            )}
                        </div>
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
