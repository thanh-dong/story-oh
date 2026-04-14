"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  loading?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose
            render={
              <Button variant="outline" disabled={loading} />
            }
          >
            {cancelLabel}
          </DialogClose>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Please wait..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook for confirm dialog state management.
 * Returns [dialogProps, trigger] where trigger() returns a promise that
 * resolves true (confirmed) or false (cancelled).
 */
export function useConfirmDialog() {
  const [state, setState] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    variant?: "default" | "destructive";
    resolve?: (value: boolean) => void;
  }>({ open: false, title: "", description: "" });

  function trigger(opts: {
    title: string;
    description: string;
    confirmLabel?: string;
    variant?: "default" | "destructive";
  }): Promise<boolean> {
    return new Promise((resolve) => {
      setState({ ...opts, open: true, resolve });
    });
  }

  const dialogProps: ConfirmDialogProps = {
    open: state.open,
    onOpenChange: (open) => {
      if (!open) {
        state.resolve?.(false);
        setState((s) => ({ ...s, open: false }));
      }
    },
    title: state.title,
    description: state.description,
    confirmLabel: state.confirmLabel,
    variant: state.variant,
    onConfirm: () => {
      state.resolve?.(true);
      setState((s) => ({ ...s, open: false }));
    },
  };

  return [dialogProps, trigger] as const;
}
