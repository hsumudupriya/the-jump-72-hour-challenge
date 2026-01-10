'use client';

import { useRouter } from 'next/navigation';
import { EmailList } from '@/components/emails';
import type { EmailData } from '@/components/emails/email-card';

interface CategoryEmailsProps {
    initialEmails: EmailData[];
}

export function CategoryEmails({ initialEmails }: CategoryEmailsProps) {
    const router = useRouter();

    const handleRefresh = () => {
        router.refresh();
    };

    return <EmailList emails={initialEmails} onRefresh={handleRefresh} />;
}
