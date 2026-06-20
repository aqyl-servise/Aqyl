import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { accessToken } = await request.json();

  if (!accessToken) {
    return NextResponse.json({ error: "No token" }, { status: 400 });
  }

  const response = NextResponse.json({ success: true });

  response.cookies.set("aqyl-token", accessToken, {
    httpOnly: true, // недоступна через document.cookie — защита от XSS
    secure: process.env.NODE_ENV === "production", // только HTTPS в prod
    sameSite: "lax", // защита от CSRF
    maxAge: 60 * 60 * 24, // 1 день (совпадает с JWT_B2G_ACCESS_EXPIRES)
    path: "/",
  });

  return response;
}
