import { HttpException, HttpStatus, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { join } from "path";
import { existsSync, unlinkSync } from "fs";
import { AiClientService } from "../../services/ai-client.service";
import { GeneratedPresentation } from "../schools/entities/generated-presentation.entity";
import { GeneratedIllustration } from "../schools/entities/generated-illustration.entity";
import { StorageService } from "../storage/storage.service";
import { TokenService } from "../tokens/token.service";
import { AiUsageService } from "../ai-usage/ai-usage.service";

const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PptxGenJS = require("pptxgenjs") as new () => PptxInstance;

interface PptxSlideOptions {
  x: number; y: number; w: string | number; h: number;
  fontSize?: number; bold?: boolean; color?: string;
}
interface PptxTextEntry { text: string; options: { bullet: boolean } }
interface PptxSlide {
  background: { color: string };
  addText(text: string | PptxTextEntry[], opts: PptxSlideOptions): void;
  addNotes(notes: string): void;
}
interface PptxInstance {
  layout: string;
  addSlide(): PptxSlide;
  write(props: { outputType: string }): Promise<unknown>;
}

interface SlideData {
  title?: string;
  content?: string;
  speakerNotes?: string;
}

@Injectable()
export class MaterialsService {
  constructor(
    @InjectRepository(GeneratedPresentation)
    private readonly presRepo: Repository<GeneratedPresentation>,
    @InjectRepository(GeneratedIllustration)
    private readonly illusRepo: Repository<GeneratedIllustration>,
    private readonly aiClientService: AiClientService,
    private readonly storageService: StorageService,
    @Optional() private readonly tokenService?: TokenService,
    @Optional() private readonly aiUsageService?: AiUsageService,
  ) {
    // Generated .pptx/.svg are streamed to S3-compatible object storage (StorageService) —
    // no longer written to local disk, so they survive redeploys and multi-instance scaling.
  }

  private async checkLimit(teacherId: string, schoolId: string, role: string): Promise<void> {
    if (!this.aiUsageService) return;
    if (!this.aiUsageService.isLimitedRole(role)) return;
    const check = await this.aiUsageService.checkAndIncrement(teacherId, schoolId, 'ai_generate');
    if (!check.allowed) {
      throw new HttpException({ message: check.message, limitReached: true }, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private recordUsage(teacherId: string, schoolId: string, role: string, actionType: string, tokensIn: number, tokensOut: number): void {
    if (!this.aiUsageService || !this.aiUsageService.isLimitedRole(role)) return;
    this.aiUsageService.recordTokens(teacherId, schoolId, actionType, tokensIn, tokensOut).catch(() => {});
  }

  async generatePresentation(
    teacherId: string,
    schoolId: string,
    role: string,
    prompt: string,
    slideCount = 10,
    attachedText?: string,
  ): Promise<GeneratedPresentation> {
    await this.checkLimit(teacherId, schoolId, role);

    const title = prompt.slice(0, 100);
    const record = await this.presRepo.save({ teacherId, schoolId, title, prompt, slideCount, status: "generating" });

    try {
      const systemPrompt = `You are a presentation creator for Kazakhstani school teachers.
Create a structured PowerPoint presentation outline.
Return ONLY a JSON array of slides, no other text, no markdown code blocks:
[
  { "title": "slide title", "content": "bullet points separated by \\n", "speakerNotes": "notes" }
]`;

      const result = await this.aiClientService.request({
        action: "presentation_generate",
        systemPrompt,
        messages: [{
          role: "user",
          content: `Topic/Prompt: ${prompt}\nSlides requested: ${slideCount}\nAdditional context: ${attachedText || "None"}\n\nReturn ONLY a JSON array of exactly ${slideCount} slides.`,
        }],
        maxTokens: 2000,
      });

      let slides: SlideData[] = [];
      const raw = result.content.trim();
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      slides = JSON.parse(jsonMatch ? jsonMatch[0] : raw) as SlideData[];

      const pptx = new PptxGenJS();
      pptx.layout = "LAYOUT_WIDE";

      for (const slide of slides) {
        const s = pptx.addSlide();
        s.background = { color: "FFFFFF" };
        s.addText(slide.title ?? "", { x: 0.5, y: 0.3, w: "90%", h: 1, fontSize: 24, bold: true, color: "2563EB" });
        if (slide.content) {
          const bullets = slide.content.split("\n").filter(Boolean);
          s.addText(
            bullets.map(b => ({ text: b, options: { bullet: true } })),
            { x: 0.5, y: 1.5, w: "90%", h: 5, fontSize: 16, color: "374151" },
          );
        }
        if (slide.speakerNotes) s.addNotes(slide.speakerNotes);
      }

      this.recordUsage(teacherId, schoolId, role, 'presentation_generate', result.tokensIn, result.tokensOut);

      this.tokenService?.deductTokens({
        schoolId,
        userId: teacherId,
        inputTokens: result.tokensIn,
        outputTokens: result.tokensOut,
        actionType: "presentation_generate",
        model: result.model,
        costUsd: this.tokenService.calculateCost({ input_tokens: result.tokensIn, output_tokens: result.tokensOut }, result.model),
      }).catch(() => {});

      const buf = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
      const key = `presentations/${Date.now()}-${record.id}.pptx`;
      const fileUrl = await this.storageService.uploadBuffer(buf, key, PPTX_MIME);

      await this.presRepo.update(record.id, { fileUrl, s3Key: key, status: "ready" });
      return this.presRepo.findOneOrFail({ where: { id: record.id } });
    } catch (err) {
      await this.presRepo.update(record.id, { status: "error" });
      throw err;
    }
  }

  async generateIllustration(
    teacherId: string,
    schoolId: string,
    role: string,
    prompt: string,
    attachedText?: string,
  ): Promise<GeneratedIllustration> {
    await this.checkLimit(teacherId, schoolId, role);

    const title = prompt.slice(0, 100);
    const record = await this.illusRepo.save({ teacherId, schoolId, title, prompt, status: "generating" });

    try {
      const systemPrompt = `Create an educational SVG illustration for a Kazakhstani school lesson.
Return ONLY valid SVG code starting with <svg, nothing else.
The SVG should be educational, clear, and appropriate for school students.
Use viewBox="0 0 800 600". Include proper colors and labels in Russian.`;

      const result = await this.aiClientService.request({
        action: "assistant_chat",
        systemPrompt,
        messages: [{
          role: "user",
          content: `Description: ${prompt}\nContext: ${attachedText || "None"}`,
        }],
        maxTokens: 3000,
      });

      this.recordUsage(teacherId, schoolId, role, 'illustration_generate', result.tokensIn, result.tokensOut);

      this.tokenService?.deductTokens({
        schoolId,
        userId: teacherId,
        inputTokens: result.tokensIn,
        outputTokens: result.tokensOut,
        actionType: "illustration_generate",
        model: result.model,
        costUsd: this.tokenService.calculateCost({ input_tokens: result.tokensIn, output_tokens: result.tokensOut }, result.model),
      }).catch(() => {});

      let svgContent = result.content.trim();
      const svgMatch = svgContent.match(/<svg[\s\S]*<\/svg>/i);
      if (svgMatch) svgContent = svgMatch[0];

      const key = `illustrations/${Date.now()}-${record.id}.svg`;
      const imageUrl = await this.storageService.uploadBuffer(
        Buffer.from(svgContent, "utf-8"),
        key,
        "image/svg+xml",
      );

      await this.illusRepo.update(record.id, { imageUrl, s3Key: key, status: "ready" });
      return this.illusRepo.findOneOrFail({ where: { id: record.id } });
    } catch (err) {
      await this.illusRepo.update(record.id, { status: "error" });
      throw err;
    }
  }

  getMyPresentations(teacherId: string): Promise<GeneratedPresentation[]> {
    return this.presRepo.find({ where: { teacherId }, order: { createdAt: "DESC" } });
  }

  getMyIllustrations(teacherId: string): Promise<GeneratedIllustration[]> {
    return this.illusRepo.find({ where: { teacherId }, order: { createdAt: "DESC" } });
  }

  async getPresentation(id: string): Promise<GeneratedPresentation> {
    const pres = await this.presRepo.findOne({ where: { id } });
    if (!pres) throw new NotFoundException("Presentation not found");
    return pres;
  }

  async getIllustration(id: string): Promise<GeneratedIllustration> {
    const illus = await this.illusRepo.findOne({ where: { id } });
    if (!illus) throw new NotFoundException("Illustration not found");
    return illus;
  }

  async deletePresentation(id: string, teacherId: string): Promise<void> {
    const pres = await this.presRepo.findOne({ where: { id, teacherId } });
    if (!pres) throw new NotFoundException("Presentation not found");
    if (pres.s3Key) {
      await this.storageService.deleteFile(pres.s3Key);
    } else if (pres.fileUrl) {
      // Legacy disk-backed file (pre-S3 migration).
      const fp = join(process.cwd(), pres.fileUrl);
      if (existsSync(fp)) unlinkSync(fp);
    }
    await this.presRepo.delete(id);
  }

  async deleteIllustration(id: string, teacherId: string): Promise<void> {
    const illus = await this.illusRepo.findOne({ where: { id, teacherId } });
    if (!illus) throw new NotFoundException("Illustration not found");
    if (illus.s3Key) {
      await this.storageService.deleteFile(illus.s3Key);
    } else if (illus.imageUrl) {
      // Legacy disk-backed file (pre-S3 migration).
      const fp = join(process.cwd(), illus.imageUrl);
      if (existsSync(fp)) unlinkSync(fp);
    }
    await this.illusRepo.delete(id);
  }
}
