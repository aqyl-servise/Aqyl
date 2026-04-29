import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { AuthModule } from "./modules/auth/auth.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { ExportsModule } from "./modules/exports/exports.module";
import { GeneratorsModule } from "./modules/generators/generators.module";
import { School } from "./modules/schools/entities/school.entity";
import { Classroom } from "./modules/schools/entities/classroom.entity";
import { GeneratedDocument } from "./modules/schools/entities/generated-document.entity";
import { Student } from "./modules/schools/entities/student.entity";
import { Submission } from "./modules/schools/entities/submission.entity";
import { Schedule } from "./modules/schools/entities/schedule.entity";
import { Assignment } from "./modules/schools/entities/assignment.entity";
import { TaskSubmission } from "./modules/schools/entities/task-submission.entity";
import { OpenLesson } from "./modules/schools/entities/open-lesson.entity";
import { Protocol } from "./modules/schools/entities/protocol.entity";
import { ClassHour } from "./modules/schools/entities/class-hour.entity";
import { UploadedFile } from "./modules/schools/entities/uploaded-file.entity";
import { FileFolder } from "./modules/schools/entities/file-folder.entity";
import { Teacher } from "./modules/teachers/entities/teacher.entity";
import { TeachersModule } from "./modules/teachers/teachers.module";
import { UsersModule } from "./modules/users/users.module";
import { ScheduleModule } from "./modules/schedule/schedule.module";
import { AssignmentsModule } from "./modules/assignments/assignments.module";
import { LessonsModule } from "./modules/lessons/lessons.module";
import { ProtocolsModule } from "./modules/protocols/protocols.module";
import { ClassHoursModule } from "./modules/class-hours/class-hours.module";
import { FilesModule } from "./modules/files/files.module";
import { AdminModule } from "./modules/admin/admin.module";
import { GiftedModule } from "./modules/gifted/gifted.module";
import { StudentsModule } from "./modules/students/students.module";
import { GiftedPlan } from "./modules/schools/entities/gifted-plan.entity";
import { GiftedStudent } from "./modules/schools/entities/gifted-student.entity";
import { GiftedTeacherAssignment } from "./modules/schools/entities/gifted-teacher-assignment.entity";
import { GiftedMaterial } from "./modules/schools/entities/gifted-material.entity";
import { GiftedAchievement } from "./modules/schools/entities/gifted-achievement.entity";
import { StudentTransfer } from "./modules/schools/entities/student-transfer.entity";
import { PasswordReset } from "./modules/schools/entities/password-reset.entity";
import { ClassroomsModule } from "./modules/classrooms/classrooms.module";
import { StudentPortalModule } from "./modules/student-portal/student-portal.module";
import { AiModule } from "./modules/ai/ai.module";
import { AttestationModule } from "./modules/attestation/attestation.module";
import { TeacherAttestation } from "./modules/schools/entities/teacher-attestation.entity";
import { FinalAttestationModule } from "./modules/final-attestation/final-attestation.module";
import { FinalAttestationStudent } from "./modules/schools/entities/final-attestation-student.entity";
import { KtpModule } from "./modules/ktp/ktp.module";
import { KtpReview } from "./modules/schools/entities/ktp-review.entity";
import { SchoolInfoModule } from "./modules/school-info/school-info.module";
import { SchoolInfo } from "./modules/schools/entities/school-info.entity";
import { SeedService } from "./seed.service";
import { SchoolsModule } from "./modules/schools/schools.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: [".env", ".env.local"] }),
    ThrottlerModule.forRoot([
      { name: "short", ttl: 1000, limit: 10 },
      { name: "medium", ttl: 60_000, limit: 100 },
    ]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: "postgres",
        url: cfg.get<string>("DATABASE_URL"),
        autoLoadEntities: true,
        // synchronize: true ensures new entities/columns are applied on every deploy.
        // Safe as long as only additive schema changes (new tables, nullable columns) are made.
        synchronize: true,
        entities: [
          School, Teacher, Classroom, Student, Submission, GeneratedDocument,
          Schedule, Assignment, TaskSubmission, OpenLesson, Protocol, ClassHour, UploadedFile,
          GiftedPlan, GiftedStudent, GiftedTeacherAssignment, GiftedMaterial, GiftedAchievement,
          StudentTransfer, PasswordReset, FileFolder, TeacherAttestation, FinalAttestationStudent, KtpReview, SchoolInfo,
        ],
      }),
    }),
    TypeOrmModule.forFeature([
      School, Teacher, Classroom, Student, Submission, GeneratedDocument,
      Schedule, Assignment, TaskSubmission, OpenLesson, Protocol, ClassHour, UploadedFile,
      GiftedPlan, GiftedStudent, GiftedTeacherAssignment, GiftedMaterial, GiftedAchievement,
      StudentTransfer, PasswordReset, FileFolder, TeacherAttestation, FinalAttestationStudent, KtpReview, SchoolInfo,
    ]),
    TeachersModule,
    AuthModule,
    DashboardModule,
    GeneratorsModule,
    AnalyticsModule,
    ExportsModule,
    UsersModule,
    ScheduleModule,
    AssignmentsModule,
    LessonsModule,
    ProtocolsModule,
    ClassHoursModule,
    FilesModule,
    AdminModule,
    GiftedModule,
    StudentsModule,
    ClassroomsModule,
    StudentPortalModule,
    AiModule,
    AttestationModule,
    FinalAttestationModule,
    KtpModule,
    SchoolInfoModule,
    SchoolsModule,
  ],
  providers: [
    SeedService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
