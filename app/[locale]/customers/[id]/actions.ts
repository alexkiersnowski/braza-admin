'use server'

import { createServerClient } from '@/lib/supabase/server'
import type { Customer } from '@/lib/types'

export async function updateCustomer(
  id: string,
  data: Customer
): Promise<{ error: string | null }> {
  const supabase = createServerClient()

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, created_at: _created_at, excluded_meals: _excl, ...updateData } = data

  const { error } = await supabase
    .from('customers')
    .update(updateData)
    .eq('id', id)

  if (error) return { error: error.message }
  return { error: null }
}
