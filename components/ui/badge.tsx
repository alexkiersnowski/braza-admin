import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-muted text-muted-foreground',
        performance: 'bg-purple-100 text-purple-700',
        standard: 'bg-green-100 text-green-700',
        paid: 'bg-green-100 text-green-700',
        confirmed: 'bg-green-100 text-green-700',
        pending: 'bg-amber-100 text-amber-700',
        cancelled: 'bg-red-100 text-red-700',
        delivery: 'bg-blue-100 text-blue-700',
        pickup: 'bg-gray-100 text-gray-700',
        protein: 'bg-purple-100 text-purple-700',
        base: 'bg-amber-100 text-amber-700',
        side: 'bg-green-100 text-green-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
