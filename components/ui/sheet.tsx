'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const Sheet = DialogPrimitive.Root
const SheetTrigger = DialogPrimitive.Trigger
const SheetClose = DialogPrimitive.Close
const SheetPortal = DialogPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    className={cn(
      'fixed inset-0 z-50 bg-black/50',
      className,
    )}
    {...props}
    ref={ref}
  />
))
SheetOverlay.displayName = 'SheetOverlay'

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    side?: 'top' | 'right' | 'bottom' | 'left'
  }
>(({ side = 'right', className, children, style: customStyle, ...props }, ref) => {
  /* WebKit: bounded flex height for column scroll; dvh matches viewport under dialog scroll-lock */
  const baseStyle: React.CSSProperties | undefined =
    side === 'right'
      ? {
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: '36rem',
          maxHeight: '100dvh',
          minHeight: 0,
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: 'var(--background)',
          boxShadow: 'none',
          borderLeft: '1px solid var(--border)',
        }
      : side === 'left'
        ? {
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            width: '100%',
            maxWidth: '36rem',
            maxHeight: '100dvh',
            minHeight: 0,
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backgroundColor: 'var(--background)',
            boxShadow: 'none',
            borderRight: '1px solid var(--border)',
          }
        : undefined
  return (
  <SheetPortal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      aria-describedby={undefined}
      style={{ ...baseStyle, ...customStyle }}
      className={cn(className)}
      {...props}
    >
      {children}
      <DialogPrimitive.Close asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 cursor-pointer"
          aria-label="Close"
        >
          <X />
          <span className="sr-only">Close</span>
        </Button>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </SheetPortal>
  )
})
SheetContent.displayName = 'SheetContent'

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex shrink-0 flex-col gap-1.5 p-6 pb-0', className)} {...props} />
)
SheetHeader.displayName = 'SheetHeader'

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-xl font-semibold text-foreground', className)}
    {...props}
  />
))
SheetTitle.displayName = 'SheetTitle'

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
}
