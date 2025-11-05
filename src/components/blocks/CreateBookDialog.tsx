import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CreateBookDialogProps {
  onOpen?: () => void;
  onClose?: () => void;
  onSubmit?: () => void;
}

export function CreateBookDialog({
  onOpen,
  onClose,
  onSubmit,
}: CreateBookDialogProps) {
  return (
    <Dialog onOpenChange={(open) => (open ? onOpen?.() : onClose?.())}>
      <DialogTrigger asChild>
        <Button>Create Novel Project</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Create a New Novel</DialogTitle>
          <DialogDescription>
            Fill in the basic information to create your novel project.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* 小说标题 */}
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="Enter novel title"
              required
            />
          </div>

          {/* 作者 */}
          <div className="grid gap-2">
            <Label htmlFor="author">Author</Label>
            <Input
              id="author"
              name="author"
              placeholder="Your name or pen name"
              required
            />
          </div>

          {/* 描述 */}
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="A short summary of your novel"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="button" onClick={onSubmit}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
