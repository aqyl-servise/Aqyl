import { Injectable } from "@nestjs/common";
import PDFDocument = require("pdfkit");

@Injectable()
export class ExportsService {
  async createPdfBuffer(input: {
    title: string;
    type: string;
    language: string;
    data: Record<string, unknown>;
  }) {
    const document = new PDFDocument({ margin: 40 });
    const chunks: Buffer[] = [];

    return new Promise<Buffer>((resolve, reject) => {
      document.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      document.on("end", () => resolve(Buffer.concat(chunks)));
      document.on("error", reject);

      document.fontSize(20).text(input.title);
      document.moveDown();
      document.fontSize(11).fillColor("#555").text(`Type: ${input.type}`);
      document.text(`Language: ${input.language}`);
      document.moveDown();
      document.fillColor("#111");
      this.writeData(document, input.data, 0);
      document.end();
    });
  }

  private writeData(
    document: PDFKit.PDFDocument,
    value: unknown,
    depth: number,
    label?: string,
  ) {
    const indent = "  ".repeat(depth);
    if (Array.isArray(value)) {
      if (label) {
        document.fontSize(12).text(`${indent}${label}:`);
      }
      value.forEach((item, index) =>
        this.writeData(document, item, depth + 1, `Item ${index + 1}`),
      );
      return;
    }

    if (value && typeof value === "object") {
      if (label) {
        document.fontSize(12).text(`${indent}${label}:`);
      }
      Object.entries(value as Record<string, unknown>).forEach(([key, entry]) =>
        this.writeData(document, entry, depth + 1, key),
      );
      return;
    }

    document.fontSize(11).text(`${indent}${label ?? "Value"}: ${String(value ?? "")}`);
  }
}
