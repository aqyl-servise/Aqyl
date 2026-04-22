import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Assignment } from "../schools/entities/assignment.entity";
import { TaskSubmission } from "../schools/entities/task-submission.entity";
import { AssignmentsService } from "./assignments.service";
import { AssignmentsController } from "./assignments.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Assignment, TaskSubmission])],
  providers: [AssignmentsService],
  controllers: [AssignmentsController],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
