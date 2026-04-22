import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { ProtocolsService } from "./protocols.service";
import { ProtocolType } from "../schools/entities/protocol.entity";

interface ReqUser { user: { id: string } }

@Controller("protocols")
@UseGuards(JwtAuthGuard)
export class ProtocolsController {
  constructor(private readonly service: ProtocolsService) {}

  @Get()
  getAll() {
    return this.service.getAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles("admin", "principal", "vice_principal")
  create(
    @Req() req: ReqUser,
    @Body() body: { title: string; type?: ProtocolType; date?: string; content?: string },
  ) {
    return this.service.create({
      title: body.title,
      type: body.type ?? "pedagogical-council",
      date: body.date ? new Date(body.date) : undefined,
      content: body.content,
      createdBy: { id: req.user.id } as never,
    });
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles("admin", "principal", "vice_principal")
  update(@Param("id") id: string, @Body() body: Partial<{ title: string; content: string; fileUrls: string[] }>) {
    return this.service.update(id, body as never);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles("admin", "principal")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
