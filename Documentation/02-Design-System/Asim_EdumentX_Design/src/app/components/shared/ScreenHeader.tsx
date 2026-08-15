import { useNavigate } from "react-router";
import { ChevronLeft } from "lucide-react";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  backPath?: string;
  rightElement?: React.ReactNode;
  /** Variant: "default" (white), "brand" (blue), "ai" (purple — chatbot only). */
  variant?: "default" | "brand" | "ai";
}

const VARIANTS = {
  default: { bg: "#FFFFFF", fg: "#0F172A", sub: "#6B7280", back: "#2F5D50", border: "1px solid #E7E1D3" },
  brand:   { bg: "#0F172A", fg: "#FFFFFF", sub: "#93C5FD", back: "#FFFFFF", border: "none" },
  ai:      { bg: "#0F172A", fg: "#FFFFFF", sub: "#A5B4FC", back: "#FFFFFF", border: "none" },
} as const;

export function ScreenHeader({ title, subtitle, backPath, rightElement, variant = "default" }: ScreenHeaderProps) {
  const navigate = useNavigate();
  const v = VARIANTS[variant];

  return (
    <div
      style={{
        height: subtitle ? 64 : 56,
        display: "flex",
        alignItems: "center",
        paddingLeft: 4,
        paddingRight: 16,
        background: v.bg,
        borderBottom: v.border,
        flexShrink: 0,
      }}
    >
      {backPath !== undefined && (
        <button
          onClick={() => navigate(backPath || (-1 as any))}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
            color: v.back,
            minWidth: 44,
            minHeight: 44,
          }}
        >
          <ChevronLeft size={22} strokeWidth={2} />
        </button>
      )}
      <div style={{ flex: 1, paddingLeft: backPath === undefined ? 16 : 0 }}>
        <div style={{ fontSize: 17, fontWeight: 500, color: v.fg, lineHeight: 1.3 }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 12, color: v.sub, marginTop: 2 }}>{subtitle}</div>
        )}
      </div>
      {rightElement && <div>{rightElement}</div>}
    </div>
  );
}
