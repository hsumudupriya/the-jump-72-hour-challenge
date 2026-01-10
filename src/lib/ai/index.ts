/**
 * AI Module Exports
 *
 * Barrel file for AI-related functionality.
 */

export { genai, isGeminiConfigured, GEMINI_MODEL } from './gemini-client';
export { categorizeEmail, categorizeEmails } from './categorizer';
export type { CategorizationResult } from './categorizer';
export { summarizeEmail, summarizeEmails } from './summarizer';
export {
    processEmailsForUser,
    processAllEmails,
    recategorizeEmails,
} from './batch-processor';
export type { ProcessingStats } from './batch-processor';
export {
    buildCategorizationPrompt,
    buildSummarizationPrompt,
    buildBatchCategorizationPrompt,
    buildBatchSummarizationPrompt,
} from './prompts';
