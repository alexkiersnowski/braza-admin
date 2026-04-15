'use client';

import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { Users, ClipboardText, ChefHat, ForkKnife, SignOut } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { SettingsPopover } from '@/components/settings-popover'
import { cn } from '@/lib/utils';

export default function Sidebar() {
  const t = useTranslations('nav')
  const pathname = usePathname();

  const navItems = [
    { href: '/customers' as const, label: t('customers'), Icon: Users },
    { href: '/orders' as const, label: t('orders'), Icon: ClipboardText },
    { href: '/production' as const, label: t('production'), Icon: ChefHat },
    { href: '/meals' as const, label: t('meals'), Icon: ForkKnife },
  ]

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-[220px] bg-white flex flex-col"
      style={{ borderRight: '1px solid #e5e7eb' }}
    >
      {/* Wordmark */}
      <div className="px-5 pt-6 pb-4">
        <span className="text-lg font-semibold tracking-tight text-gray-900">
          Braza
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col">
        <ul className="space-y-0.5 flex-1">
          {navItems.map(({ href, label, Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <li key={href}>
                <Button
                  asChild
                  variant="ghost"
                  className={cn(
                    'w-full justify-start gap-2 h-9 px-3 text-xs font-normal text-muted-foreground',
                    isActive && 'bg-accent text-accent-foreground font-medium'
                  )}
                >
                  <Link href={href}>
                    <Icon
                      size={14}
                      weight="regular"
                      className="shrink-0"
                    />
                    {label}
                  </Link>
                </Button>
              </li>
            );
          })}
        </ul>

        {/* Settings + logout at bottom */}
        <div className="mt-auto pt-2 border-t border-border">
          <SettingsPopover />
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 h-9 px-3 text-xs font-normal text-muted-foreground cursor-pointer"
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' })
              window.location.href = '/login'
            }}
          >
            <SignOut size={14} className="shrink-0" />
            {t('logout')}
          </Button>
        </div>
      </nav>
    </aside>
  );
}
