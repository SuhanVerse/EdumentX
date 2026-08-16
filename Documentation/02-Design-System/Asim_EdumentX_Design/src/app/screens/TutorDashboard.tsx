import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Bell, ChevronRight, Users2, Star, Clock, DollarSign,
  Zap, Calendar, MessageCircle, ShieldCheck, Briefcase,
  Check, X, Plus,
} from "lucide-react";
import { PENDING_REQUESTS, TUTORS, BATCH_REQUESTS } from "../data/mockData";
import { SubjectChip } from "../components/shared/SubjectChip";
import { StatusBadge } from "../components/shared/StatusBadge";
import { BottomNav } from "../components/shared/BottomNav";
import { colors, type as typo, font } from "../theme/tokens";

const TODAY_SESSIONS = [
  { time: "5–7 PM", student: "Aarav Tamang", subject: "Mathematics · 2 hr", color: colors.amber },
  { time: "7–9 PM", student: "Priya Maharjan", subject: "Physics · 2 hr", color: colors.amber },
];

export function TutorDashboard() {
  const navigate = useNavigate();
  const [available, setAvailable] = useState(true);
  const [reqTab, setReqTab] = useState<"enrollments" | "batches">("enrollments");
  const me = TUTORS[0];

  const capacity = me.capacity ?? 8;
  const currentStudents = me.currentStudents ?? 5;
  const capPct = (currentStudents / capacity) * 100;
  const capColor = capPct >= 100 ? colors.danger : capPct >= 80 ? colors.amber : colors.verify;

  const METRICS = [
    { Icon: Users2,   iconColor: colors.green,  label: "Active students",  value: String(currentStudents), trend: "+2 this month", up: true  },
    { Icon: Star,     iconColor: colors.amber,  label: "Avg rating",       value: me.rating.toFixed(1),   trend: `${me.reviews} reviews`, up: false },
    { Icon: Clock,    iconColor: colors.verify, label: "Pending requests", value: String(PENDING_REQUESTS.length + BATCH_REQUESTS.length), trend: "Respond <24h", up: false },
    { Icon: DollarSign, iconColor: colors.ai,   label: "Response rate",    value: `${me.responseRate}%`,  trend: "Last 30 days", up: true  },
    { Icon: Zap,      iconColor: colors.green,  label: "Reviews",          value: String(me.reviews),     trend: "All time", up: false },
    { Icon: Calendar, iconColor: colors.amber,  label: "Monthly revenue",  value: `Rs ${(currentStudents * me.rate).toLocaleString()}`, trend: "Roster × rate", up: true },
  ];

  return (
    <div style={{ width: "100%", height: "100%", background: colors.paper, display: "flex", flexDirection: "column", fontFamily: font }}>
      {/* Light header */}
      <div style={{ background: colors.paper, padding: "20px 16px 16px", flexShrink: 0, borderBottom: `1px solid ${colors.hairline}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ ...typo.body, color: colors.muted }}>Good to see you,</div>
            <div>
              <div style={{ ...typo.screenTitle, color: colors.text, display: "inline" }}>{me.name}</div>
              <div style={{ height: 2, background: colors.amber, borderRadius: 1, marginTop: 4, width: "100%" }} />
            </div>
            {me.verified && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 999, background: colors.verifyTint, marginTop: 8 }}>
                <ShieldCheck size={12} color={colors.verify} />
                <span style={{ ...typo.caption, color: colors.verify }}>Verified Professional</span>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => navigate("/messages")}
              style={{ width: 40, height: 40, borderRadius: 999, border: `1px solid ${colors.hairline}`, background: colors.card, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <MessageCircle size={19} color={colors.green} />
            </button>
            <button
              onClick={() => navigate("/notifications")}
              style={{ width: 40, height: 40, borderRadius: 999, border: `1px solid ${colors.hairline}`, background: colors.card, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}
            >
              <Bell size={19} color={colors.green} />
              <div style={{ position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: 999, background: colors.danger, border: `1.5px solid ${colors.paper}` }} />
            </button>
          </div>
        </div>

        {/* Availability toggle card */}
        <div style={{ background: colors.card, border: `1px solid ${colors.hairline}`, borderRadius: 16, padding: "14px", marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: colors.text }}>
              {available ? "Available for new students" : "Hidden from search"}
            </div>
            <div style={{ ...typo.caption, color: colors.muted, marginTop: 2 }}>
              Toggle to {available ? "pause" : "resume"} appearing in search results
            </div>
          </div>
          <button
            onClick={() => setAvailable(!available)}
            style={{ width: 44, height: 24, borderRadius: 999, border: "none", background: available ? colors.verify : colors.hairline, position: "relative", cursor: "pointer", padding: 0, flexShrink: 0, transition: "background 0.2s" }}
          >
            <div style={{ position: "absolute", top: 2, left: available ? 22 : 2, width: 20, height: 20, borderRadius: 999, background: colors.card, border: `1px solid ${colors.hairline}`, transition: "left 0.2s" }} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 88px" }}>

        {/* 3×2 Metric grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          {METRICS.map(({ Icon, iconColor, label, value, trend, up }) => (
            <div key={label} style={{ background: colors.card, border: `1px solid ${colors.hairline}`, borderRadius: 16, padding: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: colors.paper, border: `1px solid ${colors.hairline}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                <Icon size={16} color={iconColor} />
              </div>
              <div style={{ ...typo.micro, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: colors.text, lineHeight: 1.1 }}>{value}</div>
              <div style={{ ...typo.micro, color: up ? colors.verify : colors.muted, marginTop: 4 }}>{trend}</div>
            </div>
          ))}
        </div>

        {/* Capacity card */}
        <div
          onClick={() => navigate("/tutor/capacity")}
          style={{ background: colors.card, border: `1px solid ${colors.hairline}`, borderRadius: 16, padding: 16, marginBottom: 14, cursor: "pointer" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Users2 size={16} color={colors.muted} />
            <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: colors.text }}>Capacity</div>
            <div style={{ fontSize: 13, color: capColor, fontWeight: 500 }}>{currentStudents} of {capacity} filled</div>
            <ChevronRight size={16} color={colors.placeholder} />
          </div>
          <div style={{ height: 8, borderRadius: 999, background: colors.sand, overflow: "hidden" }}>
            <div style={{ width: `${capPct}%`, height: "100%", background: capColor, borderRadius: 999 }} />
          </div>
        </div>

        {/* Profile completion */}
        <div style={{ background: colors.card, border: `1px solid ${colors.hairline}`, borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: colors.text }}>Profile completion</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: colors.amber }}>{me.profileCompletion}%</div>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: colors.sand, overflow: "hidden" }}>
            <div style={{ width: `${me.profileCompletion}%`, height: "100%", background: colors.amber, borderRadius: 999 }} />
          </div>
        </div>

        {/* Today's sessions */}
        <div style={{ background: colors.card, border: `1px solid ${colors.hairline}`, borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: colors.paper, border: `1px solid ${colors.hairline}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Briefcase size={16} color={colors.amber} />
            </div>
            <div style={{ flex: 1, ...typo.cardTitle, color: colors.text }}>Sessions today</div>
            <div style={{ ...typo.micro, color: colors.muted }}>{TODAY_SESSIONS.length} scheduled</div>
          </div>
          {TODAY_SESSIONS.map((s, i) => (
            <div key={s.time} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: `1px solid ${colors.hairline}` }}>
              <div style={{ width: 60, ...typo.caption, color: colors.amber }}>{s.time}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: colors.text }}>{s.student}</div>
                <div style={{ ...typo.micro, color: colors.muted, marginTop: 1 }}>{s.subject}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Pending requests */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ ...typo.cardTitle, color: colors.text }}>Pending requests</div>
            <button
              onClick={() => navigate("/tutor/inbox")}
              style={{ display: "flex", alignItems: "center", gap: 2, background: "none", border: "none", color: colors.amber, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: font }}
            >
              See all <ChevronRight size={14} />
            </button>
          </div>

          {/* Segmented sub-tabs */}
          <div style={{ display: "flex", background: colors.sand, border: `1px solid ${colors.hairline}`, borderRadius: 12, padding: 4, marginBottom: 10, position: "relative" }}>
            {([
              { key: "enrollments", label: "New enrollments", count: PENDING_REQUESTS.length },
              { key: "batches", label: "Batch requests", count: BATCH_REQUESTS.length },
            ] as const).map((t) => {
              const on = reqTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setReqTab(t.key)}
                  style={{
                    flex: 1, height: 36, borderRadius: 8, border: "none",
                    background: on ? colors.green : "transparent",
                    color: on ? colors.inverse : colors.muted,
                    fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: font,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    transition: "background 0.15s",
                  }}
                >
                  {t.label}
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 999,
                    background: on ? "rgba(255,255,255,0.25)" : colors.hairline,
                    color: on ? colors.inverse : colors.muted,
                  }}>{t.count}</span>
                </button>
              );
            })}
          </div>

          {reqTab === "enrollments" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {PENDING_REQUESTS.map((req) => (
                <div
                  key={req.id}
                  onClick={() => navigate("/tutor/inbox")}
                  style={{ background: colors.card, borderRadius: 16, padding: 14, border: `1px solid ${colors.hairline}`, cursor: "pointer", position: "relative", overflow: "hidden" }}
                >
                  {/* amber left stripe */}
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: colors.amber, borderRadius: "16px 0 0 16px" }} />
                  <div style={{ paddingLeft: 8, display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <img src={req.student.avatar} alt={req.student.name} style={{ width: 40, height: 40, borderRadius: 999, objectFit: "cover" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ ...typo.cardTitle, color: colors.text }}>{req.student.name}</div>
                        <StatusBadge status="pending" />
                      </div>
                      <div style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{req.student.grade}</div>
                      <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                        {req.subjects.map((s) => <SubjectChip key={s} label={s} small />)}
                      </div>
                      <div style={{ marginTop: 6, ...typo.micro, color: colors.placeholder }}>
                        {req.schedule} · From {req.startDate}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {reqTab === "batches" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 0", gap: 6 }}>
              <Users2 size={22} color={colors.muted} />
              <div style={{ fontSize: 13, color: colors.muted }}>No batch requests right now.</div>
            </div>
          )}
        </div>

        {/* Group batch CTA */}
        <button
          onClick={() => navigate("/tutor/batch")}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 12,
            padding: 14, background: colors.aiTint, border: `1px solid #B9D0E0`, borderRadius: 16,
            cursor: "pointer", fontFamily: font, textAlign: "left", marginBottom: 14,
          }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 10, background: colors.ai, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Users2 size={20} color={colors.inverse} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: colors.ai }}>Create a group batch</div>
            <div style={{ fontSize: 12, color: colors.ai, marginTop: 2 }}>Combine 2–6 students into a shared batch</div>
          </div>
          <ChevronRight size={18} color={colors.ai} />
        </button>

        {/* Quick actions 2×2 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { label: "View inbox", Icon: MessageCircle, path: "/tutor/inbox" },
            { label: "Manage batches", Icon: Users2, path: "/tutor/batch" },
            { label: "Set availability", Icon: Calendar, path: "/tutor/capacity" },
            { label: "Edit profile", Icon: Zap, path: "/tutor/profile" },
          ].map(({ label, Icon, path }) => (
            <button
              key={label}
              onClick={() => navigate(path)}
              style={{ background: colors.card, border: `1px solid ${colors.hairline}`, borderRadius: 16, padding: 14, cursor: "pointer", fontFamily: font, textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: colors.paper, border: `1px solid ${colors.hairline}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={14} color={colors.green} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, color: colors.text }}>{label}</div>
            </button>
          ))}
        </div>
      </div>

      <BottomNav role="tutor" />
    </div>
  );
}
