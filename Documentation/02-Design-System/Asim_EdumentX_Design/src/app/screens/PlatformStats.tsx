import { Users, BookOpen, ShieldCheck, Mail, TrendingUp } from "lucide-react";
import { AdminNav } from "../components/shared/AdminNav";
import { colors, font } from "../theme/tokens";

const WEEKLY_DATA = [
  { day: "Mon", value: 12 },
  { day: "Tue", value: 18 },
  { day: "Wed", value: 9 },
  { day: "Thu", value: 24 },
  { day: "Fri", value: 31 },
  { day: "Sat", value: 38 },
  { day: "Sun", value: 22 },
];

const SUBJECT_DEMAND = [
  { subject: "Mathematics", count: 142 },
  { subject: "Science", count: 98 },
  { subject: "English", count: 76 },
  { subject: "Physics", count: 65 },
  { subject: "Chemistry", count: 54 },
  { subject: "Computer Sc.", count: 41 },
];

const maxWeekly = Math.max(...WEEKLY_DATA.map((d) => d.value));
const maxSubject = Math.max(...SUBJECT_DEMAND.map((d) => d.count));

const KPI = [
  { Icon: Users,       label: "Registered users",  value: "1,248", tint: colors.amberTint,  iconColor: colors.amber  },
  { Icon: BookOpen,    label: "Tutors on platform", value: "184",   tint: colors.verifyTint, iconColor: colors.verify },
  { Icon: ShieldCheck, label: "Verified tutors",    value: "68%",   tint: colors.aiTint,     iconColor: colors.ai     },
  { Icon: Mail,        label: "Pending requests",   value: "23",    tint: colors.amberTint,  iconColor: colors.amber  },
];

const ADMIN_NAME = "Rajesh Admin";

export function PlatformStats() {
  return (
    <div style={{ width: "100%", height: "100%", background: colors.paper, display: "flex", flexDirection: "column", fontFamily: font }}>
      {/* Dark slate hero */}
      <div style={{ background: colors.slate, padding: "24px 20px 0", flexShrink: 0 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>EdumentX · Platform statistics</div>
          <div style={{ fontSize: 22, fontWeight: 500, color: colors.inverse }}>Good to see you, {ADMIN_NAME.split(" ")[0]}</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>EdumentX · Platform statistics</div>
        </div>
        <AdminNav />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px 32px" }}>
        {/* KPI 2×2 grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {KPI.map(({ Icon, label, value, tint, iconColor }) => (
            <div key={label} style={{ background: colors.card, borderRadius: 14, padding: 16, border: `1px solid ${colors.hairline}` }}>
              <div style={{ width: 40, height: 40, borderRadius: 999, background: tint, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                <Icon size={20} color={iconColor} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 500, color: colors.text }}>{value}</div>
              <div style={{ fontSize: 10, color: colors.placeholder, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>{label}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
                <TrendingUp size={12} color={colors.verify} />
                <span style={{ fontSize: 11, fontWeight: 500, color: colors.verify }}>+0% this week</span>
              </div>
            </div>
          ))}
        </div>

        {/* Weekly enrollment trend — plain bar rows */}
        <div style={{ background: colors.card, borderRadius: 14, padding: 16, marginBottom: 16, border: `1px solid ${colors.hairline}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: colors.text, flex: 1 }}>Weekly enrollment trend</div>
            <span style={{ fontSize: 10, fontWeight: 600, background: colors.amberTint, color: colors.amber, padding: "3px 8px", borderRadius: 999 }}>+22%</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {WEEKLY_DATA.map(({ day, value }) => (
              <div key={day} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, fontSize: 12, color: colors.muted, flexShrink: 0 }}>{day}</div>
                <div style={{ flex: 1, height: 10, borderRadius: 999, background: colors.sand, overflow: "hidden" }}>
                  <div style={{ width: `${(value / maxWeekly) * 100}%`, height: "100%", background: colors.amber, borderRadius: 999 }} />
                </div>
                <div style={{ width: 24, fontSize: 12, fontWeight: 500, color: colors.text, textAlign: "right", flexShrink: 0 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Subject demand — plain bar rows */}
        <div style={{ background: colors.card, borderRadius: 14, padding: 16, border: `1px solid ${colors.hairline}` }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: colors.text, marginBottom: 16 }}>Subject demand</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {SUBJECT_DEMAND.map(({ subject, count }) => (
              <div key={subject} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 88, fontSize: 12, color: colors.muted, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subject}</div>
                <div style={{ flex: 1, height: 10, borderRadius: 999, background: colors.sand, overflow: "hidden" }}>
                  <div style={{ width: `${(count / maxSubject) * 100}%`, height: "100%", background: colors.amber, borderRadius: 999 }} />
                </div>
                <div style={{ width: 30, fontSize: 12, fontWeight: 500, color: colors.text, textAlign: "right", flexShrink: 0 }}>{count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
