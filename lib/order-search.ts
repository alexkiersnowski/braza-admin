import type { SupabaseClient } from '@supabase/supabase-js'
import {
  customerSearchIlikePattern,
  customerSearchOrFilterForToken,
  quotedIlikePattern,
} from '@/lib/customer-search'

type OrChain = { or: (filters: string) => OrChain }

/**
 * One search token on `orders`: matches `order_number_search` (substring ilike) and/or customer_id
 * from customer search — unless the token starts with `#`, in which case **only** order number matches (`#` is stripped for the numeric/text match, e.g. "#8" → order 8, not customers).
 */
export async function ordersOrFilterForToken(
  supabase: SupabaseClient,
  token: string,
): Promise<string | null> {
  const orderOnly = token.trim().startsWith('#')
  const parts: string[] = []

  const orderIlikePattern = customerSearchIlikePattern(
    token.replace(/#/g, '').trim(),
  )
  if (orderIlikePattern) {
    parts.push(
      `order_number_search.ilike.${quotedIlikePattern(orderIlikePattern)}`,
    )
  }

  if (!orderOnly) {
    const custFilter = customerSearchOrFilterForToken(token)
    if (custFilter) {
      const { data } = await supabase
        .from('customers')
        .select('id')
        .or(custFilter)
        .limit(10_000)
      const ids = data?.map(r => r.id) ?? []
      if (ids.length > 0) {
        parts.push(`customer_id.in.(${ids.join(',')})`)
      }
    }
  }

  if (parts.length === 0) return null
  return parts.join(',')
}

/** PostgREST `.or()` chains for each token; multiple `or` params are ANDed. */
export async function getOrdersSearchOrClauses(
  supabase: SupabaseClient,
  tokens: string[],
): Promise<string[] | null> {
  const clauses = await Promise.all(tokens.map(t => ordersOrFilterForToken(supabase, t)))
  if (clauses.some(c => c === null)) return null
  return clauses as string[]
}

export function applyOrdersSearchOrClauses<Q extends OrChain>(
  query: Q,
  clauses: string[],
): Q {
  let q = query
  for (const c of clauses) {
    q = q.or(c) as Q
  }
  return q
}
