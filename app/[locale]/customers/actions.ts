'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@/lib/supabase/server'
import type { Customer } from '@/lib/types'

type PrefillResult = {
  first_name?: string | null
  last_name?: string | null
  whatsapp_number?: string | null
  type?: 'standard' | 'performance' | null
  address?: string | null
  allergies?: string | null
  sex?: 'male' | 'female' | null
  age?: number | null
  weight?: number | null
  target_weight?: number | null
  height?: number | null
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'high' | 'very_high' | null
  goal?: 'lose_weight' | 'maintain' | 'gain_muscle' | null
}

export async function prefillFromConversation(
  conversation: string
): Promise<{ data: PrefillResult | null; error: string | null }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { data: null, error: 'ANTHROPIC_API_KEY is not configured.' }
  }

  try {
    const client = new Anthropic()
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system:
        'You are a data extraction assistant. Extract customer information from WhatsApp conversations and return ONLY valid JSON with no explanation, markdown, or code blocks. If a field cannot be determined, set it to null.',
      messages: [
        {
          role: 'user',
          content: `Extract customer information from this WhatsApp conversation and return a JSON object with exactly these fields:
{
  "first_name": string | null,
  "last_name": string | null,
  "whatsapp_number": string | null,
  "type": "standard" | "performance" | null,
  "address": string | null,
  "allergies": string | null,
  "sex": "male" | "female" | null,
  "age": number | null,
  "weight": number | null,
  "target_weight": number | null,
  "height": number | null,
  "activity_level": "sedentary" | "light" | "moderate" | "high" | "very_high" | null,
  "goal": "lose_weight" | "maintain" | "gain_muscle" | null
}

Conversation:
${conversation}`,
        },
      ],
    })

    const block = message.content[0]
    if (block.type !== 'text') {
      return { data: null, error: 'Unexpected response format from AI.' }
    }

    const data = JSON.parse(block.text) as PrefillResult
    return { data, error: null }
  } catch (err) {
    return { data: null, error: (err as Error).message }
  }
}

export async function updateCustomer(
  id: string,
  data: Omit<Customer, 'id' | 'created_at' | 'excluded_meals'>
): Promise<{ error: string | null }> {
  const supabase = createServerClient()
  const { error } = await supabase.from('customers').update(data).eq('id', id)
  return { error: error?.message ?? null }
}

export async function createCustomer(
  data: Omit<Customer, 'id' | 'created_at' | 'excluded_meals'>
): Promise<{ id: string | null; error: string | null }> {
  const supabase = createServerClient()

  const { data: row, error } = await supabase
    .from('customers')
    .insert(data)
    .select('id')
    .single()

  if (error) return { id: null, error: error.message }
  return { id: row.id, error: null }
}

export async function saveCustomerMealExclusions(
  customerId: string,
  mealIds: string[]
): Promise<{ error: string | null }> {
  const supabase = createServerClient()
  await supabase.from('customer_meal_exclusions').delete().eq('customer_id', customerId)
  if (mealIds.length === 0) return { error: null }
  const { error } = await supabase
    .from('customer_meal_exclusions')
    .insert(mealIds.map(meal_id => ({ customer_id: customerId, meal_id })))
  return { error: error?.message ?? null }
}
