import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Protocol } from "../schools/entities/protocol.entity";
import { ProtocolsService } from "./protocols.service";
import { ProtocolsController } from "./protocols.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Protocol])],
  providers: [ProtocolsService],
  controllers: [ProtocolsController],
})
export class ProtocolsModule {}
