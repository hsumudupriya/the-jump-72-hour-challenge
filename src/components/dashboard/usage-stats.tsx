'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Zap, DollarSign, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface UsageStats {
    period: string;
    totalTokens: number;
    totalCost: number;
    formattedCost: string;
    byOperation: Record<
        string,
        { tokens: number; cost: number; count: number }
    >;
}

const OPERATION_LABELS: Record<string, string> = {
    categorization: 'Categorization',
    summarization: 'Summarization',
    unsubscribe_extraction: 'Unsubscribe Detection',
    page_analysis: 'Page Analysis',
    result_analysis: 'Result Analysis',
};

export function UsageStats() {
    const [stats, setStats] = useState<UsageStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('all');

    useEffect(() => {
        async function fetchStats() {
            setLoading(true);
            try {
                const response = await fetch(`/api/usage?period=${period}`);
                if (response.ok) {
                    const data = await response.json();
                    setStats(data);
                }
            } catch (error) {
                console.error('Failed to fetch usage stats:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, [period]);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <div className='flex items-center justify-between'>
                        <CardTitle className='flex items-center gap-2 text-lg'>
                            <Activity className='h-5 w-5 text-primary' />
                            AI Usage
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent className='space-y-4'>
                    <Skeleton className='h-16 w-full' />
                    <Skeleton className='h-16 w-full' />
                </CardContent>
            </Card>
        );
    }

    if (!stats) {
        return null;
    }

    const operations = Object.entries(stats.byOperation);

    return (
        <Card>
            <CardHeader>
                <div className='flex items-center justify-between'>
                    <CardTitle className='flex items-center gap-2 text-lg'>
                        <Activity className='h-5 w-5 text-primary' />
                        AI Usage
                    </CardTitle>
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className='w-32'>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value='today'>Today</SelectItem>
                            <SelectItem value='week'>This Week</SelectItem>
                            <SelectItem value='month'>This Month</SelectItem>
                            <SelectItem value='all'>All Time</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent className='space-y-4'>
                {/* Summary Stats */}
                <div className='grid grid-cols-2 gap-4'>
                    <div className='flex items-center gap-3 rounded-lg border p-3'>
                        <div className='flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10'>
                            <Zap className='h-5 w-5 text-blue-500' />
                        </div>
                        <div>
                            <p className='text-lg font-bold'>
                                {stats.totalTokens.toLocaleString()}
                            </p>
                            <p className='text-xs text-muted-foreground'>
                                Total Tokens
                            </p>
                        </div>
                    </div>
                    <div className='flex items-center gap-3 rounded-lg border p-3'>
                        <div className='flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10'>
                            <DollarSign className='h-5 w-5 text-green-500' />
                        </div>
                        <div>
                            <p className='text-lg font-bold'>
                                {stats.formattedCost}
                            </p>
                            <p className='text-xs text-muted-foreground'>
                                Estimated Cost
                            </p>
                        </div>
                    </div>
                </div>

                {/* Breakdown by Operation */}
                {operations.length > 0 && (
                    <div className='space-y-2'>
                        <p className='text-sm font-medium text-muted-foreground'>
                            By Operation
                        </p>
                        <div className='space-y-2'>
                            {operations.map(([op, data]) => (
                                <div
                                    key={op}
                                    className='flex items-center justify-between rounded border px-3 py-2 text-sm'
                                >
                                    <span>
                                        {OPERATION_LABELS[op] || op}
                                        <span className='ml-2 text-muted-foreground'>
                                            ({data.count}x)
                                        </span>
                                    </span>
                                    <span className='text-muted-foreground'>
                                        {data.tokens.toLocaleString()} tokens
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {stats.totalTokens === 0 && (
                    <p className='text-center text-sm text-muted-foreground'>
                        No AI usage recorded yet
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
