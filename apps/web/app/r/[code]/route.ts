import { NextResponse, type NextRequest } from "next/server";

/**
 * Короткая ссылка для печати и QR-кодов: /r/almaty → витрина с utm-метками.
 *
 * Код раскрывает API (там же считаются переходы). Редирект временный (307):
 * постоянный браузер запомнил бы и следующий переход не дошёл бы до счётчика.
 * Неизвестный или удалённый код ведёт на главную — напечатанная листовка не
 * должна упираться в ошибку.
 */
export const dynamic = "force-dynamic";

const SITE = "https://aqyl-service.kz";

function apiBase(): string {
  // На проде API на той же машине: идём напрямую, мимо nginx. Через него все
  // переходы пришли бы с одного адреса сервера и упёрлись бы в общий лимит запросов.
  if (process.env.API_INTERNAL_URL) return process.env.API_INTERNAL_URL;
  if (process.env.NODE_ENV === "production") return "http://127.0.0.1:4000";
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const origin = process.env.NODE_ENV === "production" ? SITE : req.nextUrl.origin;
  const target = new URL("/", origin);
  try {
    const res = await fetch(`${apiBase()}/r/${encodeURIComponent(code.toLowerCase())}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = (await res.json()) as { path: string; params: Record<string, string> };
      target.pathname = data.path === "/kz" ? "/kz" : "/";
      for (const [k, v] of Object.entries(data.params)) target.searchParams.set(k, v);
    }
  } catch {
    // API недоступен — всё равно ведём на витрину, без меток.
  }
  return NextResponse.redirect(target, 307);
}
