'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CategoryCard } from './category-card';
import { EditCategoryDialog } from './edit-category-dialog';
import { DeleteCategoryDialog } from './delete-category-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

interface Category {
    id: string;
    name: string;
    description?: string | null;
    color: string;
    isDefault: boolean;
    _count: {
        emails: number;
    };
}

interface CategoryListItemProps {
    category: Category;
}

export function CategoryListItem({ category }: CategoryListItemProps) {
    const router = useRouter();
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const handleClick = () => {
        router.push(`/dashboard/categories/${category.id}`);
    };

    return (
        <div className='relative group'>
            <CategoryCard category={category} onClick={handleClick} />

            <div className='absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity'>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant='ghost'
                            size='icon'
                            className='h-8 w-8'
                            onClick={(e) => e.stopPropagation()}
                        >
                            <MoreHorizontal className='h-4 w-4' />
                            <span className='sr-only'>Open menu</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                setEditOpen(true);
                            }}
                        >
                            <Pencil className='mr-2 h-4 w-4' />
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                setDeleteOpen(true);
                            }}
                            disabled={category.isDefault}
                            className='text-destructive focus:text-destructive'
                        >
                            <Trash2 className='mr-2 h-4 w-4' />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <EditCategoryDialog
                category={category}
                open={editOpen}
                onOpenChange={setEditOpen}
            />

            <DeleteCategoryDialog
                category={category}
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
            />
        </div>
    );
}
