import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@/lib/supabase/server'
import { buildWarsawCommandContext, getNextMonday } from '@/lib/utils'
import { ORDER_DELIVERY_FEE_PLN } from '@/lib/calculations'
import { resolveCustomerForCommand } from '@/lib/command-resolve-customer'

type HistoryItem = { user: string; assistant: string }

function parseCommandHistory(raw: unknown): HistoryItem[] {
  if (!Array.isArray(raw)) return []
  const out: HistoryItem[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const user = typeof rec.user === 'string' ? rec.user : ''
    const assistant = typeof rec.assistant === 'string' ? rec.assistant : ''
    if (user && assistant) out.push({ user, assistant })
  }
  return out.slice(-10)
}

const anthropic = new Anthropic()

const SYSTEM_PROMPT = `You are an AI assistant for Braza Admin, a meal prep operations tool in Warsaw, Poland.

Your job is to parse natural language prompts and return a single JSON object (no markdown, no explanation — just JSON).

## Core behaviour
- Always respond with valid JSON — no markdown, no preamble, no explanation outside the JSON
- When required fields are missing: DO NOT return an error. Instead, return an error action with a friendly conversational question asking only for the missing field(s). The user can answer in the next message and you will have the full conversation history.
- When a customer reference is ambiguous, describe the ambiguity in the message and ask the user to clarify. The server will handle disambiguation and return an error message; your job is to ask so the user can reply with more detail.
- After every successful action, confirm what you did in the message field in plain English (e.g. "Created order #42 for Jan — 5 meals, delivery, week of 14 Apr").
- Never ask for a customer UUID — always use name and/or WhatsApp number for lookup.

## Required fields per action (ask conversationally if missing — never silently fail or create incomplete records)
- create_standard_customer: first_name, last_name, whatsapp_number, address
  → If address is missing: ask "What's their delivery address?"
  → If WhatsApp is missing: ask "What's their WhatsApp number?"
- create_order: customer identifier (name OR phone), meals_per_week, delivery_type
  → If meals_per_week missing: ask "How many meals per week? (2, 5, 10, or 14)"
  → If delivery_type missing: ask "Delivery or pickup?"
- open_performance_customer_sheet: first_name, last_name (other fields optional — can be filled in the sheet)
- edit_customer: customer identifier + at least one field to change
- edit_order: customer identifier + at least one field to change
- delete_order: customer identifier + order_number OR week_start (to identify which order)

## Customer schema
- first_name, last_name, whatsapp_number: string
- address: string | null
- allergies: string | null
- type: 'standard' | 'performance'
- sex: 'male' | 'female' | null (performance only)
- age: number | null (performance only)
- weight: number | null — current weight in kg (performance only)
- target_weight: number | null — target weight in kg (performance only)
- height: number | null — height in cm (performance only)
- activity_level: 'sedentary' | 'light' | 'moderate' | 'high' | 'very_high' | null (performance only)
- goal: 'lose_weight' | 'maintain' | 'gain_muscle' | null (performance only)

## Order schema
- customer_id: UUID — optional (server resolves from name/phone)
- customer_name: string — optional; full name for lookup
- whatsapp_number: string — optional; phone for lookup
- week_start: YYYY-MM-DD Monday
- meals_per_week: '2' | '5' | '10' | '14' exactly
- delivery_type: 'delivery' | 'pickup'
- delivery_address: string | null
- notes: string | null

## Business rules
- Standard customer: 180g portion, 40 PLN/meal — computed automatically, do NOT include in create_standard_customer
- Performance customer: NEVER auto-create — always open_performance_customer_sheet (needs macro calculator in UI)
- Delivery fee: +20 PLN flat on order total (not per meal)
- meals_per_week must be exactly one of: '2', '5', '10', '14'
- week_start: if the user specifies a date ("for the week starting Monday 21 April", "next week", "week of 28 April", etc.) convert it to the correct ISO Monday YYYY-MM-DD using the Warsaw calendar context provided. If not specified, use the "Default week_start" ISO date from the context block exactly.
- Performance signals (use open_performance_customer_sheet): macros, goals, calories, protein, portion size, weight, height, age, body stats
- edit_customer / edit_order: include ONLY fields being changed in "fields"
- Customer lookup: pass customer_name and/or whatsapp_number — never ask user for a UUID

## Response format

Create standard customer:
{"action":"create_standard_customer","data":{"first_name":"...","last_name":"...","whatsapp_number":"...","address":"...","allergies":"...","meal_exclusions":["meal name"]},"message":"..."}

Create order:
{"action":"create_order","data":{"customer_name":"...","whatsapp_number":"+48...","meals_per_week":"5","delivery_type":"delivery","delivery_address":"...","notes":"...","week_start":"YYYY-MM-DD"},"message":"..."}

Edit customer:
{"action":"edit_customer","data":{"customer_name":"...","whatsapp_number":"+48...","fields":{"address":"...","whatsapp_number":"..."}},"message":"..."}

Edit order:
{"action":"edit_order","data":{"customer_name":"...","whatsapp_number":"+48...","order_number":12,"week_start":"YYYY-MM-DD","fields":{"meals_per_week":"10","delivery_type":"pickup","notes":"..."}},"message":"..."}

Delete order:
{"action":"delete_order","data":{"customer_name":"...","whatsapp_number":"+48...","order_number":12},"message":"..."}

Open performance customer sheet:
{"action":"open_performance_customer_sheet","data":{"first_name":"...","last_name":"...","whatsapp_number":"...","address":"...","allergies":"...","sex":"female","age":28,"weight":65,"target_weight":60,"height":170,"activity_level":"moderate","goal":"lose_weight"},"message":"..."}

Ask for missing info (use instead of error when fields are missing — phrase as a natural question):
{"action":"error","message":"What's their WhatsApp number?"}

Hard error (use ONLY for genuinely unrecognisable commands — not for missing fields):
{"action":"error","message":"I didn't understand that. Try: 'Create a new customer: [name], [phone], [address]'"}`

type CommandResponse =
  | { action: 'create_standard_customer'; data: { first_name: string; last_name: string; whatsapp_number: string; address?: string; allergies?: string; meal_exclusions?: string[] }; message: string }
  | { action: 'create_order'; data: { customer_name?: string; whatsapp_number?: string; customer_id?: string; meals_per_week: string; delivery_type: 'delivery' | 'pickup'; delivery_address?: string; notes?: string; week_start?: string }; message: string }
  | { action: 'edit_customer'; data: { customer_name?: string; whatsapp_number?: string; customer_id?: string; fields: Record<string, unknown> }; message: string }
  | { action: 'edit_order'; data: { customer_name?: string; whatsapp_number?: string; customer_id?: string; order_number?: number; week_start?: string; fields: Record<string, unknown> }; message: string }
  | { action: 'delete_order'; data: { customer_name?: string; whatsapp_number?: string; customer_id?: string; order_number?: number; week_start?: string }; message: string }
  | { action: 'open_performance_customer_sheet'; data: Record<string, unknown>; message: string }
  | { action: 'error'; message: string }

export async function POST(req: NextRequest) {
  try {
    const { prompt, pageContext, history: rawHistory, locale = 'en' } = await req.json() as {
      prompt: string
      pageContext: { url: string; customerId?: string | null }
      history?: unknown
      locale?: string
    }

    const history = parseCommandHistory(rawHistory)
    const warsawContext = buildWarsawCommandContext()
    const pageContextBlock = `Current page: ${pageContext.url}${pageContext.customerId ? `\nCurrent customer ID: ${pageContext.customerId}` : ''}\n\n${warsawContext}`

    const messages: Anthropic.MessageParam[] = []
    for (const h of history) {
      messages.push({ role: 'user', content: h.user })
      messages.push({ role: 'assistant', content: h.assistant })
    }
    messages.push({
      role: 'user',
      content: `${pageContextBlock}\n\nUser prompt: ${prompt}`,
    })

    const localeInstruction = locale === 'pl'
      ? '\n\nRespond in Polish. All messages, confirmations, and questions must be in Polish.'
      : ''

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT + localeInstruction,
      messages,
    })

    let parsed: CommandResponse
    try {
      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      parsed = JSON.parse(text)
    } catch {
      return NextResponse.json({ action: 'error', message: 'Failed to parse AI response.' })
    }

    const supabase = createServerClient()

  // --- create_standard_customer ---
  if (parsed.action === 'create_standard_customer') {
    const { meal_exclusions, ...customerData } = parsed.data
    const { data: inserted, error } = await supabase
      .from('customers')
      .insert({
        first_name: customerData.first_name,
        last_name: customerData.last_name,
        whatsapp_number: customerData.whatsapp_number,
        address: customerData.address ?? null,
        allergies: customerData.allergies ?? null,
        type: 'standard',
        protein_portion_size_g: null,
        price_per_meal_pln: null,
        sex: null,
        age: null,
        weight: null,
        target_weight: null,
        height: null,
        activity_level: null,
        goal: null,
        protein_multiplier: null,
        daily_calories: null,
        daily_protein_g: null,
        braza_protein_g: null,
        protein_uplift: null,
      })
      .select('id')
      .single()

    if (error || !inserted) {
      return NextResponse.json({ action: 'error', message: `Failed to create customer: ${error?.message}` })
    }

    if (meal_exclusions && meal_exclusions.length > 0) {
      const { data: meals } = await supabase
        .from('meals')
        .select('id, name')
        .in('name', meal_exclusions)

      if (meals && meals.length > 0) {
        await supabase.from('customer_meal_exclusions').insert(
          meals.map((m: { id: string }) => ({ customer_id: inserted.id, meal_id: m.id }))
        )
      }
    }

    return NextResponse.json({ message: parsed.message })
  }

  // --- create_order ---
  if (parsed.action === 'create_order') {
    const d = parsed.data
    const resolved = await resolveCustomerForCommand(supabase, pageContext, {
      customer_id: d.customer_id,
      customer_name: d.customer_name,
      whatsapp_number: d.whatsapp_number,
    })
    if ('error' in resolved) {
      return NextResponse.json({ action: 'error', message: resolved.error })
    }
    const customerId = resolved.customerId

    const { data: customer } = await supabase
      .from('customers')
      .select('protein_portion_size_g, price_per_meal_pln, allergies')
      .eq('id', customerId)
      .single()

    const portionSizeG = customer?.protein_portion_size_g ?? 180
    const pricePerMealPln = customer?.price_per_meal_pln ?? 40
    const mealsNum = Number(d.meals_per_week)
    const deliveryFee = d.delivery_type === 'delivery' ? ORDER_DELIVERY_FEE_PLN : 0
    const pricePln = mealsNum * pricePerMealPln + deliveryFee
    const weekStart = d.week_start ?? getNextMonday()

    let notes = d.notes ?? null
    if (!notes && customer?.allergies) {
      notes = `ALLERGIES: ${customer.allergies}`
    }

    const { error } = await supabase.from('orders').insert({
      customer_id: customerId,
      week_start: weekStart,
      meals_per_week: d.meals_per_week,
      portion_size_g: portionSizeG,
      price_per_meal_pln: pricePerMealPln,
      price_pln: pricePln,
      delivery_type: d.delivery_type,
      delivery_address: d.delivery_address ?? null,
      notes,
      status: 'pending',
      payment_status: 'pending',
      payment_received_at: null,
      order_confirmed_at: null,
    })

    if (error) {
      return NextResponse.json({ action: 'error', message: `Failed to create order: ${error.message}` })
    }

    return NextResponse.json({ message: parsed.message })
  }

  // --- edit_customer ---
  if (parsed.action === 'edit_customer') {
    const d = parsed.data
    const resolved = await resolveCustomerForCommand(supabase, pageContext, {
      customer_id: d.customer_id,
      customer_name: d.customer_name,
      whatsapp_number: d.whatsapp_number,
    })
    if ('error' in resolved) {
      return NextResponse.json({ action: 'error', message: resolved.error })
    }
    const customerId = resolved.customerId

    const { error } = await supabase
      .from('customers')
      .update(d.fields)
      .eq('id', customerId)

    if (error) {
      return NextResponse.json({ action: 'error', message: `Failed to update customer: ${error.message}` })
    }

    return NextResponse.json({ message: parsed.message })
  }

  // --- edit_order ---
  if (parsed.action === 'edit_order') {
    const d = parsed.data
    const resolved = await resolveCustomerForCommand(supabase, pageContext, {
      customer_id: d.customer_id,
      customer_name: d.customer_name,
      whatsapp_number: d.whatsapp_number,
    })
    if ('error' in resolved) {
      return NextResponse.json({ action: 'error', message: resolved.error })
    }
    const customerId = resolved.customerId

    let orderQuery = supabase
      .from('orders')
      .select('id, meals_per_week, price_per_meal_pln, delivery_type')
      .eq('customer_id', customerId)

    if (d.order_number != null) {
      orderQuery = orderQuery.eq('order_number', d.order_number)
    } else if (d.week_start) {
      orderQuery = orderQuery.eq('week_start', d.week_start)
    } else {
      orderQuery = orderQuery.order('created_at', { ascending: false }).limit(1)
    }

    const { data: orders } = await orderQuery
    if (!orders || orders.length === 0) {
      return NextResponse.json({ action: 'error', message: 'No matching order found.' })
    }

    const order = orders[0]
    const updateFields = { ...d.fields } as Record<string, unknown>

    // Recalculate price_pln if pricing-affecting fields change
    const newMealsPerWeek = (updateFields.meals_per_week as string | undefined) ?? order.meals_per_week
    const newPricePerMeal = (updateFields.price_per_meal_pln as number | undefined) ?? order.price_per_meal_pln
    const newDeliveryType = (updateFields.delivery_type as string | undefined) ?? order.delivery_type

    if (updateFields.meals_per_week || updateFields.price_per_meal_pln || updateFields.delivery_type) {
      const deliveryFee = newDeliveryType === 'delivery' ? ORDER_DELIVERY_FEE_PLN : 0
      updateFields.price_pln = Number(newMealsPerWeek) * newPricePerMeal + deliveryFee
    }

    const { error } = await supabase
      .from('orders')
      .update(updateFields)
      .eq('id', order.id)

    if (error) {
      return NextResponse.json({ action: 'error', message: `Failed to update order: ${error.message}` })
    }

    return NextResponse.json({ message: parsed.message })
  }

  // --- delete_order ---
  if (parsed.action === 'delete_order') {
    const d = parsed.data
    const resolved = await resolveCustomerForCommand(supabase, pageContext, {
      customer_id: d.customer_id,
      customer_name: d.customer_name,
      whatsapp_number: d.whatsapp_number,
    })
    if ('error' in resolved) {
      return NextResponse.json({ action: 'error', message: resolved.error })
    }
    const customerId = resolved.customerId

    let orderQuery = supabase
      .from('orders')
      .select('id, order_number')
      .eq('customer_id', customerId)

    if (d.order_number != null) {
      orderQuery = orderQuery.eq('order_number', d.order_number)
    } else if (d.week_start) {
      orderQuery = orderQuery.eq('week_start', d.week_start)
    } else {
      orderQuery = orderQuery.order('created_at', { ascending: false }).limit(1)
    }

    const { data: orders } = await orderQuery
    if (!orders || orders.length === 0) {
      return NextResponse.json({ action: 'error', message: 'No matching order found.' })
    }

    const orderId = orders[0].id
    // Delete production rows first (FK), then the order
    await supabase.from('production').delete().eq('order_id', orderId)
    const { error: delError } = await supabase.from('orders').delete().eq('id', orderId)
    if (delError) {
      return NextResponse.json({ action: 'error', message: `Failed to delete order: ${delError.message}` })
    }

    return NextResponse.json({ message: parsed.message })
  }

  // --- open_performance_customer_sheet ---
  if (parsed.action === 'open_performance_customer_sheet') {
    return NextResponse.json({
      action: 'open_performance_customer_sheet',
      prefillData: parsed.data,
      navigateTo: '/customers',
      message: parsed.message,
    })
  }

    // --- error / fallback ---
    if (parsed.action === 'error') {
      return NextResponse.json({
        action: 'error',
        message: parsed.message ?? 'Unknown action.',
        errorKind: 'guidance',
      })
    }
    const unknown = parsed as { message?: string }
    return NextResponse.json({
      action: 'error',
      message: unknown.message ?? 'Could not interpret that command. Try rephrasing.',
      errorKind: 'blocking',
    })
  } catch (err) {
    console.error('[api/command]', err)
    return NextResponse.json(
      {
        action: 'error',
        message: 'Command failed. Please try again.',
      },
      { status: 500 },
    )
  }
}
