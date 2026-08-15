import { useState } from "react";
import { useNavigate } from "react-router";
import { Bell, ChevronRight, TrendingUp, Users2, Star, Clock, DollarSign, ShieldCheck, Zap, Calendar, Lock, Sparkles, Check, X, AlertCircle } from "lucide-react";
import { PENDING_REQUESTS, TUTORS, BATCH_REQUESTS, SESSION_SLOTS } from "../data/mockData";
import { SubjectChip } from "../components/shared/SubjectChip";
import { StatusBadge } from "../components/shared/StatusBadge";
import { BottomNav } from "../components/shared/BottomNav";

const TODAY_SESSIONS = [
  { time: "4:00 PM", student: "Aarav Tamang", subject: "Mathematics", duration: "60 min" },
  { time: "6:00 PM", student: "Priya Maharjan", subject: "Physics", duration: "60 min" },
];

export function TutorDashboard() {
  const navigate = useNavigate();
  const [available, setAvailable] = useState(true);
  const [reqTab, setReqTab] = useState<"enrollments" | "batches">("enrollments");
  const [batchActions, setBatchActions] = useState<Record<string, "accepted" | "rejected">>({});
  const me = TUTORS[0];

  const capacity = me.capacity ?? 8;
  const currentStudents = me.currentStudents ?? 5;
  const capPct = (currentStudents / capacity) * 100;

  return (
    <div style={{ width: "100%", height: "100%", background: "#FBF8F2", display: "flex", flexDirection: "column", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div style={{ background: "#0F172A", padding: "16px 16px 20px", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Welcome back,</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: "#FFFFFF", marginTop: 2 }}>{me.name}</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 999, background: "rgba(63,138,90,0.25)", marginTop: 8 }}>
              <ShieldCheck size={12} color="#DCF0E4" />
              <span style={{ fontSize: 11, color: "#DCF0E4", fontWeight: 500 }}>Verified Professional</span>
            </div>
          </div>
          <button
            onClick={() => navigate("/notifications")}
            style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 12, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}
          >
            <Bell size={20} color="#FFFFFF" />
            <div style={{ position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: 999, background: "#E5A03B", border: "1.5px solid #0F172A" }} />
          </button>
        </div>

        {/* Availability toggle */}
        <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "10px 14px", marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#FFFFFF" }}>
              {available ? "Available for new students" : "Hidden from search"}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 1 }}>
              Toggle to {available ? "pause" : "resume"} appearing in search results
            </div>
          </div>
          <button
            onClick={() => setAvailable(!available)}
            style={{ width: 44, height: 26, borderRadius: 999, border: "none", background: available ? "#3F8A5A" : "rgba(255,255,255,0.2)", position: "relative", cursor: "pointer", padding: 0 }}
          >
            <div style={{ position: "absolute", top: 2, left: available ? 20 : 2, width: 22, height: 22, borderRadius: 999, background: "#FFFFFF", transition: "left 0.2s" }} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 88px" }}>
        {/* Metric cards 2x2 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <Metric icon={Users2} color="#2F5D50" label="Active students" value={String(currentStudents)} trend="+2 this month" trendUp />
          <Metric icon={Star} color="#E5A03B" label="Avg rating" value={me.rating.toFixed(1)} trend={`${me.reviews} reviews`} />
          <Metric icon={Clock} color="#3F8A5A" label="Pending" value="2" trend="Respond <24h" />
          <Metric icon={DollarSign} color="#4A7FA5" label="This month" value="Rs 28k" trend="+12%" trendUp />
        </div>

        {/* Capacity */}
        <div
          onClick={() => navigate("/tutor/capacity")}
          style={{ background: "#FFFFFF", border: "1px solid #E7E1D3", borderRadius: 14, padding: 16, marginBottom: 14, cursor: "pointer" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Users2 size={16} color="#2F5D50" />
            <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#0F172A" }}>Capacity</div>
            <div style={{ fontSize: 13, color: capPct >= 100 ? "#C1503D" : "#3F8A5A", fontWeight: 500 }}>
              {currentStudents} of {capacity} filled
            </div>
            <ChevronRight size={16} color="#9CA3AF" />
          </div>
          <div style={{ height: 8, borderRadius: 999, background: "#F1ECE0", overflow: "hidden" }}>
            <div style={{ width: `${capPct}%`, height: "100%", background: capPct >= 100 ? "#C1503D" : capPct > 80 ? "#E5A03B" : "#3F8A5A", borderRadius: 999 }} />
          </div>
        </div>

        {/* Profile completion + response */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E7E1D3", borderRadius: 14, padding: 16, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Zap size={14} color="#3F8A5A" />
            <div style={{ fontSize: 12, color: "#3F8A5A", fontWeight: 500 }}>Responsive · {me.responseRate}% in 24h</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#0F172A", marginBottom: 6 }}>Profile completion</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 6, borderRadius: 999, background: "#F1ECE0", overflow: "hidden" }}>
              <div style={{ width: `${me.profileCompletion}%`, height: "100%", background: "#2F5D50", borderRadius: 999 }} />
            </div>
            <div style={{ fontSize: 13, color: "#2F5D50", fontWeight: 500 }}>{me.profileCompletion}%</div>
          </div>
        </div>

        {/* Today's sessions */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E7E1D3", borderRadius: 14, padding: 16, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Calendar size={16} color="#2F5D50" />
            <div style={{ fontSize: 14, fontWeight: 500, color: "#0F172A", flex: 1 }}>Sessions today</div>
            <div style={{ fontSize: 11, color: "#6B7280" }}>{TODAY_SESSIONS.length} scheduled</div>
          </div>
          {TODAY_SESSIONS.map((s, i) => (
            <div
              key={s.time}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 0",
                borderTop: i === 0 ? "1px solid #E7E1D3" : "1px solid #E7E1D3",
              }}
            >
              <div style={{ width: 60, fontSize: 12, fontWeight: 500, color: "#2F5D50" }}>{s.time}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "#0F172A" }}>{s.student}</div>
                <div style={{ fontSize: 11, color: "#6B7280" }}>{s.subject} · {s.duration}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Pending requests */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#0F172A" }}>Pending requests</div>
            <button
              onClick={() => navigate("/tutor/inbox")}
              style={{ display: "flex", alignItems: "center", gap: 2, background: "none", border: "none", color: "#2F5D50", fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif" }}
            >
              See all <ChevronRight size={14} />
            </button>
          </div>

          {/* Sub-tabs */}
          <div style={{ display: "flex", background: "#FFFFFF", border: "1px solid #E7E1D3", borderRadius: 12, padding: 4, marginBottom: 10 }}>
            {([
              { key: "enrollments", label: "New enrollments", count: PENDING_REQUESTS.length },
              { key: "batches", label: "Batch requests", count: BATCH_REQUESTS.length },
            ] as const).map((t) => {
              const on = reqTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setReqTab(t.key)}
                  style={{ flex: 1, height: 36, borderRadius: 8, border: "none", background: on ? "#2F5D50" : "transparent", color: on ? "#FFFFFF" : "#6B7280", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  {t.label}
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 999, background: on ? "rgba(255,255,255,0.25)" : "#F1ECE0", color: on ? "#FFFFFF" : "#6B7280" }}>{t.count}</span>
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
                  style={{ background: "#FFFFFF", borderRadius: 14, padding: 14, border: "1px solid #E7E1D3", cursor: "pointer" }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <img src={req.student.avatar} alt={req.student.name} style={{ width: 40, height: 40, borderRadius: 999, objectFit: "cover" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: "#0F172A" }}>{req.student.name}</div>
                        <StatusBadge status="pending" />
                      </div>
                      <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{req.student.grade}</div>
                      <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                        {req.subjects.map((s) => <SubjectChip key={s} label={s} small />)}
                      </div>
                      <div style={{ marginTop: 6, fontSize: 11, color: "#9CA3AF" }}>
                        {req.plan} · {req.schedule} · From {req.startDate}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {reqTab === "batches" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {BATCH_REQUESTS.map((br) => {
                const slot = SESSION_SLOTS.find((s) => s.id === br.slotId);
                const isFull = !!(slot && slot.students >= slot.capacity);
                const blocked = br.kind === "join" && isFull;
                const action = batchActions[br.id];

                const isConv = br.kind === "conversion";
                const accent = isConv ? { bg: "#E3EDF4", border: "#B9D0E0", color: "#4A7FA5", Icon: Sparkles, label: "Conversion request" } : { bg: "#DCF0E4", border: "#C3E0D0", color: "#3F8A5A", Icon: Lock, label: "Join request" };

                return (
                  <div key={br.id} style={{ background: "#FFFFFF", borderRadius: 14, padding: 14, border: action === "accepted" ? "1px solid #3F8A5A" : action === "rejected" ? "1px solid #F0D0C9" : "1px solid #E7E1D3", opacity: action ? 0.85 : 1 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 8px", borderRadius: 999, background: accent.bg, border: `1px solid ${accent.border}`, marginBottom: 10 }}>
                      <accent.Icon size={11} color={accent.color} />
                      <span style={{ fontSize: 10, color: accent.color, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{accent.label}</span>
                    </div>

                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <img src={br.student.avatar} alt={br.student.name} style={{ width: 40, height: 40, borderRadius: 999, objectFit: "cover" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: "#0F172A" }}>{br.student.name}</div>
                        <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{br.student.grade} · {br.subject}</div>
                        {br.kind === "join" && slot && (
                          <div style={{ marginTop: 8, fontSize: 11, color: "#6B7280", background: "#FBF8F2", border: "1px solid #E7E1D3", borderRadius: 8, padding: "6px 10px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <Lock size={11} color="#4A7FA5" />
                              <span style={{ fontWeight: 500 }}>{slot.label}</span>
                            </div>
                            <div style={{ marginTop: 2, color: "#6B7280" }}>Code: {br.sessionCode} · {slot.students}/{slot.capacity} students</div>
                          </div>
                        )}
                        {br.message && (
                          <div style={{ marginTop: 8, fontSize: 12, color: "#6B7280", lineHeight: 1.5, fontStyle: "italic" }}>
                            "{br.message}"
                          </div>
                        )}
                        <div style={{ marginTop: 6, fontSize: 11, color: "#9CA3AF" }}>{br.submittedAt}</div>
                      </div>
                    </div>

                    {blocked && !action && (
                      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", background: "#F7E4E0", border: "1px solid #F0D0C9", borderRadius: 8 }}>
                        <AlertCircle size={13} color="#C1503D" />
                        <div style={{ fontSize: 11, color: "#C1503D" }}>Session is full ({slot!.students}/{slot!.capacity}). Approval is blocked.</div>
                      </div>
                    )}

                    {!action && (
                      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        <button
                          onClick={() => !blocked && setBatchActions((p) => ({ ...p, [br.id]: "accepted" }))}
                          disabled={blocked}
                          style={{ flex: 1, height: 38, background: blocked ? "#F1ECE0" : "#3F8A5A", color: blocked ? "#9CA3AF" : "#FFFFFF", border: "none", borderRadius: 10, fontSize: 12, fontWeight: 500, cursor: blocked ? "not-allowed" : "pointer", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
                        >
                          <Check size={13} /> Accept
                        </button>
                        <button
                          onClick={() => setBatchActions((p) => ({ ...p, [br.id]: "rejected" }))}
                          style={{ flex: 1, height: 38, background: "#FFFFFF", color: "#C1503D", border: "1px solid #F0D0C9", borderRadius: 10, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
                        >
                          <X size={13} /> Decline
                        </button>
                      </div>
                    )}

                    {action && (
                      <div style={{ marginTop: 10, textAlign: "center", fontSize: 12, color: action === "accepted" ? "#3F8A5A" : "#6B7280" }}>
                        {action === "accepted"
                          ? (br.kind === "conversion" ? "Accepted — session code generated for student" : "Accepted — student added to batch")
                          : "Declined"}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Group batch CTA */}
        <button
          onClick={() => navigate("/tutor/batch")}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 12,
            padding: 14, background: "#E3EDF4", border: "1px solid #B9D0E0", borderRadius: 14,
            cursor: "pointer", fontFamily: "Inter, sans-serif", textAlign: "left",
          }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#4A7FA5", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users2 size={20} color="#FFFFFF" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#4A7FA5" }}>Create a group batch</div>
            <div style={{ fontSize: 12, color: "#4A7FA5", marginTop: 2 }}>Combine 2–6 students into a shared batch</div>
          </div>
          <ChevronRight size={18} color="#4A7FA5" />
        </button>
      </div>

      <BottomNav role="tutor" />
    </div>
  );
}

function Metric({ icon: Icon, color, label, value, trend, trendUp }: { icon: any; color: string; label: string; value: string; trend: string; trendUp?: boolean }) {
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E7E1D3", borderRadius: 14, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}1A`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={16} color={color} />
        </div>
        {trendUp && <TrendingUp size={14} color="#3F8A5A" />}
      </div>
      <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 500, color: "#0F172A", lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11, color: trendUp ? "#3F8A5A" : "#6B7280", marginTop: 4 }}>{trend}</div>
    </div>
  );
}
