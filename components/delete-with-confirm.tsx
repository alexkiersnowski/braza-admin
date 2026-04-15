'use client'

import { useState } from 'react'
import { DotsThree, Trash } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Props {
  /** Label shown in the dropdown item and dialog title area */
  itemLabel: string
  /** Localised strings */
  labels: {
    deleteItem: string        // e.g. "Delete meal"
    confirmTitle: string      // e.g. "Delete meal?"
    confirmDescription: string // e.g. "This can't be undone."
    confirmButton: string     // e.g. "Delete"
    cancelButton: string      // e.g. "Cancel"
    deleting: string          // e.g. "Deleting…"
  }
  onConfirm: () => Promise<void>
}

export function DeleteWithConfirm({ itemLabel, labels, onConfirm }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleConfirm() {
    setIsDeleting(true)
    await onConfirm()
    setIsDeleting(false)
    setDialogOpen(false)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="cursor-pointer"
            aria-label="More options"
          >
            <DotsThree weight="bold" />
            <span className="sr-only">More options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={4}>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setDialogOpen(true)}
          >
            <Trash size={14} />
            {labels.deleteItem}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm" showClose={false}>
          <DialogHeader>
            <DialogTitle>{labels.confirmTitle}</DialogTitle>
            <DialogDescription>{labels.confirmDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isDeleting}
              className="cursor-pointer"
            >
              {labels.cancelButton}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirm}
              disabled={isDeleting}
              className="cursor-pointer"
            >
              {isDeleting ? labels.deleting : labels.confirmButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
