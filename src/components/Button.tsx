import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "spotify" | "ghost" | "primary" | "danger";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  spotify: "cr-btn--spotify",
  ghost: "cr-btn--ghost",
  primary: "cr-btn--primary",
  danger: "cr-btn--danger",
};

export function Button({ variant = "primary", children, className = "", type = "button", ...rest }: ButtonProps) {
  const cls = `cr-btn ${VARIANT_CLASS[variant]}${className ? ` ${className}` : ""}`;
  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  );
}
