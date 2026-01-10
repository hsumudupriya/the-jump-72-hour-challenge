'use client';

import { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface Category {
    id: string;
    name: string;
    isDefault: boolean;
    _count: {
        emails: number;
    };
}

interface DeleteCategoryDialogProps {
    category: Category;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DeleteCategoryDialog({
    category,
    open,
    onOpenChange,
}: DeleteCategoryDialogProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const response = await fetch(`/api/categories/${category.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete category');
            }

            toast.success('Category deleted successfully');
            onOpenChange(false);
            router.refresh();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Failed to delete category'
            );
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Category</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete &quot;{category.name}
                        &quot;?
                        {category._count.emails > 0 && (
                            <>
                                <br />
                                <br />
                                <strong className='text-foreground'>
                                    {category._count.emails} email
                                    {category._count.emails === 1 ? '' : 's'}
                                </strong>{' '}
                                will be uncategorized. This action cannot be
                                undone.
                            </>
                        )}
                        {category._count.emails === 0 && (
                            <> This action cannot be undone.</>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                    >
                        {isDeleting ? (
                            <div className='flex items-center gap-2'>
                                <div className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
                                Deleting...
                            </div>
                        ) : (
                            'Delete'
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
