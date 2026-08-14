import { Injectable, Logger } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import puppeteer = require('puppeteer');

/**
 * HTML → PDF через headless Chromium (ТЗ 1.4). Браузер запускается на каждый
 * рендер и закрывается — так на 2 ГБ VPS (со свопом) память не накапливается.
 * Флаги минимизируют потребление: --disable-dev-shm-usage важен, т.к. /dev/shm
 * на сервере крошечный и Chromium иначе падает.
 */
@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async render(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
    try {
      const page = await browser.newPage();
      // Шрифты вшиты в HTML base64 — сеть не нужна, ждём только вёрстку.
      await page.setContent(html, { waitUntil: 'load' });
      await page.evaluateHandle('document.fonts.ready');
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '11mm', bottom: '11mm', left: '14mm', right: '11mm' },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close().catch((e) => this.logger.warn(`browser.close: ${(e as Error).message}`));
    }
  }

  /** Слайды 16:9 (ТЗ 2.0): каждая страница landscape 1280×720, без полей. */
  async renderSlides(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      await page.evaluateHandle('document.fonts.ready');
      const pdf = await page.pdf({
        printBackground: true,
        width: '1280px',
        height: '720px',
        margin: { top: '0', bottom: '0', left: '0', right: '0' },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close().catch((e) => this.logger.warn(`browser.close: ${(e as Error).message}`));
    }
  }
}
