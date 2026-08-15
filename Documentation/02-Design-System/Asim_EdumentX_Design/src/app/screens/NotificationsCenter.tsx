import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Sparkles, Calendar, MessageSquareText, Star, ShieldCheck,
  Megaphone, TrendingUp, AlertTriangle, Settings as SettingsIcon, X,
} from "lucide-react";
import { ScreenHeader } from "../components/shared/ScreenHeader";

type NotifType = "ai" | "enrollment" | "message" | "review" | "verification" | "broadcast" | "trending" | "system";

interface Notif {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const TYPE_META: Record<NotifType, { icon: any; bg: string; color: string; label: string }> = {
  ai:           { icon: Sparkles,        bg: "#E3EDF4", color: "#4A7FA5", label: "AI" },
  enrollment:   { icon: Calendar,        bg: "#E4EDE9", color: "#2F5D50", label: "Enrollment" },
  message:      { icon: MessageSquareText, bg: "#DCF0E4", color: "#3F8A5A", label: "Message" },
  review:       { icon: Star,            bg: "#FBEFD9", color: "#B45309", label: "Review" },
  verification: { icon: ShieldCheck,     bg: "#DCF0E4", color: "#3F8A5A", label: "Verification" },
  broadcast:    { icon: Megaphone,       bg: "#E4EDE9", color: "#0F172A", label: "Broadcast" },
  trending:     { icon: TrendingUp,      bg: "#FBEFD9", color: "#B45309", label: "Trending" },
  system:       { icon: AlertTriangle,   bg: "#F7E4E0", color: "#C1503D", label: "System" },
};

const NOTIFS: Notif[] = [
  { id: "1", type: "ai", title: "New tutor match", body: "We found 3 new Math tutors near Baluwatar that match your needs.", time: "2 min ago", read: false },
  { id: "2", type: "enrollment", title: "Class confirmed", body: "Bishal Acharya accepted your Physics enrollment. First class Friday 6 PM.", time: "1 hr ago", read: false },
  { id: "3", type: "message", title: "Riya Shrestha", body: "Hi! Welcome — please share your school's syllabus.", time: "3 hr ago", read: false },
  { id: "4", type: "review", title: "Rate your tutor", body: "You've completed 2 sessions with Anil Karki. Share a review!", time: "Yesterday", read: true },
  { id: "5", type: "verification", title: "Profile verified", body: "Your phone number is verified. Add ID for the Pro badge.", time: "2 days ago", read: true },
  { id: "6", type: "broadcast", title: "Teacher's Day offer", body: "Get 10% off when you enroll a sibling this week.", time: "3 days ago", read: true },
  { id: "7", type: "trending", title: "+2 Science is trending", body: "23 new tutors added in your area this month.", time: "5 days ago", read: true },
  { id: "8", type: "system", title: "Password updated", body: "Your password was changed from a new device.", time: "1 week ago", read: true },
];

const TABS = ["All", "Unread", "AI", "Enrollment", "Message"] as const;

export function NotificationsCenter() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<typeof TABS[number]>("All");
  const [showPrefs, setShowPrefs] = useState(false);

  const filtered = NOTIFS.filter((n) => {
    if (tab === "All") return true;
    if (tab === "Unread") return !n.read;
    if (tab === "AI") return n.type === "ai";
    if (tab === "Enrollment") return n.type === "enrollment";
    if (tab === "Message") return n.type === "message";
    return true;
  });

  return (
    <div style={{ width: "100%", height: "100%", background: "#FBF8F2", display: "flex", flexDirection: "column", fontFamily: "Inter, sans-serif", position: "relative" }}>
      <ScreenHeader
        title="Notifications"
        backPath="/student/home"
        rightElement={
          <button
            onClick={() => setShowPrefs(true)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 8, color: "#6B7280", display: "flex" }}
          >
            <SettingsIcon size={20} />
          </button>
        }
      />

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, padding: "12px 16px", overflowX: "auto", borderBottom: "1px solid #E7E1D3", background: "#FFFFFF" }}>
        {TABS.map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: active ? "#2F5D50" : "#F1ECE0",
                color: active ? "#FFFFFF" : "#6B7280",
                border: "none",
                borderRadius: 999,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                whiteSpace: "nowrap",
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {filtered.map((n) => {
          const meta = TYPE_META[n.type];
          const Icon = meta.icon;
          return (
            <div
              key={n.id}
              style={{
                display: "flex",
                gap: 12,
                padding: "14px 16px",
                background: n.read ? "#FFFFFF" : "#F0F7FF",
                borderBottom: "1px solid #E7E1D3",
                cursor: "pointer",
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 999, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={20} color={meta.color} strokeWidth={1.8} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "#0F172A" }}>{n.title}</span>
                  {!n.read && <div style={{ width: 6, height: 6, borderRadius: 999, background: "#2F5D50" }} />}
                </div>
                <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.5, marginBottom: 4 }}>{n.body}</div>
                <div style={{ fontSize: 11, color: "#9CA3AF" }}>{n.time}</div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
            No notifications here.
          </div>
        )}
      </div>

      {/* Preferences sheet */}
      {showPrefs && (
        <div
          onClick={() => setShowPrefs(false)}
          style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", zIndex: 10 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", background: "#FFFFFF", borderRadius: "20px 20px 0 0", padding: "16px 20px 28px" }}
          >
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <div style={{ width: 40, height: 4, borderRadius: 999, background: "#E7E1D3" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
              <div style={{ flex: 1, fontSize: 17, fontWeight: 500, color: "#0F172A" }}>Notification preferences</div>
              <button
                onClick={() => setShowPrefs(false)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: "#6B7280", display: "flex" }}
              >
                <X size={20} />
              </button>
            </div>
            {Object.entries(TYPE_META).map(([k, m]) => (
              <PrefRow key={k} icon={m.icon} color={m.color} bg={m.bg} label={m.label} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PrefRow({ icon: Icon, color, bg, label }: { icon: any; color: string; bg: string; label: string }) {
  const [on, setOn] = useState(true);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
      <div style={{ width: 32, height: 32, borderRadius: 999, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={16} color={color} />
      </div>
      <div style={{ flex: 1, fontSize: 14, color: "#0F172A" }}>{label}</div>
      <button
        onClick={() => setOn((v) => !v)}
        style={{
          width: 40, height: 24, borderRadius: 999, border: "none", cursor: "pointer",
          background: on ? "#3F8A5A" : "#E7E1D3", position: "relative", padding: 0,
        }}
      >
        <div style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 20, height: 20, borderRadius: 999, background: "#FFFFFF", transition: "left 0.2s" }} />
      </button>
    </div>
  );
}
