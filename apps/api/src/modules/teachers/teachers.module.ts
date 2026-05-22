import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Teacher } from "./entities/teacher.entity";
import { TeachersService } from "./teachers.service";
import { TeachersController } from "./teachers.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Teacher])],
  providers: [TeachersService],
  controllers: [TeachersController],
  exports: [TeachersService, TypeOrmModule],
})
export class TeachersModule {}
