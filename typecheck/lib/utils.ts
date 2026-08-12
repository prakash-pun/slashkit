// Typecheck stub — see ../README.md. Not part of the registry.
//
// Mirrors the `cn` that `shadcn init` writes into a consumer's project, without
// depending on clsx/tailwind-merge being installed here.
export type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | ClassValue[]
  | Record<string, unknown>;

export declare function cn(...inputs: ClassValue[]): string;
