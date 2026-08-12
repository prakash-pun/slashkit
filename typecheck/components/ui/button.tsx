// Typecheck stub — see ../../README.md. Not part of the registry.
import type { ComponentProps, ReactNode } from "react";

export declare function Button(
  props: ComponentProps<"button"> & {
    variant?:
      | "default"
      | "destructive"
      | "outline"
      | "secondary"
      | "ghost"
      | "link";
    size?: "default" | "sm" | "lg" | "icon";
    asChild?: boolean;
  },
): ReactNode;
