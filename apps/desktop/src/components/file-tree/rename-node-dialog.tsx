/**
 * RenameNodeDialog Component
 * Dialog for renaming nodes (folders or files) in the file tree.
 *
 * Requirements: 1.5
 */

import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface RenameNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  currentTitle: string;
  onRename: (nodeId: string, newTitle: string) => void;
}

export function RenameNodeDialog({
  open,
  onOpenChange,
  nodeId,
  currentTitle,
  onRename,
}: RenameNodeDialogProps) {
  const [title, setTitle] = useState(currentTitle);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens or currentTitle changes
  useEffect(() => {
    if (open) {
      setTitle(currentTitle);
      setError(null);
    }
  }, [open, currentTitle]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title cannot be empty");
      return;
    }

    // Only call rename if title actually changed
    if (trimmedTitle !== currentTitle) {
      onRename(nodeId, trimmedTitle);
    }
    onOpenChange(false);
  }, [title, currentTitle, nodeId, onRename, onOpenChange]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    if (error) setError(null);
  }, [error]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onOpenChange(false);
    }
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onKeyDown={handleKeyDown}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
            <DialogDescription>
              Enter a new name for this item
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rename-title">Name</Label>
              <Input
                id="rename-title"
                value={title}
                onChange={handleTitleChange}
                placeholder="Enter new name..."
                autoFocus
                onFocus={(e) => {
                  // Select all text on focus for easy replacement
                  e.target.select();
                }}
                aria-invalid={!!error}
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!title.trim() || title.trim() === currentTitle}
            >
              Rename
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
