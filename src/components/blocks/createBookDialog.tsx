import { useForm } from "@tanstack/react-form";
import React from "react";
import ReactDOM from "react-dom/client";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// ✅ 验证规则（Zod）
const bookSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Title must be at least 2 characters long")
    .max(100, "Title cannot exceed 100 characters")
    .regex(
      /[a-zA-Z0-9\u4e00-\u9fa5]+/,
      "Title must contain at least one letter or Chinese character",
    ),
  author: z
    .string()
    .trim()
    .min(2, "Author name must be at least 2 characters long")
    .max(50, "Author name cannot exceed 50 characters")
    .regex(/^[\p{L}\p{M}\s.'-]+$/u, "Author name contains invalid characters"),
  description: z.string().trim().max(500, "Description too long").optional(),
});

export interface CreateBookDialogProps {
  open?: boolean; // 由外部控制 Dialog 开启状态
  loading?: boolean; // 外部传入是否正在提交（例如数据库写入中）
  onOpen?: () => void;
  onClose?: () => void;
  onSubmit?: (data: z.infer<typeof bookSchema>) => Promise<void> | void;
}

// Imperative API: open the CreateBookDialog as a function and return the submitted values
export function openCreateBookDialog(): Promise<z.infer<typeof bookSchema> | null> {
  return new Promise((resolve) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = ReactDOM.createRoot(host);

    const handleClose = () => {
      // Unmount and cleanup
      setTimeout(() => {
        try { root.unmount(); } catch {}
        host.remove();
      }, 0);
    };

    const onSubmit = async (data: z.infer<typeof bookSchema>) => {
      resolve(data);
      handleClose();
    };

    const onClose = () => {
      resolve(null);
      handleClose();
    };

    root.render(
      <React.StrictMode>
        <CreateBookDialog open onClose={onClose} onSubmit={onSubmit} />
      </React.StrictMode>
    );
  });
}

export function CreateBookDialog({
  open,
  loading,
  onOpen,
  onClose,
  onSubmit,
}: CreateBookDialogProps) {
  const form = useForm({
    defaultValues: {
      title: "",
      author: "",
      description: "",
    },
    onSubmit: async ({ value }) => {
      const result = bookSchema.safeParse(value);
      if (!result.success) {
        const msg = result.error.issues[0]?.message ?? "Invalid input";
        toast.error(msg);
        return;
      }
      try {
        await onSubmit?.(result.data);
        toast.success(`✅ Created book "${result.data.title}" successfully!`);
      } catch (err) {
        console.error(err);
        toast.error("❌ Failed to create project.");
      }
    },
  });

  // ✅ 辅助函数：抽离单字段 onBlur 校验
  const validateField = (schema: z.ZodString) => (value: string) => {
    const result = schema.safeParse(value);
    return result.success ? undefined : result.error.issues[0]?.message;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => (isOpen ? onOpen?.() : onClose?.())}
    >
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Create a New Novel</DialogTitle>
          <DialogDescription>
            Fill in the basic information to create your novel project.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="grid gap-4 py-2"
        >
          {/* Title */}
          <form.Field
            name="title"
            validators={{
              onBlur: ({ value }) =>
                validateField(bookSchema.shape.title)(value),
            }}
          >
            {(field) => (
              <div className="grid gap-2">
                <Label htmlFor={field.name}>Title</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Enter novel title"
                  disabled={loading}
                />
                {field.state.meta.isTouched &&
                  field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-red-500">
                      {field.state.meta.errors.join(", ")}
                    </p>
                  )}
              </div>
            )}
          </form.Field>

          {/* Author */}
          <form.Field
            name="author"
            validators={{
              onBlur: ({ value }) =>
                validateField(bookSchema.shape.author)(value),
            }}
          >
            {(field) => (
              <div className="grid gap-2">
                <Label htmlFor={field.name}>Author</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Your name or pen name"
                  disabled={loading}
                />
                {field.state.meta.isTouched &&
                  field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-red-500">
                      {field.state.meta.errors.join(", ")}
                    </p>
                  )}
              </div>
            )}
          </form.Field>

          {/* Description */}
          <form.Field name="description">
            {(field) => (
              <div className="grid gap-2">
                <Label htmlFor={field.name}>Description</Label>
                <Textarea
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="A short summary of your novel (optional)"
                  rows={3}
                  disabled={loading}
                />
                {field.state.meta.isTouched &&
                  field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-red-500">
                      {field.state.meta.errors.join(", ")}
                    </p>
                  )}
              </div>
            )}
          </form.Field>

          {/* Footer */}
          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <Button variant="outline" type="button" disabled={loading}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
