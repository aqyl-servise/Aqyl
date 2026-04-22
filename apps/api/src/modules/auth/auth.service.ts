import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { Teacher } from "../teachers/entities/teacher.entity";
import { TeachersService } from "../teachers/teachers.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly teachersService: TeachersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const teacher = await this.teachersService.findByEmail(loginDto.email);
    if (!teacher) throw new UnauthorizedException("Invalid credentials");

    const matches = await bcrypt.compare(loginDto.password, teacher.passwordHash);
    if (!matches) throw new UnauthorizedException("Invalid credentials");

    if (teacher.status === "pending") throw new ForbiddenException("PENDING");
    if (teacher.status === "rejected") throw new ForbiddenException("REJECTED");

    return {
      accessToken: await this.jwtService.signAsync({
        sub: teacher.id,
        email: teacher.email,
        role: teacher.role,
      }),
      user: this.serialize(teacher),
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.teachersService.findByEmail(dto.email);
    if (existing) throw new ConflictException("Email already registered");

    const passwordHash = await bcrypt.hash(dto.password, 10);
    await this.teachersService.create({
      fullName: dto.fullName,
      email: dto.email.toLowerCase(),
      passwordHash,
      role: dto.role as Teacher["role"],
      schoolName: dto.schoolName,
      status: "pending",
    });

    return { message: "Registration submitted. Awaiting admin approval." };
  }

  private serialize(teacher: Teacher) {
    return {
      id: teacher.id,
      fullName: teacher.fullName,
      email: teacher.email,
      preferredLanguage: teacher.preferredLanguage,
      role: teacher.role,
      subject: teacher.subject,
    };
  }
}
