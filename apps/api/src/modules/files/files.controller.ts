import {
  BadRequestException, Controller, Get, Param, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname, join, normalize } from "path";
import { v4 as uuid } from "uuid";
import { Response } from "express";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UploadedFile as UploadedFileEntity } from "../schools/entities/uploaded-file.entity";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/plain",
  "text/csv",
]);

interface ReqUser { user: { id: string } }
interface MulterFile { originalname: string; mimetype: string; size: number; filename: string; path: string }

@Controller("files")
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(
    @InjectRepository(UploadedFileEntity)
    private readonly fileRepo: Repository<UploadedFileEntity>,
  ) {}

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./uploads",
        filename: (_req, file, cb) => cb(null, `${uuid()}${extname(file.originalname)}`),
      }),
      limits: { fileSize: 20 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
          return cb(new BadRequestException(`File type ${file.mimetype} is not allowed`), false);
        }
        cb(null, true);
      },
    }),
  )
  async upload(@UploadedFile() file: MulterFile, @Req() req: ReqUser) {
    const saved = await this.fileRepo.save(
      this.fileRepo.create({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        uploadedBy: { id: req.user.id } as never,
      }),
    );
    return { id: saved.id, filename: saved.filename, originalName: saved.originalName, url: `/files/${saved.filename}` };
  }

  @Get(":filename")
  serveFile(@Param("filename") filename: string, @Res() res: Response) {
    // Prevent path traversal: only allow UUID-based filenames (hex chars, hyphens, dot + extension)
    if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}\.[a-zA-Z0-9]{1,10}$/.test(filename)) {
      return res.status(400).json({ message: "Invalid filename" });
    }
    const uploadsDir = join(process.cwd(), "uploads");
    const filePath = normalize(join(uploadsDir, filename));
    if (!filePath.startsWith(uploadsDir + "/") && !filePath.startsWith(uploadsDir + "\\")) {
      return res.status(400).json({ message: "Invalid filename" });
    }
    res.sendFile(filePath);
  }

  @Get()
  async getMyFiles(@Req() req: ReqUser) {
    return this.fileRepo.find({
      where: { uploadedBy: { id: req.user.id } },
      order: { createdAt: "DESC" },
    });
  }
}
