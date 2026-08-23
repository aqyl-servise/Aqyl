import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC_PATHS = [
  '/login',
  '/login-teacher',
  '/register',
  '/forgot-password',
  '/reset-password',
  // Демонстрация продукта без регистрации — требование правила App Store 5.1.1.
  '/demo',
  // Документы должны открываться по постоянным адресам без входа: их
  // проверяют магазины приложений и платёжный оператор.
  '/privacy',
  '/terms',
  '/consent',
  '/delete-account',
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
    // Единый вход — оба типа пользователей идут на /login.
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Есть токен — проверяем подпись
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    await jwtVerify(token, secret)
    return NextResponse.next()
  } catch {
    // Токен невалидный или истёк
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('aqyl-token')
    return response
  }
}

export const config = {
  matcher: [
    // icon\.png — фавикон, который App Router генерирует из app/icon.png.
    // Без этого исключения middleware редиректил его на /login, и на всех
    // публичных страницах (лендинг, вход, юрдокументы) вкладка оставалась
    // без иконки: браузер запрашивает её без токена.
    '/((?!_next/static|_next/image|favicon.ico|icon\\.png|icons|images).*)',
  ],
}
