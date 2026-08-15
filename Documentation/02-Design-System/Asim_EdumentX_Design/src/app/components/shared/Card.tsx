import type { CSSProperties, ReactNode } from "react";
import { colors, radius, space } from "../../theme/tokens";

interface CardProps {
  children: ReactNode;
  onClick?: () => void;
  padded?: boolean;
  style?: CSSProperties;
}

/** White card, 1px hairline border, 14px radius, NO drop shadow. */
export function Card({ children, onClick, padded = true, style }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: colors.card,
        border: `1px solid ${colors.hairline}`,
        borderRadius: radius.card,
        padding: padded ? space.cardPad : 0,
        cursor: onClick ? "pointer" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
