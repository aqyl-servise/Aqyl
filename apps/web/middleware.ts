import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC_PATHS = [
  '/login',
  '/login-teacher',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/api/auth/set-cookie',
  '/api/auth/clear-cookie',
  '/api/auth',        // все /api/auth/* публичные (login, register, b2c/*)
  '/_next',
  '/favicon',
  '/icons',
  '/images',
]

function isPublic(pathname: string): boolean {
  // Корневой лендинг доступен всем (startsWith('/') матчил бы вообще всё).
  if (pathname === '/') return true
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Публичные маршруты — пропускаем без проверки
  if (isPublic(pathname)) {
    return NextResponse.next()
  }

  const token = request.cookies.get('aqyl-token')?.value

  // Нет токена — редирект на логин
  if (!token) {
    const loginUrl = pathname.startsWith('/dashboard/b2c')
      ? '/login-teacher'
      : '/login'
    return NextResponse.redirect(new URL(loginUrl, request.url))
  }

  // Есть токен — проверяем подпись
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    await jwtVerify(token, secret)
    return NextResponse.next()
  } catch {
    // Токен невалидный или истёк
    const response = NextResponse.redirect(
      new URL(
        pathname.startsWith('/dashboard/b2c') ? '/login-teacher' : '/login',
        request.url,
      ),
    )
    response.cookies.delete('aqyl-token')
    return response
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|images).*)',
  ],
}
