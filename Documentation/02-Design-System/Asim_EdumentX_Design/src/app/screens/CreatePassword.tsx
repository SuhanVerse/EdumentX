import { useState } from "react";
import { useNavigate } from "react-router";
import { Eye, EyeOff, Check } from "lucide-react";

interface Criterion {
  label: string;
  test: (pwd: string) => boolean;
}

const CRITERIA: Criterion[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "Contains a number", test: (p) => /\d/.test(p) },
  { label: "Contains an uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "Contains a symbol", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function CreatePassword() {
  const navigate = useNavigate();
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const passed = CRITERIA.map((c) => c.test(pwd));
  const score = passed.filter(Boolean).length;
  const strength =
    score <= 1 ? { label: "Weak", color: "#C1503D" } :
    score === 2 ? { label: "Fair", color: "#E5A03B" } :
    score === 3 ? { label: "Good", color: "#3F8A5A" } :
    { label: "Strong", color: "#3F8A5A" };

  const valid = score === 4 && confirm === pwd && confirm.length > 0;

  return (
    <div style={{ width: "100%", height: "100%", background: "#FFFFFF", display: "flex", flexDirection: "column", fontFamily: "Inter, sans-serif" }}>
      <div style={{ padding: "56px 24px 0" }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: "none", border: "none", color: "#2F5D50", cursor: "pointer", fontSize: 14, padding: 0, marginBottom: 24, fontFamily: "Inter, sans-serif" }}
        >
          ← Back
        </button>
        <div style={{ fontSize: 11, fontWeight: 500, color: "#2F5D50", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          Step 3 of 4
        </div>
        <div style={{ fontSize: 24, fontWeight: 500, color: "#0F172A", marginBottom: 8, lineHeight: 1.3 }}>
          Create a password
        </div>
        <div style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6 }}>
          You'll use this to log in next time — keep it safe.
        </div>
      </div>

      <div style={{ flex: 1, padding: "32px 24px" }}>
        {/* Password */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Password
          </div>
          <div style={{ position: "relative" }}>
            <input
              type={showPwd ? "text" : "password"}
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="Enter password"
              style={{
                width: "100%",
                background: "#FFFFFF",
                border: "1px solid #E7E1D3",
                borderRadius: 10,
                height: 52,
                paddingLeft: 14,
                paddingRight: 44,
                fontSize: 15,
                color: "#0F172A",
                outline: "none",
                fontFamily: "Inter, sans-serif",
                boxSizing: "border-box",
              }}
            />
            <button
              onClick={() => setShowPwd((v) => !v)}
              style={{
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", padding: 8, color: "#9CA3AF", display: "flex",
              }}
            >
              {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Strength bar */}
        {pwd.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    flex: 1, height: 4, borderRadius: 999,
                    background: i < score ? strength.color : "#E7E1D3",
                  }}
                />
              ))}
            </div>
            <div style={{ fontSize: 12, color: strength.color, fontWeight: 500 }}>
              {strength.label}
            </div>
          </div>
        )}

        {/* Criteria */}
        <div style={{ background: "#FBF8F2", border: "1px solid #E7E1D3", borderRadius: 12, padding: 14, marginBottom: 20 }}>
          {CRITERIA.map((c, i) => {
            const ok = passed[i];
            return (
              <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                <div
                  style={{
                    width: 18, height: 18, borderRadius: 999,
                    background: ok ? "#3F8A5A" : "#E7E1D3",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Check size={12} color="#FFFFFF" strokeWidth={3} />
                </div>
                <span style={{ fontSize: 13, color: ok ? "#0F172A" : "#6B7280" }}>{c.label}</span>
              </div>
            );
          })}
        </div>

        {/* Confirm */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Confirm password
          </div>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter password"
            style={{
              width: "100%",
              background: "#FFFFFF",
              border: `1px solid ${confirm && confirm !== pwd ? "#C1503D" : "#E7E1D3"}`,
              borderRadius: 10,
              height: 52,
              paddingLeft: 14,
              paddingRight: 14,
              fontSize: 15,
              color: "#0F172A",
              outline: "none",
              fontFamily: "Inter, sans-serif",
              boxSizing: "border-box",
            }}
          />
          {confirm && confirm !== pwd && (
            <div style={{ fontSize: 12, color: "#C1503D", marginTop: 6 }}>
              Passwords don't match
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: "0 24px 32px" }}>
        <button
          onClick={() => valid && navigate("/role-select")}
          disabled={!valid}
          style={{
            width: "100%", height: 52,
            background: valid ? "#2F5D50" : "#E7E1D3",
            color: valid ? "#FFFFFF" : "#9CA3AF",
            border: "none", borderRadius: 12,
            fontSize: 15, fontWeight: 500,
            cursor: valid ? "pointer" : "not-allowed",
            fontFamily: "Inter, sans-serif",
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
