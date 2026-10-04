/**
 * Названия этапов, которые задаёт методика, а не модель.
 *
 * Первый этап урока называется «Организация урока» (каз. «Ұйымдастыру») и
 * включает организационный момент, актуализацию прошлых знаний, мозговой
 * штурм и т. п. (замечание методиста, 04.10.2026). До этого модель называла
 * его каждый раз по-своему — «Актуализация опорных знаний», «Білімді
 * жаңғырту», «Prior Knowledge Activation», — а интерфейс писал «Разогрев» /
 * «Қыздыру».
 *
 * Применяется и при генерации, и при выводе: старые уроки в документе тоже
 * получают правильное название.
 */
const FIXED: Record<string, Record<string, string>> = {
  warmup: { ru: 'Организация урока', kz: 'Ұйымдастыру', en: 'Lesson organisation' },
};

/** Каноническое название этапа или null, если название остаётся за моделью. */
export function fixedStageName(stageType: string | null | undefined, language: string | null | undefined): string | null {
  const byLang = FIXED[stageType ?? ''];
  if (!byLang) return null;
  return byLang[language ?? ''] ?? byLang.kz;
}

/** Название этапа для документа и страниц: каноническое, иначе от модели. */
export function stageDisplayName(
  s: { stageType?: string | null; stageName?: string | null }, language: string | null | undefined,
): string {
  return fixedStageName(s.stageType, language) ?? s.stageName ?? s.stageType ?? '';
}
