import { Module } from "@nestjs/common";
import { AiController } from "./ai.controller";
import { AiChatService } from "./ai.service";

@Module({
  controllers: [AiController],
  providers: [AiChatService],
})
export class AiModule {}
