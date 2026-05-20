import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SchoolTokenPackage } from "./entities/school-token-package.entity";
import { TokenTransaction } from "./entities/token-transaction.entity";
import { TokenService } from "./token.service";
import { TokensController } from "./tokens.controller";

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([SchoolTokenPackage, TokenTransaction])],
  providers: [TokenService],
  controllers: [TokensController],
  exports: [TokenService],
})
export class TokensModule {}
