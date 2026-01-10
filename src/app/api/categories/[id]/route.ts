import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateCategorySchema } from '@/lib/validations/category';
import { ZodError } from 'zod';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/categories/[id] - Get a single category
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const session = await auth();
        const { id } = await params;

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const category = await prisma.category.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { emails: true },
                },
            },
        });

        if (!category) {
            return NextResponse.json(
                { error: 'Category not found' },
                { status: 404 }
            );
        }

        // Ensure user owns this category
        if (category.userId !== session.user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json(category);
    } catch (error) {
        console.error('Error fetching category:', error);
        return NextResponse.json(
            { error: 'Failed to fetch category' },
            { status: 500 }
        );
    }
}

// PUT /api/categories/[id] - Update a category
export async function PUT(request: Request, { params }: RouteParams) {
    try {
        const session = await auth();
        const { id } = await params;

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check if category exists and belongs to user
        const existingCategory = await prisma.category.findUnique({
            where: { id },
        });

        if (!existingCategory) {
            return NextResponse.json(
                { error: 'Category not found' },
                { status: 404 }
            );
        }

        if (existingCategory.userId !== session.user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const validatedData = updateCategorySchema.parse({ ...body, id });

        // Check for duplicate name if name is being changed
        if (
            validatedData.name &&
            validatedData.name !== existingCategory.name
        ) {
            const duplicateName = await prisma.category.findUnique({
                where: {
                    userId_name: {
                        userId: session.user.id,
                        name: validatedData.name,
                    },
                },
            });

            if (duplicateName) {
                return NextResponse.json(
                    { error: 'A category with this name already exists' },
                    { status: 409 }
                );
            }
        }

        const category = await prisma.category.update({
            where: { id },
            data: {
                name: validatedData.name,
                description: validatedData.description,
                color: validatedData.color,
            },
            include: {
                _count: {
                    select: { emails: true },
                },
            },
        });

        return NextResponse.json(category);
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', details: error.issues },
                { status: 400 }
            );
        }

        console.error('Error updating category:', error);
        return NextResponse.json(
            { error: 'Failed to update category' },
            { status: 500 }
        );
    }
}

// DELETE /api/categories/[id] - Delete a category
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const session = await auth();
        const { id } = await params;

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check if category exists and belongs to user
        const existingCategory = await prisma.category.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { emails: true },
                },
            },
        });

        if (!existingCategory) {
            return NextResponse.json(
                { error: 'Category not found' },
                { status: 404 }
            );
        }

        if (existingCategory.userId !== session.user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Prevent deletion of default category
        if (existingCategory.isDefault) {
            return NextResponse.json(
                { error: 'Cannot delete the default category' },
                { status: 400 }
            );
        }

        await prisma.category.delete({
            where: { id },
        });

        return NextResponse.json({
            success: true,
            message: 'Category deleted',
            emailsAffected: existingCategory._count.emails,
        });
    } catch (error) {
        console.error('Error deleting category:', error);
        return NextResponse.json(
            { error: 'Failed to delete category' },
            { status: 500 }
        );
    }
}
