import { Wifi, Battery } from "lucide-react";

interface StatusBarProps {
  dark?: boolean;
}

export function StatusBar({ dark }: StatusBarProps) {
  const time = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  const textColor = dark ? "#FFFFFF" : "#0F172A";

  return (
    <div
      style={{
        height: 44,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingLeft: 20,
        paddingRight: 16,
        flexShrink: 0,
        background: "transparent",
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 600, color: textColor }}>{time}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <Wifi size={14} style={{ color: textColor }} strokeWidth={2} />
        <Battery size={18} style={{ color: textColor }} strokeWidth={1.8} />
      </div>
    </div>
  );
}
