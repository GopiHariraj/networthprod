import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { TodoService } from './todo.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTodoDto, UpdateTodoDto } from './dto/todo.dto';

@Controller('todo')
@UseGuards(JwtAuthGuard)
export class TodoController {
    constructor(private readonly todoService: TodoService) { }

    @Post()
    create(@Request() req: any, @Body() createTodoDto: CreateTodoDto) {
        return this.todoService.create({
            ...createTodoDto,
            userId: req.user.id,
        });
    }

    @Get()
    findAll(
        @Request() req: any,
        @Query('type') type?: string,
        @Query('isCompleted') isCompleted?: string
    ) {
        const completedBool = isCompleted === 'true' ? true : isCompleted === 'false' ? false : undefined;
        return this.todoService.findAll(req.user.id, type, completedBool);
    }

    @Get(':id')
    findOne(@Request() req: any, @Param('id') id: string) {
        return this.todoService.findOne(id, req.user.id);
    }

    @Patch(':id')
    update(@Request() req: any, @Param('id') id: string, @Body() updateTodoDto: UpdateTodoDto) {
        return this.todoService.update(id, req.user.id, updateTodoDto);
    }

    @Delete(':id')
    remove(@Request() req: any, @Param('id') id: string) {
        return this.todoService.remove(id, req.user.id);
    }
}
