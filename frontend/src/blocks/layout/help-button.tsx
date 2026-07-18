import { HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import { usePageHelpStore } from '@/store/page-help-store'

export function HelpButton() {
  const { title, body } = usePageHelpStore()

  if (!title) return null

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="ghost" size="icon" aria-label="Page help" />}>
        <HelpCircle className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
