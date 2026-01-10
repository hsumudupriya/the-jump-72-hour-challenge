'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { CategoryForm } from './category-form';
import { type CategoryFormData } from '@/lib/validations/category';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface CreateCategoryDialogProps {
    trigger?: React.ReactNode;
}

export function CreateCategoryDialog({ trigger }: CreateCategoryDialogProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    const handleSubmit = async (data: CategoryFormData) => {
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create category');
            }

            toast.success('Category created successfully');
            setOpen(false);
            router.refresh();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Failed to create category'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ?? (
                    <Button size='sm' className='gap-1'>
                        <Plus className='h-4 w-4' />
                        Add Category
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle>Create Category</DialogTitle>
                    <DialogDescription>
                        Add a new category for organizing your emails. The AI
                        will use the description to sort emails automatically.
                    </DialogDescription>
                </DialogHeader>
                <CategoryForm
                    onSubmit={handleSubmit}
                    onCancel={() => setOpen(false)}
                    isSubmitting={isSubmitting}
                    submitLabel='Create Category'
                />
            </DialogContent>
        </Dialog>
    );
}
