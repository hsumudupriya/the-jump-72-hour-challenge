import { z } from 'zod';

export const categorySchema = z.object({
    name: z
        .string()
        .min(1, 'Category name is required')
        .max(50, 'Category name must be less than 50 characters')
        .trim(),
    description: z
        .string()
        .max(500, 'Description must be less than 500 characters')
        .optional()
        .nullable(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
});

export const createCategorySchema = categorySchema;

export const updateCategorySchema = categorySchema.partial().extend({
    id: z.string().cuid(),
});

export type CategoryFormData = z.infer<typeof categorySchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
