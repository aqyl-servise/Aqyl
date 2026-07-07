import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { QuestionnairesService } from "./questionnaires.service";
import { UpdateQuestionnaireDto } from "./dto/update-questionnaire.dto";

interface ReqUser { user: { id: string; role: string; schoolId?: string } }

@Controller("questionnaires")
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuestionnairesController {
  constructor(private readonly service: QuestionnairesService) {}

  @Get()
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic", "vice_principal_education", "psychologist")
  getAll(@Req() req: ReqUser) {
    return this.service.getAll(req.user.schoolId ?? "");
  }

  @Get(":id")
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic", "vice_principal_education", "psychologist")
  getOne(@Param("id") id: string, @Req() req: ReqUser) {
    return this.service.getOne(id, req.user.schoolId);
  }

  @Post()
  @Roles("admin", "principal", "vice_principal_academic", "vice_principal_education", "psychologist")
  create(@Req() req: ReqUser, @Body() body: { title: string; content: string; description?: string; fileUrl?: string }) {
    return this.service.create({ ...body, schoolId: req.user.schoolId, createdBy: req.user.id });
  }

  @Put(":id")
  @Roles("admin", "principal", "vice_principal_academic", "vice_principal_education", "psychologist")
  update(@Param("id") id: string, @Body() dto: UpdateQuestionnaireDto, @Req() req: ReqUser) {
    return this.service.update(id, dto as never, req.user.schoolId);
  }

  @Delete(":id")
  @Roles("admin", "principal", "vice_principal_academic", "vice_principal_education", "psychologist")
  remove(@Param("id") id: string, @Req() req: ReqUser) {
    return this.service.remove(id, req.user.schoolId);
  }

  @Post(":id/assign")
  @Roles("admin", "principal", "vice_principal_academic", "vice_principal_education", "psychologist")
  assign(@Param("id") id: string, @Body() body: { classroomIds: string[] }, @Req() req: ReqUser) {
    return this.service.assign(id, body.classroomIds, req.user.schoolId);
  }

  @Get(":id/responses")
  @Roles("admin", "principal", "vice_principal_academic", "vice_principal_education", "psychologist")
  getResponses(@Param("id") id: string, @Req() req: ReqUser) {
    return this.service.getResponses(id, req.user.schoolId);
  }

  @Post(":id/analyze")
  @Roles("admin", "principal", "vice_principal_academic", "vice_principal_education", "psychologist")
  analyze(@Param("id") id: string, @Req() req: ReqUser) {
    return this.service.analyzeResponses(id, req.user.schoolId);
  }

  @Post("generate")
  @Roles("admin", "principal", "vice_principal_academic", "vice_principal_education", "psychologist")
  generate(
    @Req() req: ReqUser,
    @Body() body: { topic: string; grade: number; questionCount: number; questionType: string },
  ) {
    return this.service.generateAi(req.user.schoolId ?? "", req.user.id, body);
  }
}
