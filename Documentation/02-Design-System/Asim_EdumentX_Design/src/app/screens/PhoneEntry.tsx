import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronDown, Eye, EyeOff } from "lucide-react";

type Mode = "signup" | "login";

export function PhoneEntry() {
  const [mode, setMode] = useState<Mode>("signup");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const navigate = useNavigate();

  const valid =
    phone.length >= 10 && (mode === "signup" || password.length >= 6);

  const handleSubmit = () => {
    if (!valid) return;
    if (mode === "signup") navigate("/otp");
    else navigate("/student/home");
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ padding: "56px 24px 0" }}>
        <button
          onClick={() => navigate("/onboarding")}
          style={{
            background: "none",
            border: "none",
            color: "#2F5D50",
            cursor: "pointer",
            fontSize: 14,
            padding: 0,
            marginBottom: 24,
            fontFamily: "Inter, sans-serif",
          }}
        >
          ← Back
        </button>
        <div style={{ fontSize: 24, fontWeight: 500, color: "#0F172A", marginBottom: 8, lineHeight: 1.3 }}>
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </div>
        <div style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6 }}>
          {mode === "signup"
            ? "Enter your phone number — we'll send a one-time verification code."
            : "Log in with your phone number and password."}
        </div>
      </div>

      {/* Tab segmented control */}
      <div style={{ padding: "24px 24px 0" }}>
        <div
          style={{
            display: "flex",
            background: "#F1ECE0",
            borderRadius: 10,
            padding: 4,
          }}
        >
          {(["signup", "login"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 8,
                background: mode === m ? "#FFFFFF" : "transparent",
                color: mode === m ? "#0F172A" : "#6B7280",
                border: "none",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                boxShadow: mode === m ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
              }}
            >
              {m === "signup" ? "Sign up" : "Log in"}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <div style={{ flex: 1, padding: "24px 24px 0" }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Mobile Number
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #E7E1D3",
                borderRadius: 10,
                height: 52,
                display: "flex",
                alignItems: "center",
                paddingLeft: 12,
                paddingRight: 10,
                gap: 4,
                minWidth: 90,
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 16 }}>🇳🇵</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: "#0F172A" }}>+977</span>
              <ChevronDown size={14} style={{ color: "#9CA3AF" }} />
            </div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="98XXXXXXXX"
              style={{
                flex: 1,
                background: "#FFFFFF",
                border: "1px solid #E7E1D3",
                borderRadius: 10,
                height: 52,
                paddingLeft: 14,
                paddingRight: 14,
                fontSize: 16,
                color: "#0F172A",
                outline: "none",
                fontFamily: "Inter, sans-serif",
                letterSpacing: "0.05em",
              }}
            />
          </div>
        </div>

        {mode === "login" && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Password
            </div>
            <div style={{ position: "relative" }}>
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
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
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 8,
                  color: "#9CA3AF",
                  display: "flex",
                }}
              >
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div style={{ textAlign: "right", marginTop: 8 }}>
              <button
                style={{
                  background: "none",
                  border: "none",
                  color: "#2F5D50",
                  fontSize: 13,
                  cursor: "pointer",
                  padding: 0,
                  fontFamily: "Inter, sans-serif",
                }}
              >
                Forgot password?
              </button>
            </div>
          </div>
        )}

        {mode === "signup" && (
          <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 32 }}>
            Example: 9841234567
          </div>
        )}
      </div>

      {/* CTA */}
      <div style={{ padding: "16px 24px 32px" }}>
        <button
          onClick={handleSubmit}
          disabled={!valid}
          style={{
            width: "100%",
            height: 52,
            background: valid ? "#2F5D50" : "#E7E1D3",
            color: valid ? "#FFFFFF" : "#9CA3AF",
            border: "none",
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 500,
            cursor: valid ? "pointer" : "not-allowed",
            fontFamily: "Inter, sans-serif",
            transition: "background 0.2s",
          }}
        >
          {mode === "signup" ? "Send OTP" : "Log in"}
        </button>
        <div style={{ fontSize: 12, color: "#9CA3AF", textAlign: "center", lineHeight: 1.7, marginTop: 16 }}>
          By continuing, you agree to EdumentX's{" "}
          <span style={{ color: "#2F5D50" }}>Terms</span> and{" "}
          <span style={{ color: "#2F5D50" }}>Privacy Policy</span>
        </div>
      </div>
    </div>
  );
}
