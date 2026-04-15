'use client'

import { useState, FormEvent } from 'react'
import { Button } from '@/components/ui/button'

type Lang = 'en' | 'pl'

const strings = {
  en: {
    heading: 'Welcome back',
    subheading: 'Enter the admin password to continue',
    placeholder: 'Enter password…',
    login: 'Login',
    loggingIn: 'Logging in…',
    incorrect: 'Incorrect password',
    error: 'Something went wrong. Please try again.',
  },
  pl: {
    heading: 'Witaj ponownie',
    subheading: 'Wprowadź hasło administratora, aby kontynuować',
    placeholder: 'Wprowadź hasło…',
    login: 'Zaloguj',
    loggingIn: 'Logowanie…',
    incorrect: 'Nieprawidłowe hasło',
    error: 'Coś poszło nie tak. Spróbuj ponownie.',
  },
}

function readLocaleCookie(): Lang {
  if (typeof document === 'undefined') return 'en'
  const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/)
  return match?.[1] === 'pl' ? 'pl' : 'en'
}

export default function LoginPage() {
  const [lang, setLang] = useState<Lang>(readLocaleCookie)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const s = strings[lang]

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        window.location.href = lang === 'pl' ? '/pl' : '/'
      } else {
        setError(s.incorrect)
      }
    } catch {
      setError(s.error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen">
      {/* Left — form panel */}
      <div className="relative flex w-full flex-col px-10 py-8 md:w-[60%]">
        {/* Top bar: wordmark + language toggle */}
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold tracking-tight text-gray-900">Braza</span>
          <div className="flex items-center gap-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                document.cookie = 'NEXT_LOCALE=en; path=/; max-age=31536000; SameSite=Lax'
                setLang('en')
              }}
              className={`cursor-pointer ${lang === 'en' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
            >
              EN
            </button>
            <span className="text-gray-300">/</span>
            <button
              type="button"
              onClick={() => {
                document.cookie = 'NEXT_LOCALE=pl; path=/; max-age=31536000; SameSite=Lax'
                setLang('pl')
              }}
              className={`cursor-pointer ${lang === 'pl' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
            >
              PL
            </button>
          </div>
        </div>

        {/* Centred form */}
        <div className="flex flex-1 items-center justify-center">
          <form onSubmit={handleSubmit} className="w-full max-w-[420px]">
            <h1 className="mb-1 text-2xl font-semibold text-gray-900">{s.heading}</h1>
            <p className="mb-8 text-sm text-gray-500">{s.subheading}</p>

            <input
              id="password"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={s.placeholder}
              aria-label="Password"
              required
              className="mb-4 h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
            />

            {error && (
              <p className="mb-4 text-xs text-red-600">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading || !password}>
              {loading ? s.loggingIn : s.login}
            </Button>
          </form>
        </div>
      </div>

      {/* Right — image panel */}
      <div className="hidden md:block md:w-[40%]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1708388064424-e7673d7e5959?auto=format&fit=crop&w=1600&q=80"
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
    </div>
  )
}
