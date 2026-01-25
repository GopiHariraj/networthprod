import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {
    console.log('[UsersController] Initialized');
  }

  @Get()
  @Roles(Role.SUPER_ADMIN)
  async getAllUsers(): Promise<UserResponseDto[]> {
    console.log('[UsersController] getAllUsers called');
    try {
      const users = await this.usersService.findAll();
      console.log(`[UsersController] Returning ${users.length} users`);
      return users;
    } catch (error) {
      console.error('[UsersController] Error fetching users:', error);
      throw error;
    }
  }

  @Get('me/profile')
  async getMyProfile(@Req() req: any): Promise<UserResponseDto> {
    return this.usersService.findOne(req.user.id);
  }

  @Put('me/currency')
  async updateCurrency(
    @Req() req: any,
    @Body() body: { currency: string },
  ): Promise<{ success: boolean; currency: string }> {
    console.log(`[UsersController] updateCurrency for user ${req.user.id}:`, body.currency);
    await this.usersService.updateCurrency(req.user.id, body.currency);
    return { success: true, currency: body.currency };
  }

  @Put('me/module-visibility')
  async updateModuleVisibility(
    @Req() req: any,
    @Body() body: { moduleVisibility: any },
  ): Promise<{ success: boolean; moduleVisibility: any }> {
    console.log(`[UsersController] updateModuleVisibility for user ${req.user.id}:`, body.moduleVisibility);
    await this.usersService.updateModuleVisibility(req.user.id, body.moduleVisibility);
    return { success: true, moduleVisibility: body.moduleVisibility };
  }

  @Put('me/product-tour')
  async updateProductTourPreference(
    @Req() req: any,
    @Body() body: { enableProductTour: boolean },
  ): Promise<{ success: boolean; enableProductTour: boolean }> {
    console.log(`[UsersController] updateProductTourPreference for user ${req.user.id}:`, body.enableProductTour);
    await this.usersService.updateProductTourPreference(req.user.id, body.enableProductTour);
    return { success: true, enableProductTour: body.enableProductTour };
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN)
  async getUserById(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN)
  async createUser(
    @Body() createUserDto: CreateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto);
  }

  @Put(':id')
  @Roles(Role.SUPER_ADMIN)
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: any,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, updateUserDto, req.user.id);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  async deleteUser(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<{ message: string }> {
    return this.usersService.softDelete(id, req.user.id);
  }

  @Post('reset-password')
  @Roles(Role.SUPER_ADMIN)
  async generateResetLink(
    @Body() body: { userId: string },
  ): Promise<{ resetLink: string; token: string }> {
    return this.usersService.generateResetLink(body.userId);
  }
}
