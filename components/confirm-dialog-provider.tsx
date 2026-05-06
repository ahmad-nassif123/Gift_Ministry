"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

export type AppConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** زر التأكيد بلون تحذيري (حذف وغيره) */
  danger?: boolean;
};

export type ConfirmFn = (opts: AppConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<ConfirmFn>(() => Promise.resolve(false));

export function useConfirm(): ConfirmFn {
  return React.useContext(ConfirmContext);
}

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [opts, setOpts] = React.useState<AppConfirmOptions | null>(null);
  const resolveRef = React.useRef<((value: boolean) => void) | null>(null);

  const settle = React.useCallback((value: boolean) => {
    const resolve = resolveRef.current;
    if (!resolve) return;
    resolveRef.current = null;
    resolve(value);
    setOpen(false);
    setOpts(null);
  }, []);

  const requestConfirm = React.useCallback((o: AppConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setOpts(o);
      setOpen(true);
    });
  }, []);

  return (
    <ConfirmContext.Provider value={requestConfirm}>
      {children}
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (!next && resolveRef.current) settle(false);
        }}
      >
        <AlertDialogContent dir="rtl" className="gap-4">
          <AlertDialogHeader>
            <div className="flex items-start gap-3">
              <div
                className={
                  opts?.danger
                    ? "mt-0.5 rounded-full bg-destructive/10 p-2 text-destructive"
                    : "mt-0.5 rounded-full bg-primary/10 p-2 text-primary"
                }
              >
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <AlertDialogTitle className="text-right">{opts?.title ?? "تأكيد"}</AlertDialogTitle>
                <AlertDialogDescription className="mt-1 text-foreground/90">
                  {opts?.message ?? ""}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row flex-wrap justify-start gap-2 sm:gap-3">
            <AlertDialogCancel type="button" className="min-w-24" onClick={() => settle(false)}>
              {opts?.cancelLabel ?? "إلغاء"}
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              className={
                opts?.danger
                  ? "min-w-24 bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive"
                  : "min-w-24"
              }
              onClick={(e) => {
                e.preventDefault();
                settle(true);
              }}
            >
              {opts?.confirmLabel ?? "متابعة"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}
