import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";

export function OTPVerify() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const navigate = useNavigate();
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setInterval(() => setTimer((p) => p - 1), 1000);
    return () => clearInterval(t);
  }, [timer]);

  const handleChange = (i: number, val: string) => {
    const v = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = v;
    setOtp(next);
    if (v && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  const filled = otp.every((d) => d !== "");

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
      <div style={{ padding: "56px 24px 0" }}>
        <button
          onClick={() => navigate("/phone-entry")}
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
        <div style={{ fontSize: 11, fontWeight: 500, color: "#2F5D50", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          Step 2 of 4
        </div>
        <div style={{ fontSize: 24, fontWeight: 500, color: "#0F172A", marginBottom: 8, lineHeight: 1.3 }}>
          Verify your number
        </div>
        <div style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6 }}>
          We sent a 6-digit code to <span style={{ fontWeight: 500, color: "#0F172A" }}>+977 98XXXXXXXX</span>
        </div>
      </div>

      <div style={{ flex: 1, padding: "36px 24px" }}>
        {/* OTP boxes */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, justifyContent: "center" }}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (refs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              style={{
                width: 48,
                height: 56,
                borderRadius: 12,
                border: digit ? "1.5px solid #2F5D50" : "1px solid #E7E1D3",
                background: "#FFFFFF",
                textAlign: "center",
                fontSize: 22,
                fontWeight: 500,
                color: "#0F172A",
                outline: "none",
                fontFamily: "Inter, sans-serif",
                transition: "all 0.15s",
              }}
            />
          ))}
        </div>

        {/* Timer */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          {timer > 0 ? (
            <div style={{ fontSize: 13, color: "#6B7280" }}>
              Resend code in{" "}
              <span style={{ color: "#2F5D50", fontWeight: 500 }}>
                0:{timer.toString().padStart(2, "0")}
              </span>
            </div>
          ) : (
            <button
              onClick={() => setTimer(60)}
              style={{
                background: "none",
                border: "none",
                color: "#2F5D50",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
              }}
            >
              Resend OTP
            </button>
          )}
        </div>

        <div style={{ fontSize: 12, color: "#9CA3AF", textAlign: "center", lineHeight: 1.7 }}>
          Didn't receive the code? Check your number, or wait for the timer.
        </div>
      </div>

      <div style={{ padding: "0 24px 32px" }}>
        <button
          onClick={() => filled && navigate("/create-password")}
          disabled={!filled}
          style={{
            width: "100%",
            height: 52,
            background: filled ? "#2F5D50" : "#E7E1D3",
            color: filled ? "#FFFFFF" : "#9CA3AF",
            border: "none",
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 500,
            cursor: filled ? "pointer" : "not-allowed",
            fontFamily: "Inter, sans-serif",
            transition: "background 0.2s",
          }}
        >
          Verify & Continue
        </button>
      </div>
    </div>
  );
}
