import { Controller, Get, UseGuards } from "@nestjs/common";
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
    return this.service.findAll();
  }
}
