import { Body, Controller, Get, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { TeachersService } from "../teachers/teachers.service";

interface AuthUser { id: string; fullName: string; email: string; preferredLanguage: string; role: string; subject?: string }

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly teachersService: TeachersService,
  ) {}

  @Post("login")
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@Req() req: { user: AuthUser }) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Patch("profile")
  async updateProfile(
    @Req() req: { user: AuthUser },
    @Body() body: Partial<{ phone: string; experience: number; category: string; university: string; courses: string; achievements: string; preferredLanguage: string }>,
  ) {
    return this.teachersService.updateProfile(req.user.id, body);
  }
}
