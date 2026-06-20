import { Body, Controller, Delete, ForbiddenException, Get, NotFoundException, Param, Post, Req, Res, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Response } from "express";
import { join } from "path";
import { existsSync } from "fs";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import { MaterialsService } from "./materials.service";
import { ADMIN_ROLES, ALL_TEACHER_ROLES, isAdminRole } from "../../common/roles.constants";

interface ReqUser { user: { id: string; role: string; schoolId?: string } }
type GeneratedMaterial = { teacherId: string; schoolId: string; title: string };
const MATERIAL_ROLES = [...ALL_TEACHER_ROLES, ...ADMIN_ROLES] as const;

@Controller("materials")
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
export class MaterialsController {
  constructor(private readonly svc: MaterialsService) {}

  @Post("presentations")
  @Throttle({ medium: { limit: 10, ttl: 60_000 } })
  @Roles("teacher", "class_teacher", "admin", "principal", "vice_principal", "vice_principal_academic")
  generatePresentation(
    @Body() body: { prompt: string; slideCount?: number; attachedText?: string },
    @Req() req: ReqUser,
  ) {
    return this.svc.generatePresentation(
      req.user.id,
      req.user.schoolId ?? "",
      req.user.role,
      body.prompt,
      body.slideCount ?? 10,
      body.attachedText,
    );
  }

  @Get("presentations")
  @Roles("teacher", "class_teacher", "admin", "principal", "vice_principal", "vice_principal_academic")
  getMyPresentations(@Req() req: ReqUser) {
    return this.svc.getMyPresentations(req.user.id);
  }

  @Delete("presentations/:id")
  @Roles("teacher", "class_teacher")
  deletePresentation(@Param("id") id: string, @Req() req: ReqUser) {
    return this.svc.deletePresentation(id, req.user.id);
  }

  @Get("presentations/:id/download")
  @Roles(...MATERIAL_ROLES)
  async downloadPresentation(@Param("id") id: string, @Req() req: ReqUser, @Res() res: Response) {
    const pres = await this.svc.getPresentation(id);
    this.assertMaterialAccess(pres, req.user);
    if (!pres.fileUrl) throw new NotFoundException("File not generated yet");
    const filePath = join(process.cwd(), pres.fileUrl);
    if (!existsSync(filePath)) throw new NotFoundException("File not found");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store");
    res.download(filePath, `${pres.title}.pptx`);
  }

  @Post("illustrations")
  @Throttle({ medium: { limit: 10, ttl: 60_000 } })
  @Roles("teacher", "class_teacher", "admin", "principal", "vice_principal", "vice_principal_academic")
  generateIllustration(
    @Body() body: { prompt: string; attachedText?: string },
    @Req() req: ReqUser,
  ) {
    return this.svc.generateIllustration(
      req.user.id,
      req.user.schoolId ?? "",
      req.user.role,
      body.prompt,
      body.attachedText,
    );
  }

  @Get("illustrations")
  @Roles("teacher", "class_teacher", "admin", "principal", "vice_principal", "vice_principal_academic")
  getMyIllustrations(@Req() req: ReqUser) {
    return this.svc.getMyIllustrations(req.user.id);
  }

  @Delete("illustrations/:id")
  @Roles("teacher", "class_teacher")
  deleteIllustration(@Param("id") id: string, @Req() req: ReqUser) {
    return this.svc.deleteIllustration(id, req.user.id);
  }

  @Get("illustrations/:id/download")
  @Roles(...MATERIAL_ROLES)
  async downloadIllustration(@Param("id") id: string, @Req() req: ReqUser, @Res() res: Response) {
    const illus = await this.svc.getIllustration(id);
    this.assertMaterialAccess(illus, req.user);
    if (!illus.imageUrl) throw new NotFoundException("File not generated yet");
    const filePath = join(process.cwd(), illus.imageUrl);
    if (!existsSync(filePath)) throw new NotFoundException("File not found");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
    res.setHeader("Cache-Control", "private, no-store");
    res.download(filePath, `${illus.title}.svg`);
  }

  private assertMaterialAccess(material: GeneratedMaterial, user: ReqUser["user"]) {
    if (isAdminRole(user.role) && !user.schoolId) return;
    if (material.schoolId && material.schoolId !== user.schoolId) {
      throw new ForbiddenException("Access denied");
    }
    if (!isAdminRole(user.role) && material.teacherId !== user.id) {
      throw new ForbiddenException("Access denied");
    }
  }
}
