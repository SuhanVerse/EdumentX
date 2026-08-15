import type { CSSProperties, ReactNode } from "react";
import { colors, radius, control, font } from "../../theme/tokens";

type Variant = "primary" | "secondary" | "sand" | "outline" | "ghost" | "danger";

interface ButtonProps {
  children: ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: Variant;
  size?: "md" | "lg" | "sm";
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  style?: CSSProperties;
}

/**
 * EdumentX button.
 * primary = amber (the ONE primary CTA per screen).
 * secondary = chalkboard green. sand = tinted paper. outline = hairline. danger = red.
 */
export function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled,
  fullWidth,
  leftIcon,
  style,
}: ButtonProps) {
  const height = size === "lg" ? control.buttonLgH : size === "sm" ? 40 : control.buttonH;

  const palette: Record<Variant, { bg: string; fg: string; border: string }> = {
    primary:   { bg: colors.amber, fg: colors.inverse, border: "none" },
    secondary: { bg: colors.green, fg: colors.inverse, border: "none" },
    sand:      { bg: colors.sand, fg: colors.text, border: "none" },
    outline:   { bg: colors.card, fg: colors.text, border: `1px solid ${colors.hairline}` },
    ghost:     { bg: "transparent", fg: colors.green, border: "none" },
    danger:    { bg: colors.danger, fg: colors.inverse, border: "none" },
  };
  const p = palette[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        height,
        width: fullWidth ? "100%" : undefined,
        background: disabled ? colors.sand : p.bg,
        color: disabled ? colors.placeholder : p.fg,
        border: disabled ? "none" : p.border,
        borderRadius: radius.card,
        fontSize: size === "sm" ? 13 : 15,
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: font,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: fullWidth ? undefined : "0 20px",
        transition: "background 0.18s ease, transform 0.1s ease",
        ...style,
      }}
      onMouseDown={(e) => !disabled && (e.currentTarget.style.transform = `scale(${control.pressScale})`)}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {leftIcon}
      {children}
    </button>
  );
}
