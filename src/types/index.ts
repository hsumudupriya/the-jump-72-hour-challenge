// User types
export interface User {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    createdAt: Date;
    updatedAt: Date;
}

// Email Account types
export interface EmailAccount {
    id: string;
    userId: string;
    email: string;
    accessToken: string;
    refreshToken: string | null;
    expiresAt: Date | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// Category types
export interface Category {
    id: string;
    userId: string;
    name: string;
    description: string | null;
    color: string;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
    _count?: {
        emails: number;
    };
}

export interface CreateCategoryInput {
    name: string;
    description?: string;
    color?: string;
}

export interface UpdateCategoryInput {
    name?: string;
    description?: string;
    color?: string;
}

// Email types
export interface Email {
    id: string;
    accountId: string;
    categoryId: string | null;
    gmailId: string;
    threadId: string | null;
    subject: string;
    snippet: string | null;
    body: string | null;
    bodyHtml: string | null;
    from: string;
    to: string[];
    headers: Record<string, string> | null;
    summary: string | null;
    aiConfidence: number | null;
    unsubscribeLink: string | null;
    isRead: boolean;
    isArchived: boolean;
    receivedAt: Date;
    createdAt: Date;
    updatedAt: Date;
    category?: Category | null;
    account?: EmailAccount;
}

// API Response types
export interface ApiResponse<T> {
    data?: T;
    error?: string;
    message?: string;
}

// Pagination types
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

// AI types
export interface CategorizationResult {
    categoryId: string | null;
    confidence: number;
    reasoning: string;
}

export interface SummarizationResult {
    summary: string;
}

// Bulk action types
export interface BulkActionResult {
    success: boolean;
    processed: number;
    failed: number;
    errors?: string[];
}

// Unsubscribe agent types
export interface UnsubscribeResult {
    emailId: string;
    success: boolean;
    message: string;
}

export interface AgentAction {
    type: 'click' | 'type' | 'select' | 'complete' | 'scroll';
    selector?: string;
    text?: string;
    value?: string;
}
