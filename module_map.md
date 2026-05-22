# Module Map — Aqyl Teacher Platform

> Сгенерировано: 2026-05-22  
> Проект: `apps/api` (NestJS) + `apps/web` (Next.js 15)

---

## 1. Модули бэкенда (`apps/api/src/modules/`)

### AUTH
**Entities:** `PasswordReset`, `School` (из schools)  
**Module imports:** `TeachersModule`, `MailModule`, `TypeOrmModule([PasswordReset, School])`, `JwtModule`

| Метод | Путь | @Roles | Описание |
|-------|------|--------|----------|
| POST | `/auth/login` | — | Вход (публичный) |
| POST | `/auth/register` | — | Регистрация (публичный) |
| POST | `/auth/forgot-password` | — | Запрос сброса пароля |
| POST | `/auth/reset-password` | — | Установка нового пароля |
| GET | `/auth/me` | JwtAuthGuard | Текущий пользователь |
| PATCH | `/auth/profile` | JwtAuthGuard | Обновить профиль |

---

### SCHOOLS
**Entities:** `School`, `Teacher`  
**Module imports:** `TypeOrmModule([School, Teacher])`

| Метод | Путь | @Roles | Описание |
|-------|------|--------|----------|
| GET | `/schools` | admin, principal, vice_principal, vice_principal_academic | Список всех школ |
| POST | `/schools` | admin | Создать школу |
| PATCH | `/schools/:id/activate` | admin | Активировать школу |
| PATCH | `/schools/:id/deactivate` | admin | Деактивировать школу |

---

### TEACHERS
**Entities:** `Teacher`  
**Module imports:** TypeOrmModule([Teacher])  
**Контроллер:** ❌ отсутствует (только сервис)  
**Exports:** `TeachersService` → используется в AuthModule

Поля сущности: `id, fullName, email, passwordHash, preferredLanguage, role, status, schoolId, schoolName, phone, subject, experience, category, university, courses, achievements, avatarUrl, isClassTeacher, managedClassroomId, managedClassroomName, createdAt`

---

### USERS
**Entities:** `Teacher`  
**Module imports:** `TypeOrmModule([Teacher])`

| Метод | Путь | @Roles | Описание |
|-------|------|--------|----------|
| GET | `/users` | admin, principal | Все пользователи |
| GET | `/users/teachers` | admin, principal, vice_principal, vice_principal_academic | Список учителей |
| GET | `/users/by-role/:role` | admin, principal | По роли |
| GET | `/users/:id` | admin, principal, vice_principal, vice_principal_academic | Деталь |
| POST | `/users` | admin | Создать пользователя |
| PATCH | `/users/:id` | admin, principal, vice_principal, vice_principal_academic | Обновить |
| DELETE | `/users/:id` | admin | Удалить |

---

### ADMIN
**Module imports:** `TypeOrmModule([Teacher, School])`

| Метод | Путь | @Roles | Описание |
|-------|------|--------|----------|
| GET | `/admin/overview` | admin, principal, vice_principal, vice_principal_academic, vice_principal_education, psychologist, social_pedagogue | Обзор |
| GET | `/admin/analytics` | (то же) | Аналитика |
| GET | `/admin/teachers` | (то же) | Учителя |
| GET | `/admin/registrations` | admin, principal | Заявки на регистрацию |
| PATCH | `/admin/registrations/:id/approve` | admin, principal | Одобрить заявку |
| PATCH | `/admin/registrations/:id/reject` | admin, principal | Отклонить заявку |
| PATCH | `/admin/users/:id/deactivate` | admin | Деактивировать |
| PATCH | `/admin/users/:id/activate` | admin | Активировать |
| DELETE | `/admin/users/:id` | admin | Удалить |
| PATCH | `/admin/users/:id/password` | admin | Сменить пароль |
| GET | `/admin/security-audit` | admin | Аудит безопасности |

---

### CLASSROOMS
**Entities:** `Classroom`, `Student`, `SubjectTeacherAssignment`  
**Roles на классе:** admin, principal, vice_principal, vice_principal_academic + teacher, class_teacher (read)

| Метод | Путь | @Roles | Описание |
|-------|------|--------|----------|
| GET | `/classrooms` | (класс) | Список классов |
| GET | `/classrooms/class-teachers` | (класс) | Классные руководители |
| POST | `/classrooms` | admin, principal, vice_principal, vice_principal_academic | Создать класс |
| PATCH | `/classrooms/:id` | admin, principal, vice_principal, vice_principal_academic | Обновить |
| DELETE | `/classrooms/:id` | admin, principal | Удалить |
| POST | `/classrooms/:id/bulk-transfer` | (класс) | Массовый перевод студентов |
| GET | `/classrooms/:id/full-info` | (класс) | Полная информация |
| GET | `/classrooms/:id/subject-teachers` | (класс) | Учителя предметники |
| POST | `/classrooms/:id/subject-teachers` | (класс) | Назначить |
| DELETE | `/classrooms/:id/subject-teachers/:id` | (класс) | Удалить назначение |

---

### STUDENTS
**Entities:** `Student`, `Classroom`, `StudentTransfer`  
**Roles на классе:** admin, principal, vice_principal, vice_principal_academic, vice_principal_education, psychologist, social_pedagogue, teacher, class_teacher

| Метод | Путь | @Roles | Описание |
|-------|------|--------|----------|
| GET | `/students` | (класс) | Список студентов |
| GET | `/students/classrooms` | (класс) | Классы |
| GET | `/students/class-teachers` | (класс) | Кл. руководители |
| POST | `/students` | admin, principal, vice_principal, vice_principal_academic, teacher | Создать |
| PATCH | `/students/:id` | admin, principal, vice_principal, vice_principal_academic, teacher | Обновить |
| DELETE | `/students/:id` | admin, principal | Удалить |
| POST | `/students/:id/transfer` | admin, principal, vice_principal, vice_principal_academic, teacher | Перевести |
| GET | `/students/:id/transfers` | admin, principal, vice_principal, vice_principal_academic | История переводов |

---

### LESSONS
**Entities:** `OpenLesson`, `LessonAnalysis`  
**Module imports:** `TypeOrmModule([OpenLesson, LessonAnalysis])`, `NotificationsModule`

| Метод | Путь | @Roles | Описание |
|-------|------|--------|----------|
| GET | `/lessons` | ⚠️ — | Мои уроки |
| GET | `/lessons/all` | admin, principal, vice_principal, vice_principal_academic, vice_principal_education | Все уроки |
| GET | `/lessons/:id` | admin, principal, vice_principal, vice_principal_academic, vice_principal_education, teacher, class_teacher, psychologist | Деталь |
| POST | `/lessons` | teacher, admin, class_teacher, principal, vice_principal, vice_principal_academic | Создать урок |
| PATCH | `/lessons/:id` | admin, principal, vice_principal, vice_principal_academic, teacher, class_teacher | Обновить |
| DELETE | `/lessons/:id` | teacher, admin, class_teacher, principal, vice_principal, vice_principal_academic | Удалить |
| GET | `/lessons/:id/analysis` | ⚠️ — | Получить анализ |
| POST | `/lessons/:id/analysis` | admin, principal, vice_principal, vice_principal_academic | Сохранить анализ |
| GET | `/lessons/:id/analysis/pdf` | ⚠️ — | Скачать PDF анализа |

---

### ASSIGNMENTS
**Entities:** `Assignment`, `TaskSubmission`  
**Module imports:** `TypeOrmModule([Assignment, TaskSubmission])`

| Метод | Путь | @Roles | Описание |
|-------|------|--------|----------|
| GET | `/assignments` | ⚠️ — | Мои задания |
| GET | `/assignments/all` | admin, principal, vice_principal, vice_principal_academic | Все задания |
| GET | `/assignments/classroom/:id` | ⚠️ — | Задания класса |
| GET | `/assignments/:id` | ⚠️ — | Деталь |
| GET | `/assignments/:id/submissions` | ⚠️ — | Сдачи задания |
| POST | `/assignments` | teacher, admin | Создать |
| PATCH | `/assignments/:id/publish` | teacher, admin | Опубликовать |
| PATCH | `/assignments/:id/close` | teacher, admin | Закрыть |
| PATCH | `/assignments/:id` | teacher, admin | Обновить |
| DELETE | `/assignments/:id` | teacher, admin | Удалить |
| POST | `/assignments/:id/submit` | ⚠️ — | Сдать работу |
| PATCH | `/assignments/submissions/:id/grade` | teacher, admin | Оценить |

---

### SCHEDULE
**Entities:** `Schedule`

| Метод | Путь | @Roles | Описание |
|-------|------|--------|----------|
| GET | `/schedule` | ⚠️ — | Моё расписание |
| GET | `/schedule/all` | admin, principal, vice_principal, vice_principal_academic | Всё расписание |
| GET | `/schedule/classroom/:id` | ⚠️ — | Расписание класса |
| POST | `/schedule` | admin, teacher | Создать запись |
| DELETE | `/schedule/:id` | admin, teacher | Удалить |
| GET | `/schedule/admin` | admin, principal, vice_principal, vice_principal_academic | Админ-расписание |
| POST | `/schedule/admin` | admin, principal, vice_principal, vice_principal_academic | Создать/обновить |
| DELETE | `/schedule/admin/:id` | admin, principal, vice_principal, vice_principal_academic | Удалить |
| GET | `/schedule/admin/versions` | admin, principal, vice_principal, vice_principal_academic | Версии |
| POST | `/schedule/admin/versions` | admin, principal, vice_principal, vice_principal_academic | Создать версию |
| GET | `/schedule/admin/export` | admin, principal, vice_principal, vice_principal_academic | Экспорт |

---

### CLASS-HOURS
**Entities:** `ClassHour`, `ClassHourHistory`  
**Module imports:** `TypeOrmModule([ClassHour, ClassHourHistory])`

| Метод | Путь | @Roles | Описание |
|-------|------|--------|----------|
| GET | `/class-hours` | JwtAuthGuard | Мои классные часы |
| GET | `/class-hours/all` | admin, principal, vice_principal, vice_principal_academic | Все |
| GET | `/class-hours/schedule` | JwtAuthGuard | График |
| GET | `/class-hours/:id/history` | JwtAuthGuard | История |
| POST | `/class-hours` | class_teacher, admin (assertCanWrite) | Создать |
| PATCH | `/class-hours/:id` | class_teacher, admin (assertCanWrite) | Обновить |
| DELETE | `/class-hours/:id` | class_teacher, admin (assertCanWrite) | Удалить |

---

### PROTOCOLS
**Entities:** `Protocol`

| Метод | Путь | @Roles | Описание |
|-------|------|--------|----------|
| GET | `/protocols` | admin, principal, vice_principal, vice_principal_academic, vice_principal_education, teacher, class_teacher, psychologist, social_pedagogue | Список |
| GET | `/protocols/:id` | (то же) | Деталь |
| POST | `/protocols` | admin, principal, vice_principal, vice_principal_academic, vice_principal_education | Создать |
| PATCH | `/protocols/:id` | admin, principal, vice_principal, vice_principal_academic, vice_principal_education | Обновить |
| DELETE | `/protocols/:id` | admin, principal | Удалить |

---

### KTP
**Entities:** `KtpReview`, `UploadedFile`

| Метод | Путь | @Roles | Описание |
|-------|------|--------|----------|
| GET | `/ktp/files` | admin, principal, vice_principal, vice_principal_academic | Файлы КТП всех учителей |
| GET | `/ktp/my-reviews` | teacher, class_teacher | Мои рецензии |
| PATCH | `/ktp/reviews/:fileId` | admin, principal, vice_principal, vice_principal_academic | Написать рецензию |

---

### SCHOOL-INFO
**Entities:** `SchoolInfo`

| Метод | Путь | @Roles | Описание |
|-------|------|--------|----------|
| GET | `/school-info` | admin, principal, vice_principal, vice_principal_academic | Данные школы |
| PATCH | `/school-info` | admin, principal | Обновить |

---

### SOR-SOCH
**Entities:** `SorSochDocument`  
**Roles на классе (ALLOWED_ROLES):** admin, principal, vice_principal, vice_principal_academic, teacher, class_teacher

| Метод | Путь | @Roles | Описание |
|-------|------|--------|----------|
| GET | `/sor-soch` | ALLOWED_ROLES | Список |
| GET | `/sor-soch/:id` | ALLOWED_ROLES | Деталь |
| POST | `/sor-soch` | ALLOWED_ROLES | Создать |
| PATCH | `/sor-soch/:id` | ALLOWED_ROLES | Обновить |
| DELETE | `/sor-soch/:id` | ALLOWED_ROLES | Удалить |

---

### ATTESTATION
**Entities:** `TeacherAttestation`  
**Roles на классе:** admin, principal, vice_principal, vice_principal_academic

| Метод | Путь | @Roles | Описание |
|-------|------|--------|----------|
| GET | `/attestation/my` | teacher, class_teacher | Моя аттестация |
| GET | `/attestation` | (класс) | Все аттестации |
| GET | `/attestation/:teacherId` | (класс) | Аттестация учителя |
| PATCH | `/attestation/:teacherId` | (класс) | Обновить |

---

### FINAL-ATTESTATION
**Entities:** `FinalAttestationStudent`  
**Roles на классе:** admin, principal, vice_principal, vice_principal_academic

| Метод | Путь | @Roles | Описание |
|-------|------|--------|----------|
| GET | `/final-attestation/students` | admin, principal, vice_principal, vice_principal_academic, teacher, class_teacher | Студенты |
| POST | `/final-attestation/students` | (класс) | Добавить |
| PATCH | `/final-attestation/students/:id` | (класс) | Обновить |
| DELETE | `/final-attestation/students/:id` | (класс) | Удалить |

---

### QUESTIONNAIRES
**Entities:** `Questionnaire`, `QuestionnaireResponse`

| Метод | Путь | @Roles | Описание |
|-------|------|--------|----------|
| GET | `/questionnaires` | admin, principal, vice_principal, vice_principal_academic, vice_principal_education, psychologist | Список |
| GET | `/questionnaires/:id` | (то же) | Деталь |
| POST | `/questionnaires` | admin, principal, vice_principal_academic, vice_principal_education, psychologist | Создать |
| PUT | `/questionnaires/:id` | (то же) | Обновить |
| DELETE | `/questionnaires/:id` | (то же) | Удалить |
| POST | `/questionnaires/:id/assign` | (то же) | Назначить |
| GET | `/questionnaires/:id/responses` | (то же) | Ответы |
| POST | `/questionnaires/:id/analyze` | (то же) | AI-анализ |
| POST | `/questionnaires/generate` | (то же) | AI-генерация |

---

### SOCIAL-PEDAGOGUE
**READ_ROLES:** admin, principal, vice_principal, vice_principal_academic, vice_principal_education, social_pedagogue  
**WRITE_ROLES:** admin, principal, vice_principal_education, social_pedagogue

| Метод | Путь | @Roles | Описание |
|-------|------|--------|----------|
| GET | `/social-pedagogue/nutrition/students` | READ_ROLES | Студенты на питании |
| POST | `/social-pedagogue/nutrition/students` | WRITE_ROLES | Добавить |
| DELETE | `/social-pedagogue/nutrition/students/:id` | WRITE_ROLES | Удалить |
| GET | `/social-pedagogue/nutrition/orders` | READ_ROLES | Заказы питания |
| POST | `/social-pedagogue/nutrition/orders` | WRITE_ROLES | Создать заказ |
| DELETE | `/social-pedagogue/nutrition/orders/:id` | WRITE_ROLES | Удалить |
| GET | `/social-pedagogue/nutrition/export` | READ_ROLES | Экспорт CSV |
| GET | `/social-pedagogue/special-attention` | READ_ROLES | Под особым контролем |
| POST | `/social-pedagogue/special-attention` | WRITE_ROLES | Добавить |
| DELETE | `/social-pedagogue/special-attention/:id` | WRITE_ROLES | Удалить |
| POST | `/social-pedagogue/special-attention/:id/documents` | WRITE_ROLES | Добавить документ |
| GET | `/social-pedagogue/special-attention/export` | READ_ROLES | Экспорт CSV |

---

### GIFTED
**Entities:** `GiftedPlan`, `GiftedStudent`, `GiftedTeacherAssignment`, `GiftedMaterial`, `GiftedAchievement`, `Teacher`, `Student`  
**Roles на классе:** admin, principal, vice_principal, vice_principal_academic, psychologist, teacher

| Метод | Путь | @Roles | Описание |
|-------|------|--------|----------|
| GET | `/gifted/plans` | (класс) | Планы работы |
| POST | `/gifted/plans` | admin, principal, vice_principal, vice_principal_academic | Создать план |
| DELETE | `/gifted/plans/:id` | admin, principal, vice_principal, vice_principal_academic | Удалить |
| GET | `/gifted/students` | (класс) | Одарённые студенты |
| POST | `/gifted/students` | admin, principal, vice_principal, vice_principal_academic | Отметить |
| DELETE | `/gifted/students/:id` | admin, principal, vice_principal, vice_principal_academic | Удалить |
| GET | `/gifted/all-students` | ⚠️ — | Поиск студентов |
| GET | `/gifted/teachers` | ⚠️ — | Список учителей |
| GET | `/gifted/teachers/:id/students` | ⚠️ — | Студенты учителя |
| POST | `/gifted/teacher-assignments` | admin, principal, vice_principal, vice_principal_academic | Назначить учителя |
| DELETE | `/gifted/teacher-assignments/:id` | admin, principal, vice_principal, vice_principal_academic | Удалить |
| GET | `/gifted/materials` | ⚠️ — | Материалы |
| POST | `/gifted/materials` | ⚠️ — | Добавить |
| DELETE | `/gifted/materials/:id` | ⚠️ — | Удалить |
| GET | `/gifted/student-card/:studentId` | (класс) | Карта студента |
| GET | `/gifted/my-students` | admin, principal, vice_principal, vice_principal_academic, teacher, class_teacher | Мои одарённые |
| POST | `/gifted/my-student` | (то же) | Добавить студента |
| DELETE | `/gifted/my-student/:id` | (то же) | Удалить |
| POST | `/gifted/achievements` | ⚠️ — | Добавить достижение |
| DELETE | `/gifted/achievements/:id` | ⚠️ — | Удалить |

---

### FL (Функциональная Грамотность)
**Entities:** `FLTask`, `FLAssignment`, `FLSubmission`, `FLResult`, `Student`, `Classroom`, `Teacher`  
**Module imports:** `TypeOrmModule([...])`, `AiModule`

| Метод | Путь | @Roles | Описание |
|-------|------|--------|----------|
| GET | `/fl/tasks` | admin, principal, vice_principal, vice_principal_academic, teacher, class_teacher | Банк задач |
| POST | `/fl/tasks` | (то же) | Создать задачу |
| PATCH | `/fl/tasks/:id` | (то же) | Обновить |
| DELETE | `/fl/tasks/:id` | (то же) | Удалить |
| GET | `/fl/assignments` | (то же) | Мои задания |
| POST | `/fl/assignments` | (то же) | Создать задание |
| PATCH | `/fl/assignments/:id` | (то же) | Обновить |
| PATCH | `/fl/assignments/:id/publish` | (то же) | Опубликовать |
| PATCH | `/fl/assignments/:id/close` | (то же) | Закрыть |
| GET | `/fl/assignments/:id/submissions` | (то же) | Сдачи |
| PATCH | `/fl/submissions/:id/grade` | (то же) | Оценить |
| GET | `/fl/analytics/school` | admin, principal, vice_principal, vice_principal_academic | Аналитика школы |
| GET | `/fl/analytics/class/:classroomId` | admin, principal, vice_principal, vice_principal_academic, teacher, class_teacher | Аналитика класса |
| GET | `/fl/analytics/student/:studentId` | (то же) | Аналитика студента |
| POST | `/fl/ai/generate-task` | admin, principal, vice_principal, vice_principal_academic, teacher, class_teacher | AI-генерация задачи |
| POST | `/fl/assignments/:id/submit` | student | Сдать ответы |
| GET | `/fl/student/assignments` | student | Мои задания (student) |
| GET | `/fl/student/assignments/:id` | student | Деталь задания |
| POST | `/fl/student/assignments/:id/start` | student | Начать задание |
| PATCH | `/fl/student/submissions/:id` | student | Обновить сдачу |

---

### RATING
**Entities:** `TeacherRating`, `TeacherViolation`, + 11 чужих сущностей (⚠️ см. проблемы)  
**Module imports:** `TypeOrmModule([12 entities])`, `NotificationsModule`

| Метод | Путь | @Roles | Описание |
|-------|------|--------|----------|
| POST | `/rating/calculate` | admin, principal, vice_principal, vice_principal_academic | Рассчитать рейтинг |
| GET | `/rating/school` | admin, principal, vice_principal, vice_principal_academic, vice_principal_education | Рейтинг школы |
| GET | `/rating/my` | teacher, class_teacher | Мой рейтинг |
| GET | `/rating/teacher/:teacherId` | admin, principal, vice_principal, vice_principal_academic | Рейтинг учителя |
| GET | `/rating/history/:teacherId` | admin, principal, vice_principal, vice_principal_academic | История |
| GET | `/rating/history/my` | teacher, class_teacher | Моя история |
| PATCH | `/rating/:id/adjust` | admin, principal, vice_principal, vice_principal_academic | Ручная корректировка |
| GET | `/rating/violations/my` | teacher, class_teacher | Мои нарушения |
| POST | `/rating/violations` | admin, principal, vice_principal, vice_principal_academic | Создать нарушение |
| GET | `/rating/violations/:teacherId` | admin, principal, vice_principal, vice_principal_academic, teacher, class_teacher | Нарушения учителя |
| DELETE | `/rating/violations/:id` | admin, principal, vice_principal, vice_principal_academic | Удалить нарушение |

---

### AI-USAGE
**Entities:** `AiUsageDaily`, `AiUsageAlert`, `Teacher` (⚠️ чужая entity)  
**Module imports:** `TypeOrmModule([AiUsageDaily, AiUsageAlert, Teacher])`

| Метод | Путь | @Roles | Описание |
|-------|------|--------|----------|
| GET | `/ai-usage/my` | teacher, class_teacher, admin, principal, vice_principal, vice_principal_academic | Моё использование |
| GET | `/ai-usage/summary` | admin, principal, vice_principal, vice_principal_academic | Сводка по школе |
| GET | `/ai-usage/by-teacher` | admin, principal, vice_principal, vice_principal_academic | По учителям |
| GET | `/ai-usage/chart` | admin, principal, vice_principal, vice_principal_academic | График |
| GET | `/ai-usage/most-active` | admin, principal, vice_principal, vice_principal_academic | Самые активные |

---

### ANALYTICS
**Entities:** —

| Метод | Путь | @Roles | Описание |
|-------|------|--------|----------|
| POST | `/analytics/upload` | ⚠️ — | Загрузить данные |
| GET | `/analytics/live-summary` | admin, principal, vice_principal, vice_principal_academic, teacher, class_teacher | Сводка live |
| GET | `/analytics/school` | admin, principal, vice_principal, vice_principal_academic, teacher | Аналитика школы |
| GET | `/analytics/classes` | admin, principal, vice_principal, vice_principal_academic, teacher | По классам |
| GET | `/analytics/students` | admin, principal, vice_principal, vice_principal_academic, teacher | По студентам |
| POST | `/analytics/ai-analyze` | admin, principal, vice_principal, vice_principal_academic | AI-анализ |

---

### MATERIALS
**Entities:** `GeneratedPresentation`, `GeneratedIllustration`  
**Module imports:** `AiClientModule`

| Метод | Путь | @Roles | Описание |
|-------|------|--------|----------|
| POST | `/materials/presentations` | teacher, class_teacher, admin, principal, vice_principal, vice_principal_academic | Генерировать презентацию |
| GET | `/materials/presentations` | (то же) | Мои презентации |
| DELETE | `/materials/presentations/:id` | teacher, class_teacher | Удалить |
| GET | `/materials/presentations/:id/download` | (то же) | Скачать |
| POST | `/materials/illustrations` | (то же) | Генерировать иллюстрацию |
| GET | `/materials/illustrations` | (то же) | Мои иллюстрации |
| DELETE | `/materials/illustrations/:id` | teacher, class_teacher | Удалить |
| GET | `/materials/illustrations/:id/download` | (то же) | Скачать |

---

### KMZH (КМЖ-Генератор)
**Entities:** `KmzhCache`, `KmzhCacheHit`, `KmzhStageCache`, `KmzhGenerationSession`, `KmzhSaved`

| Метод | Путь | @Roles | Описание |
|-------|------|--------|----------|
| POST | `/kmzh/generate` | teacher, class_teacher, principal, admin | Генерировать КМЖ |
| POST | `/kmzh/regenerate` | teacher, class_teacher, principal, admin | Перегенерировать этап |
| POST | `/kmzh/save` | teacher, class_teacher | Сохранить |
| GET | `/kmzh/saved` | teacher, class_teacher | Мои сохранённые |
| GET | `/kmzh/values/:month` | ⚠️ — | Значения Адал Азамат |

---

### MALIMET (Мәлімет/Сведения)
**Entities:** `MalimetDocument`

| Метод | Путь | @Roles | Описание |
|-------|------|--------|----------|
| GET | `/malimet/prefill` | class_teacher | Предзаполнение данных |
| POST | `/malimet/generate` | class_teacher | Генерировать PDF/DOCX |
| POST | `/malimet/save` | class_teacher | Сохранить |
| GET | `/malimet/list` | class_teacher, vice_principal, vice_principal_academic, principal, admin | Список документов |

---

### TOKENS
**Entities:** `Teacher` (косвенно)

| Метод | Путь | @Roles | Описание |
|-------|------|--------|----------|
| GET | `/tokens/status` | teacher, class_teacher, admin, principal, vice_principal, vice_principal_academic | Баланс токенов |
| GET | `/tokens/usage` | admin, principal, vice_principal, vice_principal_academic | Использование |
| POST | `/tokens/packages` | admin | Пополнить пакет |

---

### NOTIFICATIONS
**Entities:** `TeacherNotification`

| Метод | Путь | @Roles | Описание |
|-------|------|--------|----------|
| GET | `/notifications/my` | teacher, class_teacher | Мои уведомления |
| GET | `/notifications/my/count` | teacher, class_teacher | Счёт непрочитанных |
| PATCH | `/notifications/mark-all-read` | teacher, class_teacher | Отметить все прочитанными |
| PATCH | `/notifications/:id/read` | teacher, class_teacher | Отметить прочитанным |

---

### GENERATORS
**Module imports:** AI-клиент  
⚠️ Нет контроллера с @Roles

| Метод | Путь | @Roles | Описание |
|-------|------|--------|----------|
| POST | `/generators/lesson-plan` | ⚠️ — | Сгенерировать план урока |
| POST | `/generators/task-set` | ⚠️ — | Сгенерировать набор заданий |

---

### AI
⚠️ Нет @Roles ни на одном методе

| Метод | Путь | @Roles | Описание |
|-------|------|--------|----------|
| POST | `/ai/chat` | ⚠️ — | AI-чат |
| POST | `/ai/generate-assignment` | ⚠️ — | Генерировать задание |
| POST | `/ai/generate-lesson-plan` | ⚠️ — | Генерировать план урока |

---

### EXPORTS
⚠️ Нет @Roles

| Метод | Путь | @Roles | Описание |
|-------|------|--------|----------|
| POST | `/exports/pdf` | ⚠️ — | Генерировать PDF |

---

### FILES
⚠️ Нет @Roles ни на одном методе  
**Entities:** `UploadedFile`, `FileFolder`

| Метод | Путь | @Roles | Описание |
|-------|------|--------|----------|
| POST | `/files/upload` | ⚠️ — | Загрузить файл |
| POST | `/files/folder` | ⚠️ — | Создать папку |
| GET | `/files/folders` | ⚠️ — | Список папок |
| GET | `/files/folder/:id` | ⚠️ — | Содержимое папки |
| DELETE | `/files/folder/:id` | ⚠️ — | Удалить папку |
| GET | `/files/ksp-all` | ⚠️ — | КСП файлы всех |
| GET | `/files` | ⚠️ — | Список файлов |
| PATCH | `/files/file/:id` | ⚠️ — | Переименовать/закрепить |
| PATCH | `/files/folder/:id` | ⚠️ — | Переименовать папку |
| DELETE | `/files/file/:id` | ⚠️ — | Удалить файл |
| GET | `/files/:filename` | ⚠️ — | Скачать файл |

---

### DASHBOARD
⚠️ Нет @Roles

| Метод | Путь | @Roles | Описание |
|-------|------|--------|----------|
| GET | `/dashboard` | ⚠️ — | Панель управления |

---

### MAIL
**Нет контроллера** (только сервис).  
**Exports:** `MailService` → используется в `AuthModule`  
**Метод:** `sendPasswordReset(email, resetUrl, lang)` — поддерживает ru/kz/en

### STUDENT-PORTAL
Эндпоинты для роли `student` — расписание, задания, оценки, одноклассники.

---

## 2. Связи между модулями

```
AuthModule        ──→ TeachersModule      (TeachersService для updateProfile)
AuthModule        ──→ MailModule          (MailService для сброса пароля)
AuthModule        ──→ SchoolsModule       (TypeOrm: PasswordReset, School)

LessonsModule     ──→ NotificationsModule (createNotification при готовом анализе)
RatingModule      ──→ NotificationsModule (createNotification при нарушении)

FLModule          ──→ AiModule            (AI-генерация задач)
MaterialsModule   ──→ AiClientModule      (генерация презентаций, иллюстраций)
GeneratorsModule  ──→ AiModule            (генерация планов)

RatingModule      ──⚠️→ schools entities  (прямой @InjectRepository 12 чужих entity:
                                           Assignment, TaskSubmission, OpenLesson,
                                           GiftedTeacherAssignment, GiftedAchievement,
                                           UploadedFile, FLTask, FLAssignment,
                                           FLSubmission, Teacher + собственные 2)

AiUsageModule     ──⚠️→ teachers entity   (прямой @InjectRepository(Teacher)
                                           без импорта TeachersModule)

KmzhModule        ──→ KmzhCacheModule     (хранение/получение кэша)
```

---

## 3. Фронтенд страницы (`apps/web/`)

> Проект — SPA без Server-Side Routing. Единственная страница `app/page.tsx` рендерит `<AqylApp>`, который на основе `user.role` выбирает одно из четырёх приложений.

### Маршрутизация по ролям

| Роль | Компонент |
|------|-----------|
| teacher | `TeacherApp` |
| class_teacher | `ClassTeacherApp` |
| student | `StudentApp` |
| admin, principal, vice_principal, vice_principal_academic, vice_principal_education, psychologist, social_pedagogue | `AdminApp` |

### AdminApp — навигация по ролям

| Раздел (key) | admin | principal | VP / VP_acad | VP_educ | psychologist | social_pedagogue |
|-------------|:-----:|:---------:|:------------:|:-------:|:------------:|:----------------:|
| dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| classrooms | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| students | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| teachers | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| school-analytics | ✓ | ✓ | ✓ | — | — | — |
| open-lessons | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| school-control (протоколы) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| gifted | ✓ | ✓ | ✓ | — | ✓ | — |
| fl | ✓ | ✓ | ✓ | — | — | — |
| rating | ✓ | ✓ | ✓ | ✓ | — | — |
| ai-usage | ✓ | ✓ | ✓ | — | — | — |
| welfare | ✓ | ✓ | — | ✓ | ✓ | — |
| household | ✓ | ✓ | — | — | — | — |
| bbjm | ✓ | ✓ | ✓ | — | — | — |
| ktp-plans | ✓ | ✓ | ✓ | — | — | — |
| attestation | ✓ | ✓ | ✓ | — | — | — |
| final-attestation | ✓ | ✓ | ✓ | — | — | — |
| psychologist | ✓ | ✓ | — | ✓ | ✓ | — |
| social-pedagogue | ✓ | ✓ | — | ✓ | — | ✓ |
| school-info | ✓ | ✓ | ✓ | — | — | — |
| sor-soch | ✓ | ✓ | ✓ | — | — | — |
| schedule-admin | ✓ | ✓ | ✓ | — | — | — |
| questionnaires | ✓ | ✓ | — | ✓ | ✓ | — |
| users | ✓ | ✓ | — | — | — | — |
| registrations | ✓ | ✓ | — | — | — | — |
| schools | ✓ (global) | — | — | — | — | — |

### TeacherApp — навигация (teacher + class_teacher)

| Раздел | teacher | class_teacher |
|--------|:-------:|:-------------:|
| dashboard | ✓ | ✓ |
| profile | ✓ | ✓ |
| students | ✓ | ✓ |
| ktp (загрузка КТП) | ✓ | ✓ |
| tasks (генераторы) | ✓ | ✓ |
| assignments | ✓ | ✓ |
| lessons (открытые уроки) | ✓ | ✓ |
| my-ktp-ksp | ✓ | ✓ |
| materials | ✓ | ✓ |
| my-class | — | ✓ |
| analytics | — | ✓ |
| class-hours | — | ✓ |
| teacher-modo (BBJM) | ✓ | ✓ |
| teacher-final (итог. аттест.) | ✓ | ✓ |
| gifted | ✓ | ✓ |
| fl | ✓ | ✓ |
| my-rating | ✓ | ✓ |
| sor-soch | ✓ | ✓ |
| kmzh-generator | ✓ | ✓ |
| malimet | — | ✓ |

### StudentApp
Доступ только для `student`: расписание, задания, сдача работ, оценки, FL-задания, анкеты.

### API вызовы (lib/api.ts)
Все фронтенд-запросы идут через `api.ts`. Основные группы:

| Группа | Ключевые методы |
|--------|-----------------|
| auth | login, register, getMe, updateProfile, forgotPassword, resetPassword |
| admin | getAdminOverview, getPendingRegistrations, approveRegistration, rejectRegistration |
| users | getUsers, createUser, updateUser, deactivateUser, activateUser, deleteUser, changeUserPassword |
| classrooms | getClassrooms, createClassroom, updateClassroom, deleteClassroom, bulkTransferStudents |
| students | getStudents, createStudent, updateStudent, deleteStudent, transferStudent |
| lessons | getMyLessons, getAllLessons, createLesson, updateLesson, deleteLesson, getLessonAnalysis, saveLessonAnalysis, getLessonAnalysisPdf |
| assignments | getMyAssignments, createAssignment, publishAssignment, closeAssignment, getClassroomAssignments |
| schedule | getMySchedule, getAllSchedule, adminUpsertSchedule |
| class-hours | getMyClassHours, getAllClassHours, createClassHour, updateClassHour, deleteClassHour |
| files | uploadFile, listFilesInFolder, createFolder, deleteFile, renameFile |
| gifted | getGiftedPlans, getGiftedStudents, markGifted, getGiftedStudentCard, addGiftedAchievement |
| fl | flGetTasks, flCreateTask, flGetAssignments, flCreateAssignment, flGenerateTask, flGetStudentAssignments, flSubmitAnswers |
| rating | ratingCalculate, ratingGetSchool, ratingGetMy, ratingGetMyHistory, ratingCreateViolation, getMyViolations |
| ai-usage | getAiUsage, getAiUsageSummary, getAiUsageByTeacher, getAiUsageChart |
| ktp | getKtpFiles, saveKtpReview, getMyKtpReviews |
| materials | generatePresentation, getMyPresentations, generateIllustration, getMyIllustrations |
| kmzh | generateKmzh, saveKmzh, getMySavedKmzh |
| malimet | malimetPrefill, saveMalimet, getMalimetList |
| notifications | getMyNotifications, getUnreadNotificationCount, markAllNotificationsRead |
| schools | getSchools, createSchool, activateSchool, deactivateSchool |
| social-pedagogue | getNutritionStudents, getSpecialAttentionStudents, exportNutritionCsv |
| questionnaires | getQuestionnaires, createQuestionnaire, generateQuestionnaire, analyzeQuestionnaire |
| attestation | getAttestations, updateAttestation, getMyAttestation |

---

## 4. Проблемы

### ⚠️ P1: Эндпоинты без @Roles() — высокий риск

Любой аутентифицированный пользователь (любой роли) может вызвать эти эндпоинты:

| Модуль | Эндпоинты |
|--------|-----------|
| **lessons** | GET `/lessons` (мои уроки), GET `/lessons/:id/analysis`, GET `/lessons/:id/analysis/pdf` |
| **assignments** | GET `/assignments`, GET `/assignments/classroom/:id`, GET `/assignments/:id`, GET `/assignments/:id/submissions`, POST `/assignments/:id/submit` |
| **dashboard** | GET `/dashboard` |
| **generators** | POST `/generators/lesson-plan`, POST `/generators/task-set` |
| **ai** | POST `/ai/chat`, POST `/ai/generate-assignment`, POST `/ai/generate-lesson-plan` |
| **exports** | POST `/exports/pdf` |
| **files** | ВСЕ 11 эндпоинтов |
| **analytics** | POST `/analytics/upload` |
| **gifted** | GET `/gifted/all-students`, GET `/gifted/teachers`, GET `/gifted/teachers/:id/students`, GET/POST/DELETE `/gifted/materials`, POST/DELETE `/gifted/achievements` |
| **kmzh** | GET `/kmzh/values/:month` |
| **schedule** | GET `/schedule`, GET `/schedule/classroom/:id` |

> **Суммарно: ~30 незащищённых эндпоинтов**. Защита идёт только через `JwtAuthGuard` (токен), но роль не проверяется.

---

### ⚠️ P2: Прямой @InjectRepository чужих сущностей

**`RatingModule`** напрямую инжектирует 10 сущностей из других модулей без импорта этих модулей:

```
Assignment       ← AssignmentsModule (не импортируется)
TaskSubmission   ← AssignmentsModule (не импортируется)
OpenLesson       ← LessonsModule     (не импортируется)
GiftedTeacherAssignment ← GiftedModule (не импортируется)
GiftedAchievement       ← GiftedModule (не импортируется)
UploadedFile     ← FilesModule       (не импортируется)
FLTask           ← FLModule          (не импортируется)
FLAssignment     ← FLModule          (не импортируется)
FLSubmission     ← FLModule          (не импортируется)
Teacher          ← TeachersModule    (не импортируется)
```

**`AiUsageModule`** инжектирует `Teacher` из `TeachersModule` напрямую без импорта модуля.

> Антипаттерн: модули должны получать данные через exported сервисы, а не через прямой доступ к репозиториям других модулей.

---

### ⚠️ P3: TeachersModule без контроллера

`TeachersModule` управляет ключевой сущностью `Teacher` (все пользователи системы), но не имеет собственного контроллера. Управление учителями разбросано по `UsersModule`, `AdminModule`, `AuthModule`.

---

### ⚠️ P4: Дублирование функций генерации

| Модуль | Что генерирует |
|--------|---------------|
| `generators` | lesson-plan, task-set |
| `ai` | generate-assignment, generate-lesson-plan |
| `materials` | presentations (.pptx), illustrations |
| `fl` | ai/generate-task |
| `kmzh` | КМЖ через AI |

**Генерация планов уроков дублируется** в `generators` и `ai`. Нет единого AI-gateway.

---

### ⚠️ P5: `bbjm`, `si`, `welfare`, `household` — пустые backend-модули

Эти папки существуют в `modules/`, но не содержат контроллеров/сервисов. Соответствующие фронтенд-панели (`welfare-panel.tsx`, `household-panel.tsx`) существуют, но бэкенд не реализован — либо логика спрятана в другом модуле.

---

### ⚠️ P6: Нет циклических зависимостей

`forwardRef` не используется нигде в проекте — циклических зависимостей нет.

---

### ⚠️ P7: Фронтенд без серверного middleware

Нет `middleware.ts` в `apps/web/`. Защита страниц — только клиентская (условный рендеринг по `user.role`). При прямом переходе по URL до загрузки пользователя защиты нет (Next.js App Router без серверного guard).

---

## 5. Матрица доступа

> R = read, W = write/create/update/delete, RW = полный доступ, — = нет доступа  
> Составлена на основе @Roles() декораторов в контроллерах.

| Модуль | admin | principal | VP / VP_acad | VP_educ | psychologist | social_ped | teacher | class_teacher | student |
|--------|:-----:|:---------:|:------------:|:-------:|:------------:|:----------:|:-------:|:-------------:|:-------:|
| **auth** | RW | RW | RW | RW | RW | RW | RW | RW | RW |
| **schools** | RW | R | R | — | — | — | — | — | — |
| **users** | RW | RW | R | — | — | — | — | — | — |
| **admin** | RW | RW | R | R | R | R | — | — | — |
| **classrooms** | RW | RW | RW | R | R | R | R | R | — |
| **students** | RW | RW | RW | R | R | R | W | W | — |
| **dashboard** | R | R | R | R | R | R | R | R | — |
| **lessons** | RW | RW | RW | RW | R | — | RW | RW | — |
| **lessons/analysis** | W | W | W | W | — | — | R | R | — |
| **assignments** | RW | R | R | — | — | — | RW | — | W(submit) |
| **schedule** | RW | RW | RW | — | — | — | RW | R | R |
| **class-hours** | RW | RW | R | — | — | — | — | RW | — |
| **protocols** | RW | RW | RW | RW | R | R | R | R | — |
| **ktp** | RW | RW | RW | — | — | — | R | R | — |
| **school-info** | RW | RW | R | — | — | — | — | — | — |
| **sor-soch** | RW | RW | RW | — | — | — | RW | RW | — |
| **attestation** | RW | RW | RW | — | — | — | R | R | — |
| **final-attestation** | RW | RW | RW | — | — | — | R | R | — |
| **questionnaires** | RW | RW | RW | RW | RW | — | — | — | W(respond) |
| **social-pedagogue** | RW | RW | R | RW | — | RW | — | — | — |
| **gifted** | RW | RW | RW | — | R | — | RW | RW | — |
| **fl** | RW | RW | RW | — | — | — | RW | RW | R(student tasks) |
| **rating** | RW | RW | RW | R | — | — | R | R | — |
| **ai-usage** | R | R | R | — | — | — | R | R | — |
| **analytics** | RW | RW | RW | — | — | — | R | R | — |
| **materials** | RW | RW | RW | — | — | — | RW | RW | — |
| **kmzh** | RW | RW | — | — | — | — | RW | RW | — |
| **malimet** | R | R | R | — | — | — | — | RW | — |
| **notifications** | — | — | — | — | — | — | R | R | — |
| **generators** | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| **ai** | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| **files** | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| **exports** | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |

> ⚠️ = нет @Roles(), доступно любому аутентифицированному пользователю

---

*Конец файла*
