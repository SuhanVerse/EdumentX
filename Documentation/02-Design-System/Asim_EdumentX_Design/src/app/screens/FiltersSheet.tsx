import { useState } from "react";
import { useNavigate } from "react-router";
import { X } from "lucide-react";

const SUBJECTS = ["Math", "Physics", "Chemistry", "Biology", "English", "Nepali", "Computer", "Accounts"];
const LEVELS = ["Class 6-8", "SEE", "+2 Science", "+2 Mgmt", "Bachelor's"];
const MODES = ["Home tuition", "Online", "At tutor's place"];

export function FiltersSheet() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<string[]>(["Math"]);
  const [level, setLevel] = useState("SEE");
  const [mode, setMode] = useState("Home tuition");
  const [distance, setDistance] = useState(5);
  const [budget, setBudget] = useState(15000);
  const [verifiedOnly, setVerifiedOnly] = useState(true);

  const toggleSubject = (s: string) =>
    setSubjects((arr) => (arr.includes(s) ? arr.filter((x) => x !== s) : [...arr, s]));

  return (
    <div style={{ width: "100%", height: "100%", background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", fontFamily: "Inter, sans-serif" }}>
      <div style={{ width: "100%", background: "#FFFFFF", borderRadius: "20px 20px 0 0", maxHeight: "90%", display: "flex", flexDirection: "column" }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 10 }}>
          <div style={{ width: 40, height: 4, borderRadius: 999, background: "#E7E1D3" }} />
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", padding: "12px 20px 8px" }}>
          <div style={{ flex: 1, fontSize: 17, fontWeight: 500, color: "#0F172A" }}>Filters</div>
          <button
            onClick={() => navigate(-1)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 8, color: "#6B7280", display: "flex" }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px 16px" }}>
          {/* Subjects */}
          <Section title="Subject">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {SUBJECTS.map((s) => {
                const active = subjects.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => toggleSubject(s)}
                    style={{
                      background: active ? "#2F5D50" : "#DCF0E4",
                      color: active ? "#FFFFFF" : "#3F8A5A",
                      border: "none",
                      borderRadius: 999,
                      padding: "8px 14px",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="Level">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {LEVELS.map((l) => (
                <PillSelect key={l} label={l} active={level === l} onClick={() => setLevel(l)} />
              ))}
            </div>
          </Section>

          <Section title="Class mode">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {MODES.map((m) => (
                <PillSelect key={m} label={m} active={mode === m} onClick={() => setMode(m)} />
              ))}
            </div>
          </Section>

          <Section title={`Distance · within ${distance} km`}>
            <input
              type="range" min={1} max={20} value={distance}
              onChange={(e) => setDistance(parseInt(e.target.value))}
              style={{ width: "100%", accentColor: "#2F5D50" }}
            />
          </Section>

          <Section title={`Budget · up to Rs ${budget.toLocaleString()}/mo`}>
            <input
              type="range" min={3000} max={30000} step={500} value={budget}
              onChange={(e) => setBudget(parseInt(e.target.value))}
              style={{ width: "100%", accentColor: "#2F5D50" }}
            />
          </Section>

          <Section title="Verification">
            <button
              onClick={() => setVerifiedOnly((v) => !v)}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "#FBF8F2", border: "1px solid #E7E1D3", borderRadius: 12,
                padding: "14px 14px", cursor: "pointer", fontFamily: "Inter, sans-serif",
              }}
            >
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#0F172A" }}>Verified tutors only</div>
                <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>Show only Blue Tick Pro & Student Tutors</div>
              </div>
              <div
                style={{
                  width: 40, height: 24, borderRadius: 999,
                  background: verifiedOnly ? "#3F8A5A" : "#E7E1D3",
                  position: "relative", transition: "background 0.2s",
                }}
              >
                <div style={{ position: "absolute", top: 2, left: verifiedOnly ? 18 : 2, width: 20, height: 20, borderRadius: 999, background: "#FFFFFF", transition: "left 0.2s" }} />
              </div>
            </button>
          </Section>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", gap: 12, padding: "12px 20px 24px", borderTop: "1px solid #E7E1D3" }}>
          <button
            onClick={() => { setSubjects([]); setLevel(""); setMode(""); setDistance(5); setBudget(15000); }}
            style={{
              flex: 1, height: 48, borderRadius: 12, background: "#FFFFFF",
              border: "1px solid #E7E1D3", color: "#0F172A",
              fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif",
            }}
          >
            Reset
          </button>
          <button
            onClick={() => navigate(-1)}
            style={{
              flex: 2, height: 48, borderRadius: 12, background: "#2F5D50",
              border: "none", color: "#FFFFFF",
              fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif",
            }}
          >
            Show 24 results
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "16px 0", borderBottom: "1px solid #E7E1D3" }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: "#0F172A", marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

function PillSelect({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? "#2F5D50" : "#FFFFFF",
        color: active ? "#FFFFFF" : "#6B7280",
        border: `1px solid ${active ? "#2F5D50" : "#E7E1D3"}`,
        borderRadius: 999,
        padding: "8px 14px",
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {label}
    </button>
  );
}
