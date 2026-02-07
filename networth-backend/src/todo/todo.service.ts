import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ToDoItem, Prisma } from '@prisma/client';

@Injectable()
export class TodoService {
    constructor(private prisma: PrismaService) { }

    async create(data: Prisma.ToDoItemUncheckedCreateInput): Promise<ToDoItem> {
        return this.prisma.toDoItem.create({
            data,
        });
    }

    async findAll(userId: string, type?: string, isCompleted?: boolean): Promise<ToDoItem[]> {
        const where: Prisma.ToDoItemWhereInput = { userId };

        if (type) {
            where.type = type;
        }

        if (isCompleted !== undefined) {
            where.isCompleted = isCompleted;
        }

        return this.prisma.toDoItem.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string, userId: string): Promise<ToDoItem | null> {
        return this.prisma.toDoItem.findFirst({
            where: { id, userId },
        });
    }

    async update(id: string, userId: string, data: Prisma.ToDoItemUpdateInput): Promise<ToDoItem> {
        // Verify ownership
        const item = await this.findOne(id, userId);
        if (!item) {
            throw new Error('Item not found or access denied');
        }

        return this.prisma.toDoItem.update({
            where: { id },
            data,
        });
    }

    async remove(id: string, userId: string): Promise<ToDoItem> {
        // Verify ownership
        const item = await this.findOne(id, userId);
        if (!item) {
            throw new Error('Item not found or access denied');
        }

        return this.prisma.toDoItem.delete({
            where: { id },
        });
    }
}
