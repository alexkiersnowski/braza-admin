'use client'

import { useEffect, useState, useTransition, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  MEALS_INGREDIENTS_PAGE_PARAM,
  type MealsNameSearchParamKey,
} from '@/lib/meals-search'

const iconBoxClass =
  'pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground'

function buildMealsSearchHref(
  searchParams: URLSearchParams,
  paramKey: MealsNameSearchParamKey,
  q: string,
): string {
  const params = new URLSearchParams(searchParams.toString())
  const t = q.trim()
  if (t) params.set(paramKey, t)
  else params.delete(paramKey)
  if (paramKey === 'ingredients_q') params.delete(MEALS_INGREDIENTS_PAGE_PARAM)
  const qs = params.toString()
  return qs ? `/meals?${qs}` : '/meals'
}

/**
 * Server-driven name search: updates URL (same param keys the page reads).
 * The `<form>` uses `w-1/3 min-w-0` like Customers/Orders (not `display: contents`,
 * which breaks percentage widths when the field sits in a flex row).
 */
export function MealsTabNameSearch({
  paramKey,
  defaultQuery,
  placeholder,
  countLabel,
}: {
  paramKey: MealsNameSearchParamKey
  defaultQuery: string
  placeholder: string
  countLabel: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const qFromUrl = searchParams.get(paramKey) ?? ''
  const [value, setValue] = useState(defaultQuery)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setValue(qFromUrl)
  }, [qFromUrl])

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const q = value.trim()
    startTransition(() => {
      router.push(buildMealsSearchHref(searchParams, paramKey, q))
    })
  }

  return (
    <>
      <form
        className="w-1/3 min-w-0 shrink-0"
        onSubmit={handleSubmit}
        action="/meals"
        method="get"
      >
        <div className="relative w-full min-w-0">
          <Search className={iconBoxClass} aria-hidden />
          <Input
            name={paramKey}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={placeholder}
            type="search"
            autoComplete="off"
            disabled={isPending}
            aria-busy={isPending}
            className={cn(
              'h-8 bg-background py-0 pl-8 pr-2.5 text-xs shadow-none [appearance:textfield] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden',
            )}
            aria-label={placeholder}
          />
        </div>
      </form>
      <span className="ml-3 shrink-0 whitespace-nowrap text-[12px] text-muted-foreground tabular-nums">
        {countLabel}
      </span>
    </>
  )
}
