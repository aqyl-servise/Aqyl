import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { TeachersService } from "../teachers/teachers.service";
import { UserRole } from "../teachers/entities/teacher.entity";

@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get()
  @Roles("admin", "principal")
  findAll() {
    return this.teachersService.findAll();
  }

  @Get("teachers")
  @Roles("admin", "principal", "vice_principal")
  findTeachers() {
    return this.teachersService.findByRole("teacher");
  }

  @Get("by-role/:role")
  @Roles("admin", "principal")
  findByRole(@Param("role") role: UserRole) {
    return this.teachersService.findByRole(role);
  }

  @Get(":id")
  @Roles("admin", "principal", "vice_principal")
  findOne(@Param("id") id: string) {
    return this.teachersService.findById(id);
  }

  @Post()
  @Roles("admin")
  async create(@Body() body: { fullName: string; email: string; password: string; role: UserRole; subject?: string; experience?: number; category?: string }) {
    const passwordHash = await bcrypt.hash(body.password, 10);
    return this.teachersService.create({ ...body, email: body.email.toLowerCase(), passwordHash });
  }

  @Patch(":id")
  @Roles("admin")
  update(@Param("id") id: string, @Body() body: Partial<{ fullName: string; role: UserRole; subject: string; experience: number; category: string; university: string; phone: string }>) {
    return this.teachersService.updateProfile(id, body);
  }

  @Delete(":id")
  @Roles("admin")
  remove(@Param("id") id: string) {
    return this.teachersService.remove(id);
  }
}
