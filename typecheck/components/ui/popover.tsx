// Typecheck stub — see ../../README.md. Not part of the registry.
import type { ComponentProps, ReactNode } from "react";

export declare function Popover(props: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}): ReactNode;

export declare function PopoverTrigger(props: {
  asChild?: boolean;
  children?: ReactNode;
}): ReactNode;

export declare function PopoverContent(
  props: ComponentProps<"div"> & { align?: "start" | "center" | "end" },
): ReactNode;
