import { Body, Controller, Header, Post, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ExportPdfDto } from "./dto/export-pdf.dto";
import { ExportsService } from "./exports.service";

@UseGuards(JwtAuthGuard)
@Controller("exports")
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Post("pdf")
  @Header("Content-Type", "application/pdf")
  async exportPdf(@Body() body: ExportPdfDto, @Res() res: Response) {
    const buffer = await this.exportsService.createPdfBuffer(body);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${body.title.replace(/\s+/g, "-").toLowerCase()}.pdf"`,
    );
    res.send(buffer);
  }
}
