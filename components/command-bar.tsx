'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { Sparkle, ArrowRight, Command as CommandKeyIcon } from '@phosphor-icons/react'
import { Spinner } from '@/components/ui/spinner'

const MAX_HISTORY_TURNS = 10

type Turn = {
  id: string
  userText: string
  assistantText?: string
  error?: boolean
  pending: boolean
}

export function CommandBar() {
  const t = useTranslations('commandBar')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const transcriptRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const CHIPS = [
    { label: t('chips.newCustomer'), prompt: 'Create a new customer: ' },
    { label: t('chips.addOrder'), prompt: 'Add order for ' },
    { label: t('chips.editCustomer'), prompt: 'Update customer ' },
    { label: t('chips.editOrder'), prompt: 'Edit order for ' },
  ]

  const pending = turns.some(t => t.pending)

  // Clear state when bar closes
  useEffect(() => {
    if (!open) {
      setPrompt('')
      setTurns([])
    }
  }, [open])

  // Auto-scroll transcript to bottom on new turns
  useLayoutEffect(() => {
    const el = transcriptRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [turns])

  // Refocus input after each turn completes so user can keep typing
  useEffect(() => {
    if (!pending && open) {
      inputRef.current?.focus()
    }
  }, [pending, open])

  // Global keyboard shortcut
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(v => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Close command bar when a sheet has opened (sheet open = manual edit mode)
  useEffect(() => {
    function handler() { setOpen(false) }
    window.addEventListener('braza:cmd-close', handler)
    return () => window.removeEventListener('braza:cmd-close', handler)
  }, [])

  function handleClose() {
    setOpen(false)
  }

  function patchTurn(
    id: string,
    patch: Pick<Turn, 'pending'> & Partial<Pick<Turn, 'assistantText' | 'error'>>
  ) {
    setTurns(prev =>
      prev.map(turn => (turn.id === id ? { ...turn, ...patch } : turn))
    )
  }

  async function handleSubmit() {
    if (!prompt.trim() || pending) return
    const trimmed = prompt.trim()
    const customerId = pathname.match(/\/customers\/([^/]+)/)?.[1] ?? null
    const turnId = crypto.randomUUID()

    const history = turns
      .filter(turn => !turn.pending && turn.assistantText != null)
      .map(turn => ({ user: turn.userText, assistant: turn.assistantText! }))
      .slice(-MAX_HISTORY_TURNS)

    setPrompt('')
    setTurns(prev => [...prev, { id: turnId, userText: trimmed, pending: true }])

    try {
      const res = await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: trimmed,
          pageContext: { url: pathname, customerId },
          history,
          locale,
        }),
      })

      const rawText = await res.text()
      let data: {
        action?: string
        message?: string
        navigateTo?: string
        prefillData?: unknown
        errorKind?: 'guidance' | 'blocking'
      } = {}

      try {
        if (rawText) data = JSON.parse(rawText) as typeof data
      } catch {
        patchTurn(turnId, {
          pending: false,
          assistantText: res.ok
            ? t('parseError')
            : `Server error (${res.status}). Please try again.`,
          error: true,
        })
        return
      }

      const fail = (msg: string, soft = false) =>
        patchTurn(turnId, { pending: false, assistantText: msg, error: !soft })

      if (!res.ok) {
        fail(
          typeof data.message === 'string'
            ? data.message
            : `Request failed (${res.status}).`,
        )
        return
      }

      if (data.action === 'error') {
        // guidance = soft question (no red), blocking = hard failure (red)
        fail(
          typeof data.message === 'string' ? data.message : t('genericError'),
          data.errorKind === 'guidance',
        )
        return
      }

      if (data.navigateTo) {
        // open_performance_customer_sheet — two cases:
        // 1. Already on /customers → dispatch event so mounted sheet opens immediately
        // 2. On another page → navigate; sheet mounts fresh and reads sessionStorage
        // Bar stays open in both cases so conversation context is preserved.

        // Always write sessionStorage as fallback for cross-page navigation
        sessionStorage.setItem('braza_cmd_open_sheet', 'add_performance_customer')
        sessionStorage.setItem('braza_cmd_prefill', JSON.stringify(data.prefillData ?? {}))

        patchTurn(turnId, {
          pending: false,
          assistantText:
            typeof data.message === 'string' ? data.message : t('openingSheet'),
          error: false,
        })

        if (pathname === data.navigateTo) {
          // Already on the target page — dispatch custom event so the mounted component opens
          // then close the bar (sheet open signals manual editing)
          window.dispatchEvent(
            new CustomEvent('braza:open-perf-sheet', {
              detail: { prefill: data.prefillData ?? {} },
            })
          )
          // Clear the sessionStorage signal since the event handled it
          sessionStorage.removeItem('braza_cmd_open_sheet')
          sessionStorage.removeItem('braza_cmd_prefill')
          setTimeout(() => handleClose(), 400)
        } else {
          // Navigate — sheet mounts fresh and reads sessionStorage, then fires braza:cmd-close
          router.push(data.navigateTo as Parameters<typeof router.push>[0])
        }
        return
      }

      patchTurn(turnId, {
        pending: false,
        assistantText: typeof data.message === 'string' ? data.message : t('done'),
        error: false,
      })
      router.refresh()
    } catch {
      patchTurn(turnId, {
        pending: false,
        assistantText: t('networkError'),
        error: true,
      })
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white rounded-full shadow-lg border border-border px-4 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <Sparkle size={18} weight="fill" className="text-foreground" />
        <span className="inline-flex items-center gap-0 text-tertiary-foreground" aria-label="Command K">
          <CommandKeyIcon size={16} weight="regular" className="shrink-0" aria-hidden />
          <span className="text-[16px] font-normal leading-none">K</span>
        </span>
      </button>
    )
  }

  return (
    <>
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex max-h-[min(70vh,560px)] w-[720px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl">
        {/* Input row */}
        <div className="flex shrink-0 items-center gap-3 px-4 py-3.5">
          <Sparkle size={18} className="shrink-0 text-foreground" weight="fill" />
          <input
            ref={inputRef}
            autoFocus
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder={t('placeholder')}
            className="flex-1 bg-transparent text-[16px] outline-none placeholder:text-tertiary-foreground"
          />
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim() || pending}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-foreground text-background disabled:opacity-30 cursor-pointer disabled:cursor-default"
          >
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Transcript — only mounted after first submit so the panel stays compact until then */}
        {turns.length > 0 && (
          <div
            ref={transcriptRef}
            className="min-h-0 flex-1 overflow-y-auto border-t border-border px-4 py-3"
          >
            <ul className="space-y-4">
              {turns.map(turn => (
                <li key={turn.id} className="space-y-1.5">
                  <p className="text-xs text-tertiary-foreground">{turn.userText}</p>
                  {turn.pending ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Spinner
                        className="size-3.5 shrink-0 text-muted-foreground animate-[spin_0.4s_linear_infinite]"
                        aria-hidden
                      />
                      <span>{t('thinking')}</span>
                    </div>
                  ) : turn.assistantText != null ? (
                    <p
                      className={`text-sm ${turn.error ? 'text-red-600' : 'text-foreground font-medium'}`}
                    >
                      {turn.assistantText}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer: chips + cancel — always visible */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border px-4 py-3">
          {CHIPS.map(c => (
            <button
              key={c.label}
              type="button"
              onClick={() => setPrompt(c.prompt)}
              disabled={pending}
              className="cursor-pointer rounded-full bg-muted px-3 py-1.5 text-xs hover:bg-gray-200 disabled:pointer-events-none disabled:opacity-60"
            >
              {c.label}
            </button>
          ))}
          <div className="flex-1" />
          <button
            type="button"
            onClick={handleClose}
            className="cursor-pointer text-xs text-muted-foreground hover:text-foreground"
          >
            {t('cancel')}
          </button>
          <kbd className="ml-1 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">esc</kbd>
        </div>
      </div>
    </>
  )
}
