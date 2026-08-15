import { Users, BookOpen, CheckCircle, Star } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { StatusBar } from "../components/shared/StatusBar";
import { AdminNav } from "../components/shared/AdminNav";

const WEEKLY_DATA = [
  { day: "Mon", enrollments: 12 },
  { day: "Tue", enrollments: 18 },
  { day: "Wed", enrollments: 9 },
  { day: "Thu", enrollments: 24 },
  { day: "Fri", enrollments: 31 },
  { day: "Sat", enrollments: 38 },
  { day: "Sun", enrollments: 22 },
];

const SUBJECT_DEMAND = [
  { subject: "Mathematics", count: 142 },
  { subject: "Science", count: 98 },
  { subject: "English", count: 76 },
  { subject: "Physics", count: 65 },
  { subject: "Chemistry", count: 54 },
  { subject: "Computer Sc.", count: 41 },
];

const KPI_CARDS = [
  { icon: Users, label: "Registered users", value: "1,248", change: "+14%", bg: "#E4EDE9", color: "#2F5D50" },
  { icon: BookOpen, label: "Active enrollments", value: "387", change: "+8%", bg: "#DCF0E4", color: "#3F8A5A" },
  { icon: CheckCircle, label: "Verified tutors", value: "68%", change: "+5%", bg: "#E3EDF4", color: "#4A7FA5" },
  { icon: Star, label: "Platform rating", value: "4.7", change: "+0.1", bg: "#FBEFD9", color: "#D97706" },
];

export function PlatformStats() {

  return (
    <div style={{ width: "100%", height: "100%", background: "#FBF8F2", display: "flex", flexDirection: "column" }}>
      <StatusBar />

      {/* Header */}
      <div style={{ background: "#2F5D50", padding: "0 20px 16px", flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 500, color: "#FFFFFF" }}>Platform statistics</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>EdumentX · May 2026</div>
        <AdminNav />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 32px" }}>
        {/* KPI cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {KPI_CARDS.map(({ icon: Icon, label, value, change, bg, color }) => (
            <div key={label} style={{ background: "#FFFFFF", borderRadius: 12, padding: "14px", border: "1px solid #E7E1D3" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                <Icon size={18} style={{ color }} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 500, color: "#0F172A" }}>{value}</div>
              <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 1 }}>{label}</div>
              <div style={{ fontSize: 11, color: "#3F8A5A", fontWeight: 500, marginTop: 3 }}>↑ {change} this week</div>
            </div>
          ))}
        </div>

        {/* Weekly enrollment trend */}
        <div style={{ background: "#FFFFFF", borderRadius: 12, padding: "16px", marginBottom: 16, border: "1px solid #E7E1D3" }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: "#0F172A", marginBottom: 4 }}>Weekly enrollment trend</div>
          <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 12 }}>New enrollments per day</div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={WEEKLY_DATA} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1ECE0" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #E7E1D3", fontSize: 12, fontFamily: "Inter, sans-serif" }}
              />
              <Line type="monotone" dataKey="enrollments" stroke="#2F5D50" strokeWidth={2.5} dot={{ r: 4, fill: "#2F5D50", stroke: "#FFFFFF", strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Subject demand bar chart */}
        <div style={{ background: "#FFFFFF", borderRadius: 12, padding: "16px", marginBottom: 16, border: "1px solid #E7E1D3" }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: "#0F172A", marginBottom: 4 }}>Subject demand</div>
          <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 12 }}>Tutor searches by subject</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={SUBJECT_DEMAND} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="subject" tick={{ fontSize: 10, fill: "#6B7280" }} axisLine={false} tickLine={false} width={70} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #E7E1D3", fontSize: 12, fontFamily: "Inter, sans-serif" }}
              />
              <Bar dataKey="count" fill="#2F5D50" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent activity */}
        <div style={{ background: "#FFFFFF", borderRadius: 12, padding: "14px 16px", border: "1px solid #E7E1D3" }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#0F172A", marginBottom: 10 }}>Recent activity</div>
          {[
            { action: "New tutor verified", name: "Ram Sharma", time: "2 min ago", dot: "#3F8A5A" },
            { action: "New enrollment", name: "Aarav Tamang → Sita Adhikari", time: "15 min ago", dot: "#2F5D50" },
            { action: "User suspended", name: "Anonymous report", time: "1 hr ago", dot: "#C1503D" },
            { action: "New registration", name: "14 new users today", time: "Today", dot: "#4A7FA5" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, paddingBottom: 10, borderBottom: i < 3 ? "1px solid #E7E1D3" : "none" }}>
              <div style={{ width: 8, height: 8, borderRadius: 999, background: item.dot, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: "#0F172A" }}>{item.action}</div>
                <div style={{ fontSize: 11, color: "#9CA3AF" }}>{item.name}</div>
              </div>
              <div style={{ fontSize: 11, color: "#9CA3AF", whiteSpace: "nowrap" }}>{item.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
