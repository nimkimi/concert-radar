import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "accent";
  children: ReactNode;
};

export function Chip({ variant = "default", children, className = "", ...rest }: ChipProps) {
  const cls = `cr-chip${variant === "accent" ? " cr-chip--accent" : ""}${className ? ` ${className}` : ""}`;
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}
