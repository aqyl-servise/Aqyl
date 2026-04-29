import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { TeachersService } from "../teachers/teachers.service";
import { UserRole } from "../teachers/entities/teacher.entity";

interface ReqUser { user: { id: string; role: string; schoolId?: string | null } }

@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get()
  @Roles("admin", "principal")
  findAll(@Req() req: ReqUser) {
    if (req.user.schoolId) return this.teachersService.findBySchool(req.user.schoolId);
    return this.teachersService.findAll();
  }

  @Get("teachers")
  @Roles("admin", "principal", "vice_principal")
  findTeachers(@Req() req: ReqUser) {
    return this.teachersService.findByRoleAndSchool("teacher", req.user.schoolId ?? undefined);
  }

  @Get("by-role/:role")
  @Roles("admin", "principal")
  findByRole(@Param("role") role: UserRole, @Req() req: ReqUser) {
    return this.teachersService.findByRoleAndSchool(role, req.user.schoolId ?? undefined);
  }

  @Get(":id")
  @Roles("admin", "principal", "vice_principal")
  findOne(@Param("id") id: string) {
    return this.teachersService.findById(id);
  }

  @Post()
  @Roles("admin")
  async create(
    @Req() req: ReqUser,
    @Body() body: { fullName: string; email: string; password: string; role: UserRole; subject?: string; experience?: number; category?: string },
  ) {
    const passwordHash = await bcrypt.hash(body.password, 10);
    return this.teachersService.create({
      ...body,
      email: body.email.toLowerCase(),
      passwordHash,
      schoolId: req.user.schoolId ?? undefined,
    });
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
