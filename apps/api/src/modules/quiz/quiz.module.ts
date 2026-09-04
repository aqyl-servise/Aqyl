import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Quiz } from "./entities/quiz.entity";
import { QuizQuestion } from "./entities/quiz-question.entity";
import { QuizService } from "./quiz.service";
import { QuizGeneratorService } from "./quiz-generator.service";
import { QuizController } from "./quiz.controller";
import { AiClientModule } from "../../services/ai-client.module";
import { SessionsModule } from "../realtime/realtime.module";

/**
 * Квизы (ТЗ 3.0, слой 3 — контент). Слои сессий и живой игры добавятся
 * отдельными модулями: этот отвечает только за создание и правку вопросов и
 * ни от чего реального времени не зависит.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Quiz, QuizQuestion]), AiClientModule, SessionsModule],
  controllers: [QuizController],
  providers: [QuizService, QuizGeneratorService],
  exports: [QuizService],
})
export class QuizModule {}
