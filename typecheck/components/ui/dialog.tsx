// Typecheck stub — see ../../README.md. Not part of the registry.
import type { ComponentProps, ReactNode } from "react";

export declare function Dialog(props: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}): ReactNode;

export declare function DialogContent(props: ComponentProps<"div">): ReactNode;
export declare function DialogHeader(props: ComponentProps<"div">): ReactNode;
export declare function DialogFooter(props: ComponentProps<"div">): ReactNode;
export declare function DialogTitle(props: ComponentProps<"h2">): ReactNode;
export declare function DialogDescription(
  props: ComponentProps<"p">,
): ReactNode;
