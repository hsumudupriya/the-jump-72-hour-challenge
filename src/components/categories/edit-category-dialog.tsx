'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { CategoryForm } from './category-form';
import { type CategoryFormData } from '@/lib/validations/category';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface Category {
    id: string;
    name: string;
    description?: string | null;
    color: string;
}

interface EditCategoryDialogProps {
    category: Category;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditCategoryDialog({
    category,
    open,
    onOpenChange,
}: EditCategoryDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    const handleSubmit = async (data: CategoryFormData) => {
        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/categories/${category.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update category');
            }

            toast.success('Category updated successfully');
            onOpenChange(false);
            router.refresh();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Failed to update category'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle>Edit Category</DialogTitle>
                    <DialogDescription>
                        Update the category details. Changes will affect how the
                        AI categorizes future emails.
                    </DialogDescription>
                </DialogHeader>
                <CategoryForm
                    defaultValues={{
                        name: category.name,
                        description: category.description,
                        color: category.color,
                    }}
                    onSubmit={handleSubmit}
                    onCancel={() => onOpenChange(false)}
                    isSubmitting={isSubmitting}
                    submitLabel='Save Changes'
                />
            </DialogContent>
        </Dialog>
    );
}
