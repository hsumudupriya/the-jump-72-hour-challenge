'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, Mail } from 'lucide-react';

interface UncategorizedCardProps {
    count: number;
}

export function UncategorizedCard({ count }: UncategorizedCardProps) {
    const router = useRouter();

    const handleClick = () => {
        router.push('/dashboard/uncategorized');
    };

    return (
        <Card
            className='cursor-pointer transition-all hover:shadow-md hover:border-orange-500/50 border-orange-200 dark:border-orange-900'
            onClick={handleClick}
        >
            <CardHeader className='pb-2'>
                <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                        <div className='h-4 w-4 rounded-full bg-orange-500' />
                        <CardTitle className='text-base'>
                            Uncategorized
                        </CardTitle>
                    </div>
                    <div className='flex items-center gap-2'>
                        <Badge
                            variant='outline'
                            className='gap-1 border-orange-500 text-orange-500'
                        >
                            <Mail className='h-3 w-3' />
                            {count}
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className='pt-0'>
                <p className='text-sm text-muted-foreground line-clamp-2'>
                    <HelpCircle className='inline h-3 w-3 mr-1' />
                    Emails that haven&apos;t been categorized yet
                </p>
            </CardContent>
        </Card>
    );
}
