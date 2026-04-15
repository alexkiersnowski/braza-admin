/** Trimmed search query from URL, or null if empty / missing. */
export function parseCustomerSearchQuery(
  raw: string | string[] | undefined,
): string | null {
  const s = Array.isArray(raw) ? raw[0] : raw
  const t = (s ?? '').trim()
  return t.length ? t : null
}

/**
 * Strip characters that break PostgREST `or()` / `ilike` filters.
 * (Commas split OR clauses; % and _ are LIKE wildcards.)
 */
export function sanitizeCustomerSearchForIlike(q: string): string {
  return q.replace(/[%,_]/g, '').trim()
}

/** Digits only — aligns with DB `whatsapp_search` (non-digits stripped). */
function digitsOnly(s: string): string {
  return s.replace(/\D/g, '')
}

/** Returns a %…% pattern safe for ilike, or null if nothing left after sanitize. */
export function customerSearchIlikePattern(q: string): string | null {
  const inner = sanitizeCustomerSearchForIlike(q)
  if (!inner.length) return null
  return `%${inner}%`
}

export function quotedIlikePattern(pattern: string): string {
  return `"${pattern.replace(/"/g, '')}"`
}

/**
 * PostgREST `.or()` for one token.
 * Phone matching uses `whatsapp_search` (digits-only column) so "+48572" matches "+48 572"
 * and we avoid sending raw `+` in filter strings (query-string decoding issues).
 */
export function customerSearchOrFilterForToken(sanitizedToken: string): string | null {
  const mainPattern = customerSearchIlikePattern(sanitizedToken)
  if (!mainPattern) return null
  const mainQuoted = quotedIlikePattern(mainPattern)

  const parts: string[] = [
    `first_name.ilike.${mainQuoted}`,
    `last_name.ilike.${mainQuoted}`,
  ]

  // whatsapp_number: skip when token contains '+' — '+' breaks in URL-encoded query strings
  if (!sanitizedToken.includes('+')) {
    parts.push(`whatsapp_number.ilike.${mainQuoted}`)
  }

  const digits = digitsOnly(sanitizedToken)
  if (digits.length > 0) {
    const digitPattern = customerSearchIlikePattern(digits)
    if (digitPattern) {
      parts.push(`whatsapp_search.ilike.${quotedIlikePattern(digitPattern)}`)
    }
  }

  return parts.join(',')
}

/**
 * Whitespace-separated search terms (e.g. "Alex Kiersnowski" → ["Alex", "Kiersnowski"]).
 * Each term must match at least one of the text columns; all terms must match (AND).
 */
export function customerSearchTokens(trimmedQuery: string): string[] {
  return trimmedQuery
    .split(/\s+/)
    .map(part => sanitizeCustomerSearchForIlike(part))
    .filter(part => part.length > 0)
}

type OrChain = { or: (filters: string) => OrChain }

/** PostgREST: each `.or()` is one disjunction; multiple `or` params are ANDed together. */
export function applyCustomerSearchTokenFilters<Q extends OrChain>(
  query: Q,
  tokens: string[],
): Q {
  let q = query
  for (const token of tokens) {
    const filter = customerSearchOrFilterForToken(token)
    if (!filter) continue
    q = q.or(filter) as Q
  }
  return q
}
