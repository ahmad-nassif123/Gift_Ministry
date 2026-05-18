"use client";

import { cn } from "@/lib/utils";

type RememberMeCheckboxProps = {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
};

export function RememberMeCheckbox({ id, checked, onCheckedChange, className }: RememberMeCheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={cn("flex cursor-pointer items-center gap-2 text-sm text-muted-foreground select-none", className)}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className="h-4 w-4 shrink-0 rounded border border-input accent-[hsl(var(--primary))]"
      />
      <span>تذكرني</span>
    </label>
  );
}
