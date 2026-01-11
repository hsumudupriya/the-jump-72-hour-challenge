'use client';

import { useRouter } from 'next/navigation';
import { EmailList } from '@/components/emails';
import type { EmailData } from '@/components/emails/email-card';

interface UncategorizedEmailsProps {
    initialEmails: EmailData[];
}

export function UncategorizedEmails({
    initialEmails,
}: UncategorizedEmailsProps) {
    const router = useRouter();

    const handleRefresh = () => {
        router.refresh();
    };

    return <EmailList emails={initialEmails} onRefresh={handleRefresh} />;
}
