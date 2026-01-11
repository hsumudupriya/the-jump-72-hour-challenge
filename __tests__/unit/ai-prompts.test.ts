import {
    buildCategorizationPrompt,
    buildSummarizationPrompt,
} from '@/lib/ai/prompts';

describe('AI Prompts', () => {
    describe('buildCategorizationPrompt', () => {
        const mockCategories = [
            { id: 'cat1', name: 'Work', description: 'Work-related emails' },
            { id: 'cat2', name: 'Personal', description: 'Personal emails' },
            { id: 'cat3', name: 'Newsletters', description: null },
        ];

        it('should build a valid categorization prompt', () => {
            const prompt = buildCategorizationPrompt(
                {
                    subject: 'Test Subject',
                    from: 'sender@example.com',
                    body: null,
                    snippet: 'This is a test email snippet',
                },
                mockCategories
            );

            expect(prompt).toContain('Test Subject');
            expect(prompt).toContain('sender@example.com');
            expect(prompt).toContain('This is a test email snippet');
            expect(prompt).toContain('Work');
            expect(prompt).toContain('Personal');
            expect(prompt).toContain('Newsletters');
        });

        it('should include category descriptions when available', () => {
            const prompt = buildCategorizationPrompt(
                {
                    subject: 'Test',
                    from: 'test@test.com',
                    body: null,
                    snippet: 'Test snippet',
                },
                mockCategories
            );

            expect(prompt).toContain('Work-related emails');
            expect(prompt).toContain('Personal emails');
        });

        it('should include category IDs for JSON response', () => {
            const prompt = buildCategorizationPrompt(
                {
                    subject: 'Test',
                    from: 'test@test.com',
                    body: null,
                    snippet: 'Test snippet',
                },
                mockCategories
            );

            expect(prompt).toContain('cat1');
            expect(prompt).toContain('cat2');
            expect(prompt).toContain('cat3');
        });
    });

    describe('buildSummarizationPrompt', () => {
        it('should build a valid summarization prompt', () => {
            const prompt = buildSummarizationPrompt({
                subject: 'Meeting Tomorrow',
                from: 'boss@company.com',
                body: 'Please join the meeting tomorrow at 10am in the conference room.',
                snippet: null,
            });

            expect(prompt).toContain('Meeting Tomorrow');
            expect(prompt).toContain('boss@company.com');
            expect(prompt).toContain('Please join the meeting');
        });

        it('should handle empty body gracefully', () => {
            const prompt = buildSummarizationPrompt({
                subject: 'Empty Email',
                from: 'sender@test.com',
                body: '',
                snippet: 'Fallback snippet',
            });

            expect(prompt).toContain('Empty Email');
            expect(prompt).toContain('sender@test.com');
        });

        it('should use snippet when body is null', () => {
            const prompt = buildSummarizationPrompt({
                subject: 'Email with snippet',
                from: 'sender@test.com',
                body: null,
                snippet: 'This is the snippet content',
            });

            expect(prompt).toContain('This is the snippet content');
        });

        it('should prefer body over snippet when both available', () => {
            const prompt = buildSummarizationPrompt({
                subject: 'Email',
                from: 'sender@test.com',
                body: 'Full body content here',
                snippet: 'Snippet content',
            });

            expect(prompt).toContain('Full body content here');
        });
    });
});
