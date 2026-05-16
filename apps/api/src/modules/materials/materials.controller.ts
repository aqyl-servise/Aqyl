import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Req, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { join } from "path";
import { existsSync } from "fs";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { MaterialsService } from "./materials.service";

interface ReqUser { user: { id: string; role: string; schoolId?: string } }

@Controller("materials")
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaterialsController {
  constructor(private readonly svc: MaterialsService) {}

  @Post("presentations")
  @Roles("teacher", "class_teacher", "admin", "principal", "vice_principal", "vice_principal_academic")
  generatePresentation(
    @Body() body: { prompt: string; slideCount?: number; attachedText?: string },
    @Req() req: ReqUser,
  ) {
    return this.svc.generatePresentation(
      req.user.id,
      req.user.schoolId ?? "",
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
  async downloadPresentation(@Param("id") id: string, @Res() res: Response) {
    const pres = await this.svc.getPresentation(id);
    if (!pres.fileUrl) throw new NotFoundException("File not generated yet");
    const filePath = join(process.cwd(), pres.fileUrl);
    if (!existsSync(filePath)) throw new NotFoundException("File not found");
    res.download(filePath, `${pres.title}.pptx`);
  }

  @Post("illustrations")
  @Roles("teacher", "class_teacher", "admin", "principal", "vice_principal", "vice_principal_academic")
  generateIllustration(
    @Body() body: { prompt: string; attachedText?: string },
    @Req() req: ReqUser,
  ) {
    return this.svc.generateIllustration(
      req.user.id,
      req.user.schoolId ?? "",
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
  async downloadIllustration(@Param("id") id: string, @Res() res: Response) {
    const illus = await this.svc.getIllustration(id);
    if (!illus.imageUrl) throw new NotFoundException("File not generated yet");
    const filePath = join(process.cwd(), illus.imageUrl);
    if (!existsSync(filePath)) throw new NotFoundException("File not found");
    res.download(filePath, `${illus.title}.svg`);
  }
}
