import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'aqyl-token'
// Routes that never require authentication.
const PUBLIC_PATHS = ['/', '/login', '/login-teacher', '/register', '/reset-password']
// Routes that require a valid session.
const PROTECTED_PATHS = ['/dashboard']

function matches(pathname: string, paths: string[]): boolean {
  return paths.some(p => pathname === p || pathname.startsWith(p + '/'))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Static assets / API — never gated here.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/icon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get(COOKIE_NAME)?.value
  // Реальная проверка JWT происходит на бэкенде через JwtAuthGuard.
  // Middleware проверяет только наличие cookie.
  const valid = !!token

  // Authenticated users shouldn't see the login screen.
  if (valid && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Public routes pass through.
  if (matches(pathname, PUBLIC_PATHS)) {
    return NextResponse.next()
  }

  // Protected routes require a valid session.
  if (matches(pathname, PROTECTED_PATHS)) {
    // B2C teachers have their own login screen.
    const loginPath = pathname.startsWith('/dashboard/b2c') ? '/login-teacher' : '/login'
    if (!token) {
      return NextResponse.redirect(new URL(loginPath, request.url))
    }
    if (!valid) {
      const response = NextResponse.redirect(new URL(loginPath, request.url))
      response.cookies.delete(COOKIE_NAME)
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
