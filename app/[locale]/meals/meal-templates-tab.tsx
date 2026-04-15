'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { saveMealTemplate } from './actions'
import type { Meal, MealTemplate, MealsPerWeek } from '@/lib/types'

const MEALS_PER_WEEK_VALUES: MealsPerWeek[] = ['2', '5', '10', '14']

type CellKey = `${MealsPerWeek}:${number}`

interface Props {
  templates: MealTemplate[]
  meals: Meal[]
}

export function MealTemplatesTab({ templates, meals }: Props) {
  const t = useTranslations('meals')
  // Local state: keyed by "meals_per_week:position" → meal_id | null
  const [assignments, setAssignments] = useState<Record<CellKey, string | null>>(() => {
    const init: Record<CellKey, string | null> = {} as Record<CellKey, string | null>
    for (const mpw of MEALS_PER_WEEK_VALUES) {
      const count = Number(mpw)
      for (let pos = 1; pos <= count; pos++) {
        const key = `${mpw}:${pos}` as CellKey
        const tpl = templates.find(t => t.meals_per_week === mpw && t.position === pos)
        init[key] = tpl?.meal_id ?? null
      }
    }
    return init
  })
  const [saving, setSaving] = useState<Record<CellKey, boolean>>({} as Record<CellKey, boolean>)
  const [errors, setErrors] = useState<Record<CellKey, string>>({} as Record<CellKey, string>)

  async function handleChange(mpw: MealsPerWeek, pos: number, meal_id: string | null) {
    const key = `${mpw}:${pos}` as CellKey
    setAssignments(prev => ({ ...prev, [key]: meal_id }))
    setSaving(prev => ({ ...prev, [key]: true }))
    const { error } = await saveMealTemplate(mpw, pos, meal_id)
    setSaving(prev => ({ ...prev, [key]: false }))
    if (error) setErrors(prev => ({ ...prev, [key]: error }))
    else setErrors(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-4">
        {t('weeklyPlan.description')}
      </p>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {MEALS_PER_WEEK_VALUES.map(mpw => {
          const count = Number(mpw)
          return (
            <div key={mpw} className="border border-border rounded-xl overflow-hidden">
              <div className="bg-muted/50 border-b border-border px-4 py-2.5">
                <span className="text-xs font-medium text-muted-foreground">{t('weeklyPlan.header', { count })}</span>
              </div>
              <div className="divide-y divide-border">
                {Array.from({ length: count }, (_, i) => i + 1).map(pos => {
                  const key = `${mpw}:${pos}` as CellKey
                  const isSaving = saving[key]
                  const hasError = !!errors[key]
                  const value = assignments[key] ?? ''
                  return (
                    <div key={pos} className="flex items-center gap-2 px-3 py-2">
                      <span className="text-xs text-muted-foreground tabular-nums w-4 shrink-0">{pos}</span>
                      <select
                        value={value}
                        onChange={e => handleChange(mpw, pos, e.target.value || null)}
                        disabled={isSaving}
                        title={errors[key]}
                        className={[
                          'flex-1 min-w-0 rounded-md border px-2 py-1 text-xs bg-transparent',
                          'focus:outline-none focus:ring-2 focus:ring-ring',
                          isSaving ? 'opacity-50' : '',
                          hasError ? 'border-red-400' : 'border-input',
                        ].join(' ')}
                      >
                        <option value="">{t('weeklyPlan.noMeal')}</option>
                        {meals.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
