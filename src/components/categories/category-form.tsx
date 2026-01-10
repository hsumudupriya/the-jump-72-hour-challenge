'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { HexColorPicker } from 'react-colorful';
import { useState } from 'react';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    categorySchema,
    type CategoryFormData,
} from '@/lib/validations/category';

// Preset colors for quick selection
const PRESET_COLORS = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#14b8a6', // teal
    '#3b82f6', // blue
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#6b7280', // gray
];

interface CategoryFormProps {
    defaultValues?: Partial<CategoryFormData>;
    onSubmit: (data: CategoryFormData) => Promise<void>;
    onCancel?: () => void;
    isSubmitting?: boolean;
    submitLabel?: string;
}

export function CategoryForm({
    defaultValues,
    onSubmit,
    onCancel,
    isSubmitting = false,
    submitLabel = 'Save',
}: CategoryFormProps) {
    const [colorPickerOpen, setColorPickerOpen] = useState(false);

    const form = useForm<CategoryFormData>({
        resolver: zodResolver(categorySchema),
        defaultValues: {
            name: defaultValues?.name ?? '',
            description: defaultValues?.description ?? '',
            color: defaultValues?.color ?? '#6366f1',
        },
    });

    const handleSubmit = async (data: CategoryFormData) => {
        await onSubmit(data);
    };

    const selectedColor = form.watch('color');

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className='space-y-4'
            >
                <FormField
                    control={form.control}
                    name='name'
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder='e.g., Work, Personal, Newsletters'
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name='description'
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder='Describe what emails should be sorted into this category. This helps the AI understand your intent.'
                                    className='min-h-20 resize-none'
                                    {...field}
                                    value={field.value ?? ''}
                                />
                            </FormControl>
                            <FormDescription>
                                The AI uses this description to categorize your
                                emails
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name='color'
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Color</FormLabel>
                            <FormControl>
                                <div className='flex items-center gap-3'>
                                    <Popover
                                        open={colorPickerOpen}
                                        onOpenChange={setColorPickerOpen}
                                    >
                                        <PopoverTrigger asChild>
                                            <Button
                                                type='button'
                                                variant='outline'
                                                className='h-10 w-10 p-0 border-2'
                                                style={{
                                                    backgroundColor:
                                                        selectedColor,
                                                }}
                                            >
                                                <span className='sr-only'>
                                                    Pick a color
                                                </span>
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            className='w-auto p-3'
                                            align='start'
                                        >
                                            <HexColorPicker
                                                color={selectedColor}
                                                onChange={field.onChange}
                                            />
                                            <div className='mt-3 flex flex-wrap gap-1'>
                                                {PRESET_COLORS.map((color) => (
                                                    <button
                                                        key={color}
                                                        type='button'
                                                        className='h-6 w-6 rounded-md border border-border hover:scale-110 transition-transform'
                                                        style={{
                                                            backgroundColor:
                                                                color,
                                                        }}
                                                        onClick={() => {
                                                            field.onChange(
                                                                color
                                                            );
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                    <Input
                                        {...field}
                                        className='w-28 font-mono text-sm'
                                        placeholder='#6366f1'
                                    />
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className='flex justify-end gap-2 pt-4'>
                    {onCancel && (
                        <Button
                            type='button'
                            variant='outline'
                            onClick={onCancel}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                    )}
                    <Button type='submit' disabled={isSubmitting}>
                        {isSubmitting ? (
                            <div className='flex items-center gap-2'>
                                <div className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
                                Saving...
                            </div>
                        ) : (
                            submitLabel
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
