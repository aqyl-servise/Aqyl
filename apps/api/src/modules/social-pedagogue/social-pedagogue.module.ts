import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NutritionStudent } from "../schools/entities/nutrition-student.entity";
import { NutritionOrder } from "../schools/entities/nutrition-order.entity";
import { SpecialAttentionStudent } from "../schools/entities/special-attention-student.entity";
import { SocialPedagogueController } from "./social-pedagogue.controller";
import { SocialPedagogueService } from "./social-pedagogue.service";

@Module({
  imports: [TypeOrmModule.forFeature([NutritionStudent, NutritionOrder, SpecialAttentionStudent])],
  controllers: [SocialPedagogueController],
  providers: [SocialPedagogueService],
  exports: [SocialPedagogueService],
})
export class SocialPedagogueModule {}
