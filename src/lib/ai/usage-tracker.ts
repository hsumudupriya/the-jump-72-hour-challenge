import { prisma } from '@/lib/prisma';

// Gemini 2.5 Flash pricing (USD per 1M tokens)
// https://ai.google.dev/pricing
const PRICING = {
    'gemini-2.5-flash': {
        input: 0.075, // $0.075 per 1M input tokens
        output: 0.3, // $0.30 per 1M output tokens
    },
} as const;

export type AIOperation =
    | 'categorization'
    | 'summarization'
    | 'unsubscribe_extraction'
    | 'page_analysis'
    | 'result_analysis';

export interface UsageMetadata {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
}

/** Shared type for AI streaming response chunks */
export interface AIStreamChunk {
    text?: string;
    usageMetadata?: UsageMetadata;
}

/**
 * Calculate estimated cost based on token counts and model pricing
 */
function calculateCost(
    model: string,
    promptTokens: number,
    completionTokens: number
): number {
    const pricing =
        PRICING[model as keyof typeof PRICING] || PRICING['gemini-2.5-flash'];
    const inputCost = (promptTokens / 1_000_000) * pricing.input;
    const outputCost = (completionTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
}

/**
 * Track AI usage from a Gemini API response
 * Call this after each AI operation to record token usage
 */
export async function trackAIUsage(
    userId: string,
    operation: AIOperation,
    usageMetadata: UsageMetadata | undefined,
    model: string = 'gemini-2.5-flash'
): Promise<void> {
    if (!usageMetadata) {
        console.warn('No usage metadata available for tracking');
        return;
    }

    const promptTokens = usageMetadata.promptTokenCount || 0;
    const completionTokens = usageMetadata.candidatesTokenCount || 0;
    const totalTokens =
        usageMetadata.totalTokenCount || promptTokens + completionTokens;
    const estimatedCost = calculateCost(model, promptTokens, completionTokens);

    try {
        await prisma.aIUsage.create({
            data: {
                userId,
                operation,
                model,
                promptTokens,
                completionTokens,
                totalTokens,
                estimatedCost,
            },
        });
    } catch (error) {
        // Silently fail to avoid breaking the main flow
        console.error('Failed to track AI usage:', error);
    }
}

/**
 * Extract usage metadata from a streaming response
 * For streaming, we need to collect all chunks and get the final usage
 */
export function extractUsageFromStream(
    chunks: Array<{ usageMetadata?: UsageMetadata }>
): UsageMetadata | undefined {
    // Usage metadata is typically in the last chunk
    for (let i = chunks.length - 1; i >= 0; i--) {
        if (chunks[i].usageMetadata) {
            return chunks[i].usageMetadata;
        }
    }
    return undefined;
}

/**
 * Get aggregated usage statistics for a user
 */
export async function getUserUsageStats(
    userId: string,
    startDate?: Date,
    endDate?: Date
): Promise<{
    totalTokens: number;
    totalCost: number;
    byOperation: Record<
        string,
        { tokens: number; cost: number; count: number }
    >;
}> {
    const where = {
        userId,
        ...(startDate || endDate
            ? {
                  createdAt: {
                      ...(startDate ? { gte: startDate } : {}),
                      ...(endDate ? { lte: endDate } : {}),
                  },
              }
            : {}),
    };

    const usage = await prisma.aIUsage.findMany({
        where,
        select: {
            operation: true,
            totalTokens: true,
            estimatedCost: true,
        },
    });

    const byOperation: Record<
        string,
        { tokens: number; cost: number; count: number }
    > = {};
    let totalTokens = 0;
    let totalCost = 0;

    for (const record of usage) {
        totalTokens += record.totalTokens;
        totalCost += record.estimatedCost;

        if (!byOperation[record.operation]) {
            byOperation[record.operation] = { tokens: 0, cost: 0, count: 0 };
        }
        byOperation[record.operation].tokens += record.totalTokens;
        byOperation[record.operation].cost += record.estimatedCost;
        byOperation[record.operation].count += 1;
    }

    return {
        totalTokens,
        totalCost,
        byOperation,
    };
}
