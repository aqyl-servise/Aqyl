import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/', '/reset-password']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/icon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const token =
    request.cookies.get('aqyl-token')?.value ||
    request.cookies.get('token')?.value ||
    request.cookies.get('auth_token')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
