import { Body, Controller, Delete, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { TeachersService } from "../teachers/teachers.service";
import { SchoolsService } from "../schools/schools.service";
import { UserRole } from "../teachers/entities/teacher.entity";
import { AdminUpdateUserDto } from "./dto/admin-update-user.dto";

interface ReqUser { user: { id: string; role: string; schoolId?: string | null } }

@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly teachersService: TeachersService,
    private readonly schoolsService: SchoolsService,
  ) {}

  @Get()
  @Roles("admin", "principal")
  findAll(@Req() req: ReqUser) {
    if (req.user.schoolId) return this.teachersService.findBySchool(req.user.schoolId);
    return this.teachersService.findAll();
  }

  @Get("teachers")
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic")
  findTeachers(@Req() req: ReqUser) {
    return this.teachersService.findByRoleAndSchool("teacher", req.user.schoolId ?? undefined);
  }

  @Get("by-role/:role")
  @Roles("admin", "principal")
  findByRole(@Param("role") role: UserRole, @Req() req: ReqUser) {
    return this.teachersService.findByRoleAndSchool(role, req.user.schoolId ?? undefined);
  }

  @Get(":id")
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic")
  async findOne(@Param("id") id: string, @Req() req: ReqUser) {
    const targetUser = await this.teachersService.findById(id);
    if (!targetUser) throw new NotFoundException();
    if (req.user.role !== "admin" && targetUser.schoolId !== req.user.schoolId) {
      throw new ForbiddenException("Access denied");
    }
    return targetUser;
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
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic")
  async update(
    @Param("id") id: string,
    @Body() body: AdminUpdateUserDto,
    @Req() req: ReqUser,
  ) {
    const target = await this.teachersService.findById(id);
    if (!target) throw new NotFoundException();

    // Non-admin school leaders may only manage staff within their own school,
    // may not move teachers across schools, and may not grant the admin role.
    if (req.user.role !== "admin") {
      if (target.schoolId !== req.user.schoolId) {
        throw new ForbiddenException("Access denied");
      }
      if (body.role === "admin") {
        throw new ForbiddenException("Недостаточно прав для назначения роли admin");
      }
      if (
        body.schoolId !== undefined &&
        body.schoolId !== req.user.schoolId
      ) {
        throw new ForbiddenException("Нельзя переносить учителя в другую школу");
      }
    }

    const data: Record<string, unknown> = { ...body };
    if (body.isClassTeacher === false) {
      data.managedClassroomId = null;
      data.managedClassroomName = null;
    }
    if ("schoolId" in body) {
      if (body.schoolId) {
        const school = await this.schoolsService.findById(body.schoolId);
        data.schoolName = school?.name ?? null;
      } else {
        data.schoolId = null;
        data.schoolName = null;
      }
    }
    return this.teachersService.updateProfile(id, data);
  }

  @Delete(":id")
  @Roles("admin")
  remove(@Param("id") id: string) {
    return this.teachersService.remove(id);
  }
}
