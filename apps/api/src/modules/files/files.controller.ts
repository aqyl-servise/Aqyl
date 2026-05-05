import {
  BadRequestException, Body, Controller, Delete, ForbiddenException,
  Get, NotFoundException, Param, Patch, Post, Query, Req, Res,
  UploadedFile, UseGuards, UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname, join, normalize } from "path";
import { v4 as uuid } from "uuid";
import { Response } from "express";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Like, Repository } from "typeorm";
import * as fs from "fs";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UploadedFile as UploadedFileEntity } from "../schools/entities/uploaded-file.entity";
import { FileFolder } from "../schools/entities/file-folder.entity";

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

const ADMIN_ROLES = new Set(["admin", "principal", "vice_principal"]);

interface ReqUser { user: { id: string; role: string; schoolId?: string | null } }
interface MulterFile { originalname: string; mimetype: string; size: number; filename: string; path: string }

@Controller("files")
export class FilesController {
  constructor(
    @InjectRepository(UploadedFileEntity)
    private readonly fileRepo: Repository<UploadedFileEntity>,
    @InjectRepository(FileFolder)
    private readonly folderRepo: Repository<FileFolder>,
  ) {}

  // ── Upload ──────────────────────────────────────────────────────────────────

  @Post("upload")
  @UseGuards(JwtAuthGuard)
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
  async upload(
    @UploadedFile() file: MulterFile,
    @Req() req: ReqUser,
    @Body("folderId") folderId?: string,
    @Body("section") section?: string,
    @Body("refType") refType?: string,
    @Body("refId") refId?: string,
    @Body("assignedClassrooms") assignedClassroomsRaw?: string,
  ) {
    let assignedClassrooms: string[] | undefined;
    if (assignedClassroomsRaw) {
      try { assignedClassrooms = JSON.parse(assignedClassroomsRaw); } catch {}
    }
    const saved = await this.fileRepo.save(
      this.fileRepo.create({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        folderId: folderId || undefined,
        section: section || undefined,
        refType: refType || undefined,
        refId: refId || undefined,
        schoolId: req.user.schoolId ?? undefined,
        assignedClassrooms: assignedClassrooms || undefined,
        uploadedBy: { id: req.user.id } as never,
      }),
    );
    return { id: saved.id, filename: saved.filename, originalName: saved.originalName, url: `/files/${saved.filename}` };
  }

  // ── Folder CRUD (declared before :filename to avoid route shadowing) ────────

  @Post("folder")
  @UseGuards(JwtAuthGuard)
  async createFolder(
    @Body() body: { name: string; parentId?: string; section?: string; teacherRefId?: string },
    @Req() req: ReqUser,
  ) {
    if (!body.name?.trim()) throw new BadRequestException("Folder name is required");
    return this.folderRepo.save(
      this.folderRepo.create({
        name: body.name.trim(),
        parentId: body.parentId || undefined,
        section: body.section || undefined,
        teacherRefId: body.teacherRefId || undefined,
        schoolId: req.user.schoolId ?? undefined,
        createdBy: { id: req.user.id } as never,
      }),
    );
  }

  @Get("folders")
  @UseGuards(JwtAuthGuard)
  async listFolders(
    @Req() req: ReqUser,
    @Query("parentId") parentId?: string,
    @Query("section") section?: string,
    @Query("teacherRefId") teacherRefId?: string,
  ) {
    const where: Record<string, unknown> = {};
    if (!parentId || parentId === "root") {
      where["parentId"] = IsNull();
    } else {
      where["parentId"] = parentId;
    }
    if (section) where["section"] = section;
    if (teacherRefId) where["teacherRefId"] = teacherRefId;
    if (req.user.schoolId) where["schoolId"] = req.user.schoolId;
    return this.folderRepo.find({ where, order: { name: "ASC" } });
  }

  @Get("folder/:id")
  @UseGuards(JwtAuthGuard)
  async getFolderContents(@Param("id") id: string) {
    const folder = await this.folderRepo.findOne({ where: { id } });
    if (!folder) throw new NotFoundException("Folder not found");
    const [subfolders, files] = await Promise.all([
      this.folderRepo.find({ where: { parentId: id }, order: { name: "ASC" } }),
      this.fileRepo.find({ where: { folderId: id }, order: { createdAt: "DESC" }, relations: ["uploadedBy"] }),
    ]);
    return { folder, subfolders, files };
  }

  @Delete("folder/:id")
  @UseGuards(JwtAuthGuard)
  async deleteFolder(@Param("id") id: string, @Req() req: ReqUser) {
    if (!ADMIN_ROLES.has(req.user.role)) throw new ForbiddenException("Access denied");
    const folder = await this.folderRepo.findOne({ where: { id } });
    if (!folder) throw new NotFoundException("Folder not found");
    await this.deleteFolderRecursive(id);
    return { ok: true };
  }

  // ── All teachers' KSP files (admin) ────────────────────────────────────────

  @Get("ksp-all")
  @UseGuards(JwtAuthGuard)
  async listAllKsp(@Req() req: ReqUser) {
    if (!ADMIN_ROLES.has(req.user.role)) throw new ForbiddenException("Access denied");
    const where: Record<string, unknown> = { section: Like("teacher-ksp-%") };
    if (req.user.schoolId) where["schoolId"] = req.user.schoolId;
    return this.fileRepo.find({ where, order: { createdAt: "DESC" }, relations: ["uploadedBy"] });
  }

  // ── File list ───────────────────────────────────────────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard)
  async listFiles(
    @Req() req: ReqUser,
    @Query("folderId") folderId?: string,
    @Query("section") section?: string,
  ) {
    const where: Record<string, unknown> = {};
    if (folderId === "null" || folderId === "root") {
      where["folderId"] = IsNull();
    } else if (folderId) {
      where["folderId"] = folderId;
    }
    if (section) where["section"] = section;
    if (req.user.schoolId) {
      where["schoolId"] = req.user.schoolId;
    } else if (!ADMIN_ROLES.has(req.user.role)) {
      where["uploadedBy"] = { id: req.user.id };
    }
    return this.fileRepo.find({ where, order: { createdAt: "DESC" }, relations: ["uploadedBy"] });
  }

  // ── Rename file ─────────────────────────────────────────────────────────────

  @Patch("file/:id")
  @UseGuards(JwtAuthGuard)
  async renameFile(@Param("id") id: string, @Body() body: { originalName: string }, @Req() req: ReqUser) {
    const file = await this.fileRepo.findOne({ where: { id }, relations: ["uploadedBy"] });
    if (!file) throw new NotFoundException("File not found");
    if (!ADMIN_ROLES.has(req.user.role) && file.uploadedBy?.id !== req.user.id) {
      throw new ForbiddenException("Access denied");
    }
    if (!body.originalName?.trim()) throw new BadRequestException("Name is required");
    await this.fileRepo.update(id, { originalName: body.originalName.trim() });
    return { ok: true, originalName: body.originalName.trim() };
  }

  // ── Rename folder ────────────────────────────────────────────────────────────

  @Patch("folder/:id")
  @UseGuards(JwtAuthGuard)
  async renameFolder(@Param("id") id: string, @Body() body: { name: string }, @Req() req: ReqUser) {
    const folder = await this.folderRepo.findOne({ where: { id } });
    if (!folder) throw new NotFoundException("Folder not found");
    if (!body.name?.trim()) throw new BadRequestException("Name is required");
    await this.folderRepo.update(id, { name: body.name.trim() });
    return { ok: true, name: body.name.trim() };
  }

  // ── Delete file by DB id ────────────────────────────────────────────────────

  @Delete("file/:id")
  @UseGuards(JwtAuthGuard)
  async deleteFile(@Param("id") id: string, @Req() req: ReqUser) {
    const file = await this.fileRepo.findOne({ where: { id }, relations: ["uploadedBy"] });
    if (!file) throw new NotFoundException("File not found");
    if (!ADMIN_ROLES.has(req.user.role) && file.uploadedBy?.id !== req.user.id) {
      throw new ForbiddenException("Access denied");
    }
    try { fs.unlinkSync(file.path); } catch {}
    await this.fileRepo.delete(id);
    return { ok: true };
  }

  // ── Serve file (public — UUID is unguessable) ───────────────────────────────

  @Get(":filename")
  serveFile(@Param("filename") filename: string, @Res() res: Response) {
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

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async deleteFolderRecursive(folderId: string) {
    const subfolders = await this.folderRepo.find({ where: { parentId: folderId } });
    for (const sub of subfolders) {
      await this.deleteFolderRecursive(sub.id);
    }
    const files = await this.fileRepo.find({ where: { folderId } });
    for (const f of files) {
      try { fs.unlinkSync(f.path); } catch {}
      await this.fileRepo.delete(f.id);
    }
    await this.folderRepo.delete(folderId);
  }
}
