import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createCategorySchema } from '@/lib/validations/category';
import { ZodError } from 'zod';

// GET /api/categories - List all categories for the current user
export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const categories = await prisma.category.findMany({
            where: { userId: session.user.id },
            include: {
                _count: {
                    select: { emails: true },
                },
            },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        });

        return NextResponse.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        return NextResponse.json(
            { error: 'Failed to fetch categories' },
            { status: 500 }
        );
    }
}

// POST /api/categories - Create a new category
export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const validatedData = createCategorySchema.parse(body);

        // Check if category with same name already exists for this user
        const existingCategory = await prisma.category.findUnique({
            where: {
                userId_name: {
                    userId: session.user.id,
                    name: validatedData.name,
                },
            },
        });

        if (existingCategory) {
            return NextResponse.json(
                { error: 'A category with this name already exists' },
                { status: 409 }
            );
        }

        const category = await prisma.category.create({
            data: {
                userId: session.user.id,
                name: validatedData.name,
                description: validatedData.description ?? null,
                color: validatedData.color,
            },
            include: {
                _count: {
                    select: { emails: true },
                },
            },
        });

        return NextResponse.json(category, { status: 201 });
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', details: error.issues },
                { status: 400 }
            );
        }

        console.error('Error creating category:', error);
        return NextResponse.json(
            { error: 'Failed to create category' },
            { status: 500 }
        );
    }
}
