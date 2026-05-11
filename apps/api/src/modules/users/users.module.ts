import { Module } from "@nestjs/common";
import { TeachersModule } from "../teachers/teachers.module";
import { SchoolsModule } from "../schools/schools.module";
import { UsersController } from "./users.controller";

@Module({
  imports: [TeachersModule, SchoolsModule],
  controllers: [UsersController],
})
export class UsersModule {}
