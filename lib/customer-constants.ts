import type { Customer } from '@/lib/types'

/** Standard-plan default when showing protein portion (kitchen). */
export const STANDARD_DEFAULT_PORTION_G = 180

export function formatProteinPortionForDisplay(c: Customer): string {
  if (c.type === 'standard') return `${STANDARD_DEFAULT_PORTION_G} g`
  if (c.protein_portion_size_g != null) return `${c.protein_portion_size_g} g`
  return '—'
}
