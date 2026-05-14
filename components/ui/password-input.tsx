"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type">;

/**
 * حقل كلمة مرور مع زر عين لإظهار/إخفاء النص (اتجاه إدخال LTR للأحرف والأرقام).
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [show, setShow] = React.useState(false);
    return (
      <div className="relative w-full" dir="ltr">
        <Input
          ref={ref}
          type={show ? "text" : "password"}
          className={cn("min-h-[44px] pe-11 text-left", className)}
          dir="ltr"
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute end-1 top-1/2 h-9 w-9 -translate-y-1/2 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          aria-pressed={show}
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </Button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";
