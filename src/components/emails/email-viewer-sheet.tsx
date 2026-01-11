'use client';

import { useEffect, useState, useRef } from 'react';
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

// Component to render HTML email content in an isolated iframe
function IsolatedEmailContent({ html }: { html: string }) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [dimensions, setDimensions] = useState({ height: 400, width: 0 });

    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;

        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) return;

        // Write content to iframe with minimal styles - let content flow naturally
        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    * {
                        box-sizing: border-box;
                    }
                    body {
                        margin: 0;
                        padding: 16px;
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                        font-size: 14px;
                        line-height: 1.6;
                        color: #374151;
                        background: transparent;
                        /* Let content extend naturally - no overflow constraints */
                    }
                    a {
                        color: #2563eb;
                    }
                    /* Prevent fixed/absolute positioned elements from breaking layout */
                    [style*="position: fixed"], [style*="position:fixed"],
                    [style*="position: absolute"], [style*="position:absolute"] {
                        position: relative !important;
                    }
                </style>
            </head>
            <body>${html}</body>
            </html>
        `);
        doc.close();

        // Adjust iframe dimensions after content loads
        const adjustDimensions = () => {
            if (doc.body) {
                const newHeight = Math.max(doc.body.scrollHeight, 200);
                const newWidth = doc.body.scrollWidth;
                setDimensions({
                    height: Math.min(newHeight, 800), // Cap height at 800px
                    width: newWidth,
                });
            }
        };

        // Wait for images to load before measuring
        const images = doc.querySelectorAll('img');
        if (images.length > 0) {
            let loadedCount = 0;
            images.forEach((img) => {
                if (img.complete) {
                    loadedCount++;
                } else {
                    img.onload = () => {
                        loadedCount++;
                        if (loadedCount === images.length) {
                            adjustDimensions();
                        }
                    };
                    img.onerror = () => {
                        loadedCount++;
                        if (loadedCount === images.length) {
                            adjustDimensions();
                        }
                    };
                }
            });
            if (loadedCount === images.length) {
                adjustDimensions();
            }
        } else {
            adjustDimensions();
        }

        // Also adjust after a short delay for any async rendering
        const timer = setTimeout(adjustDimensions, 500);
        return () => clearTimeout(timer);
    }, [html]);

    // Calculate if content is wider than container
    const needsHorizontalScroll = dimensions.width > 0;

    return (
        <div 
            className="border rounded-lg bg-white overflow-x-auto"
            style={{ maxWidth: '100%' }}
        >
            <iframe
                ref={iframeRef}
                title="Email content"
                className="block bg-white"
                style={{ 
                    height: `${dimensions.height}px`, 
                    minHeight: '200px',
                    width: needsHorizontalScroll ? `${Math.max(dimensions.width, 100)}px` : '100%',
                    minWidth: '100%',
                    border: 'none',
                }}
                sandbox="allow-same-origin"
            />
        </div>
    );
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
                        {(fullEmail?.unsubscribeLink || email.unsubscribeLink) && (
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
                                            href={fullEmail?.unsubscribeLink || email.unsubscribeLink || ''}
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
                                <IsolatedEmailContent html={fullEmail.bodyHtml} />
                            ) : fullEmail?.body ? (
                                <pre className='text-sm whitespace-pre-wrap font-sans border rounded-lg p-4 bg-muted/30 overflow-x-auto'>
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
