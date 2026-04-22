import { Module } from "@nestjs/common";
import { TeachersModule } from "../teachers/teachers.module";
import { UsersController } from "./users.controller";

@Module({
  imports: [TeachersModule],
  controllers: [UsersController],
})
export class UsersModule {}
