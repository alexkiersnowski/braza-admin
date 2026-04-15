import createMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { routing } from './i18n/routing'
import { verifyToken, COOKIE_NAME } from './lib/auth'

const intlMiddleware = createMiddleware(routing)

function isPublic(pathname: string): boolean {
  return pathname === '/login' || pathname.startsWith('/api/auth/')
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublic(pathname)) return NextResponse.next()

  const token = request.cookies.get(COOKIE_NAME)?.value
  const secret = process.env.COOKIE_SECRET

  if (!token || !secret || !(await verifyToken(token, secret))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Authenticated — for page routes also apply i18n locale handling
  if (!pathname.startsWith('/api/')) {
    return intlMiddleware(request)
  }

  return NextResponse.next()
}

export const config = {
  // Removed 'api' from the exclusion so API routes are also auth-checked
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
}
