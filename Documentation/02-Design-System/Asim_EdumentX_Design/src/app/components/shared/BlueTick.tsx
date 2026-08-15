import { Check, GraduationCap } from "lucide-react";

interface BlueTickProps {
  size?: number;
  /** "pro" = Verified Professional (teal). "student" = Verified Student Tutor (blue). "phone" = Phone Verified (gray). */
  tier?: "pro" | "student" | "phone";
}

export function BlueTick({ size = 16, tier = "pro" }: BlueTickProps) {
  const cfg = tier === "pro"
    ? { bg: "#3F8A5A", icon: Check }
    : tier === "student"
    ? { bg: "#2F5D50", icon: GraduationCap }
    : { bg: "#9CA3AF", icon: Check };
  const Icon = cfg.icon;
  const iconSize = Math.round(size * 0.62);
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: cfg.bg,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: "0 0 0 2px #FFFFFF",
      }}
      aria-label={tier === "pro" ? "Verified Professional Tutor" : tier === "student" ? "Verified Student Tutor" : "Phone Verified"}
    >
      <Icon size={iconSize} strokeWidth={3} color="#FFFFFF" />
    </span>
  );
}
