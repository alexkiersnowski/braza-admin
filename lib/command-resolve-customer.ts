import type { SupabaseClient } from '@supabase/supabase-js'

export type CommandCustomerHints = {
  customer_id?: string
  customer_name?: string
  whatsapp_number?: string
}

export type CommandPageContext = { customerId?: string | null }

/** Digits only — aligns with DB `whatsapp_search`. */
export function whatsappDigitsOnly(s: string): string {
  return s.replace(/\D/g, '')
}

function formatCandidateRow(
  i: number,
  first: string,
  last: string,
  phone: string | null,
): string {
  const name = `${first} ${last}`.trim()
  const phonePart = phone ? ` — ${phone}` : ''
  return `${i}) ${name}${phonePart}`
}

function disambiguationLines(
  rows: { first_name: string; last_name: string; whatsapp_number: string | null }[],
): string {
  return rows
    .map((c, i) =>
      formatCandidateRow(i + 1, c.first_name, c.last_name, c.whatsapp_number),
    )
    .join('\n')
}

export async function resolveCustomerForCommand(
  supabase: SupabaseClient,
  pageContext: CommandPageContext,
  hints: CommandCustomerHints,
): Promise<{ customerId: string } | { error: string }> {
  const fromPayload = hints.customer_id?.trim()
  const fromPage = pageContext.customerId?.trim()
  if (fromPayload) {
    return { customerId: fromPayload }
  }
  if (fromPage) {
    return { customerId: fromPage }
  }

  const waRaw = hints.whatsapp_number?.trim()
  if (waRaw) {
    const digits = whatsappDigitsOnly(waRaw)
    if (digits.length >= 9) {
      const { data: exact } = await supabase
        .from('customers')
        .select('id, first_name, last_name, whatsapp_number')
        .eq('whatsapp_search', digits)

      if (exact?.length === 1) {
        return { customerId: exact[0].id }
      }
      if (exact && exact.length > 1) {
        return {
          error: `Multiple customers share that WhatsApp. Which one?\n${disambiguationLines(exact)}\n\nReply with the full number or name + phone from the list.`,
        }
      }
    }

    if (digits.length > 0) {
      const { data: partial } = await supabase
        .from('customers')
        .select('id, first_name, last_name, whatsapp_number')
        .ilike('whatsapp_search', `%${digits}%`)

      if (!partial?.length) {
        return {
          error: `No customer found with WhatsApp matching "${waRaw}". Try the full number or the customer's name.`,
        }
      }
      if (partial.length === 1) {
        return { customerId: partial[0].id }
      }
      return {
        error: `Multiple customers match that phone. Which one?\n${disambiguationLines(partial)}\n\nReply with the full WhatsApp number or pick from the list.`,
      }
    }
  }

  const nameRaw = hints.customer_name?.trim()
  if (nameRaw) {
    const nameParts = nameRaw.split(/\s+/)
    const firstName = nameParts[0]
    const lastName = nameParts.slice(1).join(' ')
    const { data: matches } = await supabase
      .from('customers')
      .select('id, first_name, last_name, whatsapp_number')
      .ilike('first_name', `%${firstName}%`)
      .ilike('last_name', lastName ? `%${lastName}%` : '%')

    if (!matches?.length) {
      return {
        error: `No customer found matching "${nameRaw}". Check spelling or provide a WhatsApp number.`,
      }
    }
    if (matches.length > 1) {
      return {
        error: `Multiple customers match "${nameRaw}". Which one?\n${disambiguationLines(matches)}\n\nReply with the full WhatsApp number or pick from the list.`,
      }
    }
    return { customerId: matches[0].id }
  }

  return {
    error:
      'Could not identify the customer. Provide a name and/or WhatsApp number, or open a customer page first.',
  }
}
