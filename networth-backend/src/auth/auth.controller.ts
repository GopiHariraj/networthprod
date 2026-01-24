import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Req,
  Get,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto, MagicLoginDto } from './dto/password-reset.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() signInDto: LoginDto) {
    return this.authService.login(signInDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('magic-login')
  magicLogin(@Body() dto: MagicLoginDto) {
    return this.authService.loginWithMagicLink(dto.token);
  }

  @Post('signup')
  signup(@Body() signupDto: any) {
    return this.authService.signup(signupDto);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req: any) {
    // Initiates the Google OAuth flow
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: any, @Res() res: any) {
    const user = await this.authService.validateGoogleUser(req.user);
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User'
    };
    const token = this.authService['jwtService'].sign(payload); // Accessing private jwtService or expose it public/method

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/google/callback?token=${token}`);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.updatePassword(req.user.id, dto.currentPassword, dto.newPassword);
  }
}
