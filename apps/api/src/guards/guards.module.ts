import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SecurityAuditLog } from "../modules/schools/entities/security-audit-log.entity";
import { SchoolIsolationGuard } from "./school-isolation.guard";

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([SecurityAuditLog])],
  providers: [SchoolIsolationGuard],
  exports: [SchoolIsolationGuard],
})
export class GuardsModule {}
