import { NextRequest, NextResponse } from 'next/server'
import { signToken, COOKIE_NAME, COOKIE_MAX_AGE } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  const adminPassword = process.env.ADMIN_PASSWORD
  const secret = process.env.COOKIE_SECRET

  if (!adminPassword || !secret || password !== adminPassword) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }

  const token = await signToken(secret)

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
  return res
}
