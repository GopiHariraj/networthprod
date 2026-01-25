import { Role } from '@prisma/client';

export class UserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  role: Role;
  currency: string;
  isActive: boolean;
  isDisabled: boolean;
  failedLoginAttempts: number;
  forceChangePassword: boolean;
  moduleVisibility: any;
  enableProductTour: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }

  static fromUser(user: any): UserResponseDto {
    const mv = typeof user.moduleVisibility === 'string'
      ? JSON.parse(user.moduleVisibility)
      : user.moduleVisibility;
    console.log(`[UserResponseDto] parsed moduleVisibility for ${user.id}:`, JSON.stringify(mv));

    return new UserResponseDto({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      currency: user.currency,
      isActive: user.isActive,
      isDisabled: user.isDisabled,
      failedLoginAttempts: user.failedLoginAttempts,
      forceChangePassword: user.forceChangePassword,
      moduleVisibility: mv,
      enableProductTour: user.enableProductTour ?? true,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }
}
