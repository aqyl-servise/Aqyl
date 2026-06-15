import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const COOKIE_NAME = 'aqyl-token'
// Routes that never require authentication.
const PUBLIC_PATHS = ['/', '/login', '/reset-password']
// Routes that require a valid session.
const PROTECTED_PATHS = ['/dashboard']

async function verifyToken(token: string): Promise<boolean> {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    console.error('[middleware] JWT_SECRET is not configured — blocking protected route')
    return false
  }
  try {
    await jwtVerify(token, new TextEncoder().encode(secret))
    return true
  } catch {
    return false
  }
}

function matches(pathname: string, paths: string[]): boolean {
  return paths.some(p => pathname === p || pathname.startsWith(p + '/'))
}

export async function middleware(request: NextRequest) {
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
  const valid = token ? await verifyToken(token) : false

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
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (!valid) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete(COOKIE_NAME)
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
