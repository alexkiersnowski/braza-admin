'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Gear, Check } from '@phosphor-icons/react'

export function SettingsPopover() {
  const t = useTranslations('settings')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  function switchLocale(next: string) {
    router.replace(pathname, { locale: next })
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="w-full cursor-pointer pointer-events-auto justify-start gap-2 h-9 px-3 text-xs font-normal text-muted-foreground"
        >
          <Gear size={14} className="shrink-0" />
          {t('title')}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={6}
        className="w-48 p-1 pointer-events-auto"
      >
        <div className="px-3 pt-2 pb-0.5 text-xs text-muted-foreground">{t('language')}</div>
        <div className="flex flex-col p-0.5">
          {(['en', 'pl'] as const).map(l => (
            <button
              key={l}
              type="button"
              onClick={() => switchLocale(l)}
              className="flex w-full cursor-pointer pointer-events-auto items-center justify-between px-3 py-2 text-xs rounded hover:bg-muted"
            >
              <span>{l === 'en' ? t('english') : t('polish')}</span>
              {locale === l && <Check size={12} className="text-primary shrink-0" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
