'use client'

import { Fragment } from 'react'
import { useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { totalPages } from '@/lib/pagination'

/** Matches [components/sidebar.tsx](components/sidebar.tsx) width; main column offset for fixed footer. */
const MAIN_COLUMN_OFFSET_LEFT = 'left-[220px]'

function buildListHref(
  pathname: string,
  page: number,
  pageQueryKey: string,
  preserveParams: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(preserveParams)) {
    if (v !== undefined && v !== '') params.set(k, v)
  }
  if (page > 1) params.set(pageQueryKey, String(page))
  const q = params.toString()
  return q ? `${pathname}?${q}` : pathname
}

export function TablePagination({
  page,
  pageSize,
  totalCount,
  preserveParams = {},
  pageQueryKey = 'page',
  pinToViewport = false,
}: {
  page: number
  pageSize: number
  totalCount: number
  /** Query params to keep when changing page (e.g. `{ week: selectedWeek }` on Orders). */
  preserveParams?: Record<string, string | undefined>
  /** URL param for the current page (default `page`; use e.g. `ingredients_page` on Meals). */
  pageQueryKey?: string
  /**
   * Fixed to the bottom of the viewport, aligned with the main column (sidebar offset).
   * Reserves in-flow space so table content is not covered.
   */
  pinToViewport?: boolean
}) {
  const t = useTranslations('common')
  const router = useRouter()
  const pathname = usePathname()
  const pages = totalPages(totalCount, pageSize)
  const canPrev = page > 1
  const canNext = page < pages && totalCount > 0

  const inner = (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-0.5 text-xs text-muted-foreground tabular-nums leading-none">
      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 h-7 w-7"
          disabled={!canPrev}
          onClick={() =>
            router.push(buildListHref(pathname, page - 1, pageQueryKey, preserveParams))
          }
          aria-label={t('previousPage')}
        >
          <CaretLeft size={14} />
        </Button>
        <span className="whitespace-nowrap text-center text-foreground">
          {t('pageOf', { page, total: pages })}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 h-7 w-7"
          disabled={!canNext}
          onClick={() =>
            router.push(buildListHref(pathname, page + 1, pageQueryKey, preserveParams))
          }
          aria-label={t('nextPage')}
        >
          <CaretRight size={14} />
        </Button>
      </div>
      <span>{t('rows', { count: pageSize })}</span>
      <span>{t('records', { count: totalCount })}</span>
    </div>
  )

  if (pinToViewport) {
    return (
      <Fragment>
        {/* In-flow gap so the last table rows are not covered by the fixed bar (~py-1 + h-7 control). */}
        <div className="h-9 shrink-0" aria-hidden />
        <div
          role="navigation"
          aria-label={t('tablePagination')}
          className={cn(
            MAIN_COLUMN_OFFSET_LEFT,
            'fixed bottom-0 right-0 z-30 flex items-center border-t border-border bg-white px-6 py-1',
          )}
        >
          {inner}
        </div>
      </Fragment>
    )
  }

  return (
    <div className="flex items-center mt-2 pt-2 border-t border-border">
      {inner}
    </div>
  )
}
