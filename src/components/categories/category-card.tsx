'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail } from 'lucide-react';

interface CategoryCardProps {
    category: {
        id: string;
        name: string;
        description?: string | null;
        color: string;
        isDefault: boolean;
        _count: {
            emails: number;
        };
    };
    onClick?: () => void;
}

export function CategoryCard({ category, onClick }: CategoryCardProps) {
    return (
        <Card
            className='cursor-pointer transition-all hover:shadow-md hover:border-primary/50'
            onClick={onClick}
        >
            <CardHeader className='pb-2'>
                <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                        <div
                            className='h-4 w-4 rounded-full'
                            style={{ backgroundColor: category.color }}
                        />
                        <CardTitle className='text-base'>
                            {category.name}
                        </CardTitle>
                    </div>
                    <div className='flex items-center gap-2'>
                        {category.isDefault && (
                            <Badge variant='secondary' className='text-xs'>
                                Default
                            </Badge>
                        )}
                        <Badge variant='outline' className='gap-1'>
                            <Mail className='h-3 w-3' />
                            {category._count.emails}
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            {category.description && (
                <CardContent className='pt-0'>
                    <p className='text-sm text-muted-foreground line-clamp-2'>
                        {category.description}
                    </p>
                </CardContent>
            )}
        </Card>
    );
}
