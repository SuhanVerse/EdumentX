import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Mail, Eye, EyeOff } from "lucide-react";

type Mode = "signup" | "login";

function getStrength(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

function strengthLabel(score: number): { label: string; color: string } {
  if (score <= 2) return { label: score === 1 ? "Too weak" : "Weak", color: "#C1503D" };
  if (score === 3) return { label: "Fair", color: "#E5A03B" };
  return { label: score === 4 ? "Strong" : "Very strong", color: "#3F8A5A" };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailSignup() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [emailShake, setEmailShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const emailValid = EMAIL_RE.test(email);
  const passwordValid = password.length >= 6;
  const canSubmit = emailValid && passwordValid;

  const emailError = emailTouched && !emailValid ? "Enter a valid email address." : null;
  const passwordError = passwordTouched && !passwordValid ? "Use at least 6 characters." : null;

  const strength = getStrength(password);
  const { label: strengthLbl, color: strengthColor } = strengthLabel(strength);

  function handleEmailBlur() {
    setEmailTouched(true);
    if (!emailValid) {
      setEmailShake(true);
      setTimeout(() => setEmailShake(false), 400);
    }
  }

  function handleSubmit() {
    setEmailTouched(true);
    setPasswordTouched(true);
    if (!canSubmit) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate("/role-selection");
    }, 1200);
  }

  function handleGoogle() {
    setGoogleLoading(true);
    setTimeout(() => {
      setGoogleLoading(false);
      navigate("/role-selection");
    }, 1400);
  }

  function emailBorderColor() {
    if (emailTouched && !emailValid) return "#C1503D";
    if (emailTouched && emailValid) return "#3F8A5A";
    return "#E7E1D3";
  }

  function passwordBorderColor() {
    if (passwordTouched && !passwordValid) return "#C1503D";
    if (passwordTouched && passwordValid) return "#3F8A5A";
    return "#E7E1D3";
  }

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100%",
        background: "#FBF8F2",
        fontFamily: "Inter, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .field-shake { animation: shake 0.4s ease; }
      `}</style>

      <div style={{ flex: 1, padding: "56px 24px 32px", display: "flex", flexDirection: "column", gap: 0, maxWidth: 420, width: "100%", margin: "0 auto" }}>
        {/* Heading */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 500, color: "#0F172A", margin: 0, lineHeight: 1.25 }}>
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <div
            style={{
              width: mode === "signup" ? 192 : 136,
              height: 2,
              background: "#E5A03B",
              marginTop: 6,
              marginBottom: 12,
              borderRadius: 1,
              transition: "width 0.25s ease",
            }}
          />
          <p style={{ fontSize: 15, fontWeight: 400, color: "#6B7280", margin: 0, maxWidth: 320 }}>
            {mode === "signup"
              ? "Sign up with email or Google."
              : "Enter the email and password you signed up with."}
          </p>
        </div>

        {/* Mode toggle */}
        <div
          style={{
            display: "flex",
            background: "#F1ECE0",
            borderRadius: 12,
            padding: 4,
            gap: 4,
            marginBottom: 24,
          }}
        >
          {(["signup", "login"] as Mode[]).map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1,
                  height: 38,
                  borderRadius: 9,
                  border: active ? "1px solid #E7E1D3" : "none",
                  background: active ? "#FFFFFF" : "transparent",
                  fontSize: 14,
                  fontWeight: 500,
                  color: active ? "#0F172A" : "#6B7280",
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                  transition: "all 0.18s ease",
                }}
              >
                {m === "signup" ? "Sign up" : "Log in"}
              </button>
            );
          })}
        </div>

        {/* Email field */}
        <div style={{ marginBottom: emailError ? 6 : 20 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6B7280", marginBottom: 6, letterSpacing: "0.01em" }}>
            Email
          </label>
          <div
            className={emailShake ? "field-shake" : ""}
            style={{
              display: "flex",
              alignItems: "center",
              height: 48,
              background: "#FFFFFF",
              borderRadius: 14,
              border: `2px solid ${emailBorderColor()}`,
              transition: "border-color 0.18s ease",
              paddingLeft: 14,
              paddingRight: 14,
              gap: 10,
            }}
          >
            <Mail size={18} color="#6B7280" strokeWidth={1.8} style={{ flexShrink: 0 }} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={handleEmailBlur}
              placeholder="you@example.com"
              autoComplete="email"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 15,
                color: "#0F172A",
                fontFamily: "Inter, sans-serif",
              }}
            />
          </div>
          {emailError && (
            <p style={{ fontSize: 13, color: "#C1503D", margin: "4px 0 0", fontWeight: 400 }}>{emailError}</p>
          )}
        </div>

        {/* Password field */}
        <div style={{ marginBottom: passwordError ? 6 : 20 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6B7280", marginBottom: 6, letterSpacing: "0.01em" }}>
            Password
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              height: 48,
              background: "#FFFFFF",
              borderRadius: 14,
              border: `2px solid ${passwordBorderColor()}`,
              transition: "border-color 0.18s ease",
              paddingLeft: 14,
              paddingRight: 14,
              gap: 10,
            }}
          >
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setPasswordTouched(true)}
              placeholder="At least 6 characters"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 15,
                color: "#0F172A",
                fontFamily: "Inter, sans-serif",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "12px 0 12px 8px",
                color: "#6B7280",
                display: "flex",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              {showPassword ? <EyeOff size={20} strokeWidth={1.8} /> : <Eye size={20} strokeWidth={1.8} />}
            </button>
          </div>
          {passwordError && (
            <p style={{ fontSize: 13, color: "#C1503D", margin: "4px 0 0", fontWeight: 400 }}>{passwordError}</p>
          )}
        </div>

        {/* Password strength bar (signup only, shown when typing) */}
        {mode === "signup" && password.length > 0 && (
          <div style={{ marginBottom: 20, marginTop: -8 }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
              {[1, 2, 3, 4, 5].map((seg) => (
                <div
                  key={seg}
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    background: seg <= strength ? strengthColor : "#E7E1D3",
                    transition: "background 0.2s ease",
                  }}
                />
              ))}
            </div>
            <p style={{ fontSize: 13, color: strengthColor, margin: 0, fontWeight: 500, transition: "color 0.2s ease" }}>
              {strengthLbl}
            </p>
          </div>
        )}

        {/* Primary CTA */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          style={{
            width: "100%",
            height: 52,
            background: canSubmit ? "#2F5D50" : "#F1ECE0",
            color: canSubmit ? "#FFFFFF" : "#6B7280",
            border: "none",
            borderRadius: 14,
            fontSize: 15,
            fontWeight: 500,
            cursor: canSubmit ? "pointer" : "not-allowed",
            fontFamily: "Inter, sans-serif",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "background 0.18s ease, transform 0.1s ease",
          }}
          onMouseDown={(e) => canSubmit && ((e.currentTarget as HTMLButtonElement).style.transform = "scale(0.96)")}
          onMouseUp={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1)")}
        >
          {loading ? (
            <>
              <Spinner color="#FFFFFF" />
              {mode === "signup" ? "Sending…" : "Logging in…"}
            </>
          ) : (
            mode === "signup" ? "Create account" : "Log in"
          )}
        </button>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: "#E7E1D3" }} />
          <span style={{ fontSize: 13, color: "#9CA3AF", fontWeight: 400 }}>or</span>
          <div style={{ flex: 1, height: 1, background: "#E7E1D3" }} />
        </div>

        {/* Google button */}
        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          style={{
            width: "100%",
            height: 52,
            background: "#FFFFFF",
            border: "2px solid #E7E1D3",
            borderRadius: 14,
            fontSize: 14,
            fontWeight: 500,
            color: "#0F172A",
            cursor: "pointer",
            fontFamily: "Inter, sans-serif",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            transition: "transform 0.1s ease",
          }}
          onMouseDown={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)")}
          onMouseUp={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1)")}
        >
          {googleLoading ? (
            <>
              <Spinner color="#2F5D50" />
              Opening Google…
            </>
          ) : (
            <>
              <GoogleGlyph />
              Continue with Google
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function Spinner({ color }: { color: string }) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 18 18"
      style={{ animation: "spin 0.7s linear infinite" }}
    >
      <style>{"@keyframes spin { to { transform: rotate(360deg) } }"}</style>
      <circle cx={9} cy={9} r={7} fill="none" stroke={color} strokeWidth={2} strokeDasharray="28 16" strokeLinecap="round" />
    </svg>
  );
}

function GoogleGlyph() {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
