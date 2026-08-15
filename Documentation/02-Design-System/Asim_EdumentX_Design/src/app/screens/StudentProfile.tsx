import { useNavigate } from "react-router";
import { ChevronRight, Bell, Heart, CreditCard, HelpCircle, LogOut, User } from "lucide-react";
import { ScreenHeader } from "../components/shared/ScreenHeader";
import { BottomNav } from "../components/shared/BottomNav";
import { BlueTick } from "../components/shared/BlueTick";

const ITEMS = [
  { icon: Bell, label: "Notifications", path: "/notifications" },
  { icon: Heart, label: "Saved tutors", path: "/student/home" },
  { icon: CreditCard, label: "Payment methods", path: "/student/home" },
  { icon: HelpCircle, label: "Help & support", path: "/student/home" },
];

export function StudentProfile() {
  const navigate = useNavigate();

  return (
    <div style={{ width: "100%", height: "100%", background: "#FBF8F2", display: "flex", flexDirection: "column", fontFamily: "Inter, sans-serif" }}>
      <ScreenHeader title="Profile" />

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 88px" }}>
        {/* Identity */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E7E1D3", borderRadius: 14, padding: 16, display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 999, background: "#E4EDE9", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <User size={28} color="#2F5D50" />
            <div style={{ position: "absolute", bottom: -2, right: -2 }}>
              <BlueTick size={18} tier="phone" />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 500, color: "#0F172A" }}>Aarav Sharma</div>
            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>+977 9841234567 · Phone verified</div>
          </div>
          <ChevronRight size={20} color="#9CA3AF" />
        </div>

        {/* Menu */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E7E1D3", borderRadius: 14, overflow: "hidden" }}>
          {ITEMS.map((it, i) => (
            <button
              key={it.label}
              onClick={() => navigate(it.path)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "14px 16px", background: "none",
                border: "none", borderBottom: i < ITEMS.length - 1 ? "1px solid #E7E1D3" : "none",
                cursor: "pointer", fontFamily: "Inter, sans-serif",
              }}
            >
              <it.icon size={20} color="#6B7280" strokeWidth={1.8} />
              <div style={{ flex: 1, textAlign: "left", fontSize: 14, color: "#0F172A" }}>{it.label}</div>
              <ChevronRight size={18} color="#9CA3AF" />
            </button>
          ))}
        </div>

        <button
          style={{
            width: "100%", marginTop: 16, height: 48, borderRadius: 12,
            background: "#FFFFFF", border: "1px solid #F0D0C9", color: "#C1503D",
            fontSize: 14, fontWeight: 500, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            fontFamily: "Inter, sans-serif",
          }}
        >
          <LogOut size={18} /> Log out
        </button>
      </div>

      <BottomNav role="student" />
    </div>
  );
}
