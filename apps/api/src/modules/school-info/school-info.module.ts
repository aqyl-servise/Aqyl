import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SchoolInfo } from "../schools/entities/school-info.entity";
import { SchoolInfoService } from "./school-info.service";
import { SchoolInfoController } from "./school-info.controller";

@Module({
  imports: [TypeOrmModule.forFeature([SchoolInfo])],
  providers: [SchoolInfoService],
  controllers: [SchoolInfoController],
})
export class SchoolInfoModule {}
