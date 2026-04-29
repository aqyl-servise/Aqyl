import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { SchoolsService } from "./schools.service";

@Controller("schools")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
export class SchoolsController {
  constructor(private readonly service: SchoolsService) {}

  @Get()
  findAll() {
    return this.service.findAllWithStats();
  }

  @Post()
  create(@Body() body: { name: string; city?: string; region?: string }) {
    return this.service.createSchool(body);
  }

  @Patch(":id/activate")
  activate(@Param("id") id: string) {
    return this.service.activate(id);
  }

  @Patch(":id/deactivate")
  deactivate(@Param("id") id: string) {
    return this.service.deactivate(id);
  }
}
