import {
    categorySchema,
    createCategorySchema,
    updateCategorySchema,
} from '@/lib/validations/category';

describe('Category Validation Schemas', () => {
    describe('categorySchema', () => {
        it('should validate a valid category', () => {
            const validCategory = {
                name: 'Work',
                description: 'Work-related emails',
                color: '#ff5733',
            };

            const result = categorySchema.safeParse(validCategory);
            expect(result.success).toBe(true);
        });

        it('should reject empty name', () => {
            const invalidCategory = {
                name: '',
                description: 'Description',
                color: '#ff5733',
            };

            const result = categorySchema.safeParse(invalidCategory);
            expect(result.success).toBe(false);
        });
    });

    describe('createCategorySchema', () => {
        it('should validate a valid create request', () => {
            const validCreate = {
                name: 'New Category',
                description: 'A new category for testing',
                color: '#123456',
            };

            const result = createCategorySchema.safeParse(validCreate);
            expect(result.success).toBe(true);
        });

        it('should validate with name and color only', () => {
            const minimalCreate = {
                name: 'Minimal',
                color: '#abcdef',
            };

            const result = createCategorySchema.safeParse(minimalCreate);
            expect(result.success).toBe(true);
        });

        it('should reject missing color', () => {
            const invalidCreate = {
                name: 'Test Category',
            };

            const result = createCategorySchema.safeParse(invalidCreate);
            expect(result.success).toBe(false);
        });

        it('should reject name that is too long', () => {
            const invalidCreate = {
                name: 'A'.repeat(51),
                color: '#123456',
            };

            const result = createCategorySchema.safeParse(invalidCreate);
            expect(result.success).toBe(false);
        });

        it('should reject invalid color format', () => {
            const invalidCreate = {
                name: 'Test Category',
                color: 'not-a-color',
            };

            const result = createCategorySchema.safeParse(invalidCreate);
            expect(result.success).toBe(false);
        });

        it('should reject short hex colors (3 digits)', () => {
            const invalidCreate = {
                name: 'Test Category',
                color: '#fff',
            };

            const result = createCategorySchema.safeParse(invalidCreate);
            expect(result.success).toBe(false);
        });

        it('should accept valid 6-digit hex colors', () => {
            const colors = ['#ffffff', '#FF5733', '#123456', '#000000'];

            for (const color of colors) {
                const result = createCategorySchema.safeParse({
                    name: 'Test',
                    color,
                });
                expect(result.success).toBe(true);
            }
        });
    });

    describe('updateCategorySchema', () => {
        it('should validate update with id and name', () => {
            const update = {
                id: 'clxyz1234567890abcdefgh',
                name: 'Updated Name',
            };

            const result = updateCategorySchema.safeParse(update);
            expect(result.success).toBe(true);
        });

        it('should validate update with id only', () => {
            const update = {
                id: 'clxyz1234567890abcdefgh',
            };

            const result = updateCategorySchema.safeParse(update);
            expect(result.success).toBe(true);
        });

        it('should validate full update', () => {
            const fullUpdate = {
                id: 'clxyz1234567890abcdefgh',
                name: 'Full Update',
                description: 'Updated description',
                color: '#abcdef',
            };

            const result = updateCategorySchema.safeParse(fullUpdate);
            expect(result.success).toBe(true);
        });

        it('should reject update without id', () => {
            const noIdUpdate = {
                name: 'Updated Name',
            };

            const result = updateCategorySchema.safeParse(noIdUpdate);
            expect(result.success).toBe(false);
        });
    });
});
