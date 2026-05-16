import { Module } from "@nestjs/common";
import { AiController } from "./ai.controller";
import { AiChatService } from "./ai.service";
import { AiUsageModule } from "../ai-usage/ai-usage.module";
import { AiClientModule } from "../../services/ai-client.module";

@Module({
  imports: [AiUsageModule, AiClientModule],
  controllers: [AiController],
  providers: [AiChatService],
  exports: [AiChatService],
})
export class AiModule {}
