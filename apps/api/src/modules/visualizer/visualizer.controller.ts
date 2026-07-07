import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SkipSchoolIsolation } from '../../common/decorators/skip-school-isolation.decorator';
import { VisualizerService } from './visualizer.service';
import { GenerateDiagramDto } from './dto/generate-diagram.dto';
import { SaveDiagramDto } from './dto/save-diagram.dto';
import { UpdateDiagramDto } from './dto/update-diagram.dto';

type AuthRequest = { user: { id: string; sub?: string; schoolId: string | null; role: string } };

// B2C teachers have no school — service still scopes every query by userId,
// so skip the school-isolation interceptor (same pattern as text-adapter).
@SkipSchoolIsolation()
@Controller('visualizer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  'teacher',
  'class_teacher',
  'admin',
  'principal',
  'vice_principal',
  'vice_principal_academic',
  'vice_principal_education',
)
export class VisualizerController {
  constructor(private readonly visualizerService: VisualizerService) {}

  private ctx(req: AuthRequest) {
    return {
      userId: req.user.id ?? req.user.sub,
      schoolId: req.user.schoolId,
      role: req.user.role,
    };
  }

  @Post('generate')
  async generateDiagram(
    @Body() dto: GenerateDiagramDto,
    @Req() req: AuthRequest,
  ) {
    return this.visualizerService.generateDiagram(dto, this.ctx(req));
  }

  @Post()
  async saveDiagram(@Body() dto: SaveDiagramDto, @Req() req: AuthRequest) {
    return this.visualizerService.save(dto, this.ctx(req));
  }

  @Get()
  async findAll(@Req() req: AuthRequest) {
    return this.visualizerService.findAll(this.ctx(req));
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.visualizerService.findOne(id, this.ctx(req));
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDiagramDto,
    @Req() req: AuthRequest,
  ) {
    return this.visualizerService.update(id, dto, this.ctx(req));
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.visualizerService.remove(id, this.ctx(req));
  }
}
