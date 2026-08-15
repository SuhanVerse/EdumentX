import { useState } from "react";
import { useNavigate } from "react-router";
import { MapPin, Calendar, CheckCircle2, ShieldCheck, User, Lock, KeyRound } from "lucide-react";
import { TUTORS, TIME_SLOTS, DAYS, SAMPLE_AVAILABILITY } from "../data/mockData";
import { ScreenHeader } from "../components/shared/ScreenHeader";

const PLANS = [
  { label: "1 month", value: 1 },
  { label: "3 months", value: 3, popular: true },
  { label: "6 months", value: 6 },
  { label: "12 months", value: 12 },
];

export function EnrollmentForm() {
  const navigate = useNavigate();
  const tutor = TUTORS[0];
  const availability = SAMPLE_AVAILABILITY;

  const [mode, setMode] = useState<"one-to-one" | "session-code">("one-to-one");
  const [sessionCode, setSessionCode] = useState("");
  const [plan, setPlan] = useState(3);
  const [picked, setPicked] = useState<string[]>(["Mon-evening-1", "Wed-evening-1", "Fri-evening-1"]);
  const [address, setAddress] = useState("");
  const [startDate, setStartDate] = useState("2026-05-12");
  const [trial, setTrial] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const monthlyTotal = tutor.rate * plan * (trial ? 0.5 : 1);

  const toggleSlot = (key: string, state: string) => {
    if (state !== "available") return;
    setPicked((p) => (p.includes(key) ? p.filter((x) => x !== key) : [...p, key]));
  };

  if (submitted) {
    return (
      <div style={{ width: "100%", height: "100%", background: "#FFFFFF", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Inter, sans-serif" }}>
        <div style={{ width: 88, height: 88, borderRadius: 999, background: "#DCF0E4", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <CheckCircle2 size={48} color="#3F8A5A" strokeWidth={1.8} />
        </div>
        <div style={{ fontSize: 22, fontWeight: 500, color: "#0F172A", marginBottom: 8, textAlign: "center" }}>Request sent</div>
        <div style={{ fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 1.6, marginBottom: 32, maxWidth: 320 }}>
          {tutor.name} usually responds within {Math.round(24 - 24 * (tutor.responseRate ?? 90) / 100 + 1)} hours. We'll notify you the moment it's confirmed.
        </div>
        <button
          onClick={() => navigate("/student/enrollments")}
          style={{ width: "100%", height: 52, background: "#2F5D50", color: "#FFFFFF", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}
        >
          View my enrollments
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", background: "#FBF8F2", display: "flex", flexDirection: "column", fontFamily: "Inter, sans-serif", position: "relative" }}>
      <ScreenHeader title="Request to enroll" subtitle={`${tutor.name} · ${tutor.subjects[0]}`} backPath={-1 as any} />

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 120px" }}>
        {/* Mode selector */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E7E1D3", borderRadius: 14, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#0F172A", marginBottom: 4 }}>What are you requesting?</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 12 }}>Pick how you want to learn with this tutor.</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button
              onClick={() => setMode("one-to-one")}
              style={{ padding: 12, borderRadius: 10, textAlign: "left", border: mode === "one-to-one" ? "1.5px solid #2F5D50" : "1px solid #E7E1D3", background: mode === "one-to-one" ? "#E4EDE9" : "#FFFFFF", cursor: "pointer", fontFamily: "Inter, sans-serif" }}
            >
              <User size={18} color={mode === "one-to-one" ? "#2F5D50" : "#6B7280"} />
              <div style={{ fontSize: 13, fontWeight: 500, color: mode === "one-to-one" ? "#2F5D50" : "#0F172A", marginTop: 6 }}>One-to-one</div>
              <div style={{ fontSize: 11, color: mode === "one-to-one" ? "#2F5D50" : "#6B7280", marginTop: 2 }}>Just you with the tutor</div>
            </button>
            <button
              onClick={() => setMode("session-code")}
              style={{ padding: 12, borderRadius: 10, textAlign: "left", border: mode === "session-code" ? "1.5px solid #4A7FA5" : "1px solid #E7E1D3", background: mode === "session-code" ? "#E3EDF4" : "#FFFFFF", cursor: "pointer", fontFamily: "Inter, sans-serif" }}
            >
              <Lock size={18} color={mode === "session-code" ? "#4A7FA5" : "#6B7280"} />
              <div style={{ fontSize: 13, fontWeight: 500, color: mode === "session-code" ? "#4A7FA5" : "#0F172A", marginTop: 6 }}>Join private batch</div>
              <div style={{ fontSize: 11, color: mode === "session-code" ? "#4A7FA5" : "#6B7280", marginTop: 2 }}>You have a session code</div>
            </button>
          </div>
        </div>

        {mode === "session-code" && (
          <div style={{ background: "#FFFFFF", border: "1px solid #E7E1D3", borderRadius: 14, padding: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#0F172A", marginBottom: 4 }}>Enter session code</div>
            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 12 }}>Ask the friend who invited you for the code (e.g. RS-PH-7K2X).</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#FBF8F2", borderRadius: 10, padding: "10px 14px", border: "1px solid #E7E1D3" }}>
              <KeyRound size={18} color="#4A7FA5" />
              <input
                type="text"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                placeholder="XX-XX-XXXX"
                style={{ border: "none", outline: "none", fontSize: 14, color: "#0F172A", background: "transparent", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", flex: 1, letterSpacing: "0.1em" }}
              />
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: "#6B7280", lineHeight: 1.6 }}>
              The tutor reviews each join request individually. If the batch is already full, your request will be blocked automatically.
            </div>
          </div>
        )}

        {mode === "one-to-one" && (
          <div style={{ background: "#E4EDE9", border: "1px solid #C3E0D0", borderRadius: 12, padding: 12, marginBottom: 14, display: "flex", gap: 10 }}>
            <User size={16} color="#2F5D50" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12, color: "#0F172A", lineHeight: 1.6 }}>
              This is a 1-to-1 enrollment. Looking for a public batch? <span onClick={() => navigate("/student/batches")} style={{ color: "#2F5D50", fontWeight: 500, textDecoration: "underline", cursor: "pointer" }}>Browse open batches</span>.
            </div>
          </div>
        )}

        {mode === "one-to-one" && <>
        {/* Plan */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E7E1D3", borderRadius: 14, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#0F172A", marginBottom: 12 }}>Plan duration</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {PLANS.map((p) => {
              const on = plan === p.value;
              return (
                <button
                  key={p.value}
                  onClick={() => setPlan(p.value)}
                  style={{
                    padding: "12px 10px", borderRadius: 10, position: "relative",
                    border: on ? "1.5px solid #2F5D50" : "1px solid #E7E1D3",
                    background: on ? "#E4EDE9" : "#FFFFFF",
                    cursor: "pointer", fontFamily: "Inter, sans-serif", textAlign: "left",
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 500, color: on ? "#2F5D50" : "#0F172A" }}>{p.label}</div>
                  <div style={{ fontSize: 12, color: on ? "#2F5D50" : "#6B7280", marginTop: 2 }}>
                    Rs {(tutor.rate * p.value).toLocaleString()}
                  </div>
                  {p.popular && (
                    <div style={{ position: "absolute", top: -8, right: 8, fontSize: 9, color: "#FFFFFF", background: "#3F8A5A", padding: "2px 6px", borderRadius: 4, fontWeight: 500 }}>POPULAR</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Slot picker */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E7E1D3", borderRadius: 14, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#0F172A", marginBottom: 4 }}>Pick your time slots</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 12 }}>Tap green slots — gray are unavailable.</div>

          <div style={{ overflowX: "auto", margin: "0 -16px", padding: "0 16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "92px repeat(7, 40px)", gap: 4, minWidth: 380 }}>
              <div />
              {DAYS.map((d) => (
                <div key={d} style={{ fontSize: 11, fontWeight: 500, color: "#6B7280", textAlign: "center" }}>{d}</div>
              ))}
              {TIME_SLOTS.map((slot) => (
                <div key={slot.id} style={{ display: "contents" }}>
                  <div style={{ fontSize: 10, color: "#6B7280", display: "flex", alignItems: "center", paddingRight: 4, lineHeight: 1.2 }}>
                    {slot.label}
                  </div>
                  {DAYS.map((d) => {
                    const state = availability[d][slot.id];
                    const key = `${d}-${slot.id}`;
                    const sel = picked.includes(key);
                    const bg = sel ? "#2F5D50" : state === "available" ? "#DCF0E4" : state === "booked" ? "#F1ECE0" : "#FBF8F2";
                    const border = sel ? "#2F5D50" : state === "available" ? "#3F8A5A" : "#E7E1D3";
                    return (
                      <button
                        key={key}
                        disabled={state !== "available"}
                        onClick={() => toggleSlot(key, state)}
                        style={{
                          height: 32,
                          borderRadius: 6,
                          background: bg,
                          border: `1px solid ${border}`,
                          cursor: state === "available" ? "pointer" : "not-allowed",
                          padding: 0,
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: picked.length === 0 ? "#C1503D" : "#3F8A5A" }}>
            {picked.length === 0 ? "Select at least 1 slot" : `${picked.length} slot${picked.length > 1 ? "s" : ""} selected`}
          </div>
        </div>

        {/* Start date */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E7E1D3", borderRadius: 14, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#0F172A", marginBottom: 10 }}>Start date</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#FBF8F2", borderRadius: 10, padding: "10px 14px", border: "1px solid #E7E1D3" }}>
            <Calendar size={18} color="#2F5D50" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ border: "none", outline: "none", fontSize: 14, color: "#0F172A", background: "transparent", fontFamily: "Inter, sans-serif", flex: 1 }}
            />
          </div>
        </div>

        {/* Address */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E7E1D3", borderRadius: 14, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#0F172A", marginBottom: 4 }}>Teaching address</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 10 }}>Shared with the tutor only after they accept.</div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <MapPin size={18} color="#6B7280" style={{ marginTop: 10, flexShrink: 0 }} />
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Block / street / landmark in your area"
              rows={2}
              style={{ flex: 1, border: "1px solid #E7E1D3", borderRadius: 10, padding: "10px 12px", fontSize: 14, color: "#0F172A", fontFamily: "Inter, sans-serif", outline: "none", resize: "none", background: "#FBF8F2" }}
            />
          </div>
        </div>

        {/* Trial */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E7E1D3", borderRadius: 14, padding: 16, marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#0F172A" }}>Trial week (50% off)</div>
            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>Try for a week before committing.</div>
          </div>
          <button
            onClick={() => setTrial((v) => !v)}
            style={{ width: 44, height: 26, borderRadius: 999, border: "none", background: trial ? "#3F8A5A" : "#E7E1D3", position: "relative", cursor: "pointer", padding: 0 }}
          >
            <div style={{ position: "absolute", top: 2, left: trial ? 20 : 2, width: 22, height: 22, borderRadius: 999, background: "#FFFFFF", transition: "left 0.2s" }} />
          </button>
        </div>

        {/* Cost summary */}
        <div style={{ background: "#DCF0E4", border: "1px solid #C3E0D0", borderRadius: 14, padding: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <ShieldCheck size={18} color="#3F8A5A" />
          <div style={{ flex: 1, fontSize: 13, color: "#3F8A5A" }}>Total {plan} months</div>
          <div style={{ fontSize: 18, fontWeight: 500, color: "#3F8A5A" }}>Rs {monthlyTotal.toLocaleString()}</div>
        </div>
        </>}
      </div>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 16px 24px", background: "#FFFFFF", borderTop: "1px solid #E7E1D3" }}>
        {(() => {
          const canSubmit = mode === "one-to-one" ? picked.length > 0 : sessionCode.trim().length >= 6;
          const ctaLabel = mode === "one-to-one" ? "Send enrollment request" : "Send join request";
          return (
            <button
              onClick={() => canSubmit && setSubmitted(true)}
              disabled={!canSubmit}
              style={{
                width: "100%", height: 52,
                background: canSubmit ? (mode === "one-to-one" ? "#2F5D50" : "#4A7FA5") : "#E7E1D3",
                color: canSubmit ? "#FFFFFF" : "#9CA3AF",
                border: "none", borderRadius: 12, fontSize: 15, fontWeight: 500,
                cursor: canSubmit ? "pointer" : "not-allowed",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {ctaLabel}
            </button>
          );
        })()}
      </div>
    </div>
  );
}
