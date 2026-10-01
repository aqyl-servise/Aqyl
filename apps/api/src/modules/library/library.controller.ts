import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SkipSchoolIsolation } from '../../common/decorators/skip-school-isolation.decorator';
import { LibraryService } from './library.service';
import { ShareService } from './share.service';

class CreateExampleDto {
  @IsIn(['ru', 'kz'])
  lang!: 'ru' | 'kz';

  @IsString() @Length(2, 100)
  subject!: string;

  @IsInt() @Min(1) @Max(11)
  grade!: number;

  @IsString() @Length(3, 300)
  topic!: string;

  @IsOptional() @IsArray() @ArrayMaxSize(6) @IsString({ each: true }) @Length(3, 20, { each: true })
  objectives?: string[];
}

/** Публичные страницы библиотеки: без входа, только опубликованное. */
@Controller('library')
export class LibraryPublicController {
  constructor(private readonly library: LibraryService) {}

  @Get('examples')
  list() {
    return this.library.publicList();
  }

  @Get('examples/:slug')
  get(@Param('slug') slug: string) {
    return this.library.publicGet(String(slug).slice(0, 160));
  }
}

/**
 * «Поделиться уроком». Создать и отозвать ссылку — владелец урока; открыть —
 * кто угодно по ссылке (страница /s/<token>, не индексируется).
 */
@Controller('share')
@SkipSchoolIsolation()
export class ShareController {
  constructor(private readonly shares: ShareService) {}

  @Post('lessons/:id')
  @UseGuards(JwtAuthGuard)
  create(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: { user: { id: string } }) {
    return this.shares.share(id, req.user.id);
  }

  @Delete('lessons/:id')
  @UseGuards(JwtAuthGuard)
  revoke(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: { user: { id: string } }) {
    return this.shares.revoke(id, req.user.id);
  }

  @Get(':token')
  open(@Param('token') token: string) {
    return this.shares.open(String(token).slice(0, 16));
  }
}

/** Админка библиотеки: создание, вычитка, публикация. Только администратор платформы. */
@Controller('admin/library')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@SkipSchoolIsolation()
export class LibraryAdminController {
  constructor(private readonly library: LibraryService) {}

  @Get('examples')
  list() {
    return this.library.adminList();
  }

  @Post('examples')
  create(@Body() dto: CreateExampleDto) {
    return this.library.create(dto);
  }

  @Post('presets')
  seed() {
    return this.library.seedPresets();
  }

  @Get('examples/:id')
  content(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.library.adminContent(id);
  }

  @Post('examples/:id/publish')
  publish(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.library.setPublished(id, true);
  }

  @Post('examples/:id/unpublish')
  unpublish(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.library.setPublished(id, false);
  }

  @Post('examples/:id/retry')
  retry(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.library.retry(id);
  }

  @Delete('examples/:id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.library.remove(id);
  }
}
