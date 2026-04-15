'use client'

import { useEffect, useState, useTransition, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import { X } from '@phosphor-icons/react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

const iconBoxClass =
  'pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground'

export function CustomersSearch({ defaultQuery }: { defaultQuery: string }) {
  const t = useTranslations('customers')
  const router = useRouter()
  const searchParams = useSearchParams()
  const qFromUrl = searchParams.get('q') ?? ''
  const [value, setValue] = useState(defaultQuery)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setValue(qFromUrl)
  }, [qFromUrl])

  const showClear = value.length > 0 && !isPending

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const q = value.trim()
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    const href = params.toString() ? `/customers?${params.toString()}` : '/customers'
    startTransition(() => {
      router.push(href)
    })
  }

  function handleClear() {
    setValue('')
    startTransition(() => {
      router.push('/customers')
    })
  }

  return (
    <form
      action="/customers"
      method="get"
      className="mb-4 w-1/3 min-w-0"
      onSubmit={handleSubmit}
    >
      <div className="relative w-full min-w-0">
        {isPending ? (
          <Spinner className={iconBoxClass} />
        ) : (
          <Search className={iconBoxClass} aria-hidden />
        )}
        <Input
          className={cn(
            'h-8 bg-background py-0 pl-8 pr-2.5 text-xs shadow-none [appearance:textfield] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden',
            showClear && 'pr-7',
          )}
          id="customers-search"
          name="q"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={t('search.placeholder')}
          type="search"
          autoComplete="off"
          disabled={isPending}
          aria-busy={isPending}
          aria-label={t('search.ariaLabel')}
        />
        {showClear ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="pointer-events-auto absolute top-1/2 right-0.5 z-10 h-6 w-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={handleClear}
            aria-label="Clear search"
          >
            <X className="pointer-events-auto h-3.5 w-3.5" weight="bold" />
          </Button>
        ) : null}
      </div>
    </form>
  )
}
