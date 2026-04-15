'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatProteinPortionForDisplay } from '@/lib/customer-constants'
import { formatMultilineTextForDisplay } from '@/lib/utils'
import type { Customer } from '@/lib/types'

function formatExclusions(c: Customer, noneLabel: string): string {
  const list = c.excluded_meals?.map(m => m.name) ?? []
  return list.length ? list.join(', ') : noneLabel
}

export function CustomersTable({ customers }: { customers: Customer[] }) {
  const t = useTranslations('customers')
  const tCommon = useTranslations('common')
  const router = useRouter()

  if (customers.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-8 text-center">
        {t('table.empty')}
      </p>
    )
  }

  return (
    <Table className="table-fixed text-xs">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-[19%] max-w-0 min-w-0 truncate">{t('table.name')}</TableHead>
          <TableHead className="w-[17%] max-w-0 min-w-0 truncate">{t('table.phone')}</TableHead>
          <TableHead className="w-[10%] max-w-0 min-w-0 truncate">{t('table.type')}</TableHead>
          <TableHead className="w-[15%] max-w-0 min-w-0 truncate">{t('table.exclusions')}</TableHead>
          <TableHead className="w-[15%] max-w-0 min-w-0 truncate">{t('table.portion')}</TableHead>
          <TableHead className="w-[24%] max-w-0 min-w-0 truncate">{t('table.address')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map(c => (
          <TableRow
            key={c.id}
            className="cursor-pointer"
            onClick={() => router.push(`/customers/${c.id}`)}
          >
            <TableCell className="max-w-0 min-w-0 truncate font-medium text-primary">
              <span className="block min-w-0 truncate">
                {c.first_name} {c.last_name}
              </span>
            </TableCell>
            <TableCell className="max-w-0 min-w-0 truncate tabular-nums text-primary">
              <span className="block min-w-0 truncate">
                {formatMultilineTextForDisplay(c.whatsapp_number) ?? '—'}
              </span>
            </TableCell>
            <TableCell className="max-w-0 min-w-0">
              <span className="flex min-w-0">
                <Badge
                  variant={c.type}
                  className="min-w-0 max-w-full justify-center truncate"
                >
                  {t(`type.${c.type}`)}
                </Badge>
              </span>
            </TableCell>
            <TableCell className="max-w-0 min-w-0 truncate text-primary">
              <span className="block min-w-0 truncate">{formatExclusions(c, tCommon('none'))}</span>
            </TableCell>
            <TableCell className="max-w-0 min-w-0 truncate tabular-nums text-primary">
              <span className="block min-w-0 truncate">
                {formatProteinPortionForDisplay(c)}
              </span>
            </TableCell>
            <TableCell className="max-w-0 min-w-0 truncate text-primary">
              <span className="block min-w-0 truncate">
                {formatMultilineTextForDisplay(c.address) ?? '—'}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
