import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Button } from "@/views/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/views/ui/dialog";

export interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [resolver, setResolver] = useState<((v: boolean) => void) | null>(null);
  const [opts, setOpts] = useState<ConfirmOptions>({});

  const confirm = useCallback((options: ConfirmOptions) => {
    setOpts(options);
    setOpen(true);
    return new Promise<boolean>((resolve) => setResolver(() => resolve));
  }, []);

  const onClose = useCallback(() => {
    setOpen(false);
    setOpts({});
    setResolver(null);
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{opts.title ?? "请确认"}</DialogTitle>
            {opts.description ? (
              <DialogDescription>{opts.description}</DialogDescription>
            ) : null}
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resolver?.(false);
                onClose();
              }}
            >
              {opts.cancelText ?? "取消"}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                resolver?.(true);
                onClose();
              }}
            >
              {opts.confirmText ?? "确认"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx.confirm;
}
