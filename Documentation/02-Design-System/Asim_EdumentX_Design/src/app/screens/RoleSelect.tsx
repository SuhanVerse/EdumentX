import { useState } from "react";
import { useNavigate } from "react-router";
import { GraduationCap, BookOpen, ChevronRight, Check, ChevronLeft } from "lucide-react";

type Role = "student" | "tutor" | null;

export function RoleSelect() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>(null);
  const [checkAnim, setCheckAnim] = useState<Role>(null);

  function handleSelect(r: Role) {
    setRole(r);
    setCheckAnim(r);
    setTimeout(() => setCheckAnim(null), 350);
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
        @keyframes popIn {
          0%   { transform: scale(0.4); opacity: 0; }
          60%  { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .check-popin { animation: popIn 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        @keyframes cardPress {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(0.99); }
        }
      `}</style>

      {/* Scroll body */}
      <div style={{ flex: 1, padding: "52px 24px 24px", display: "flex", flexDirection: "column", maxWidth: 420, width: "100%", margin: "0 auto" }}>

        {/* Back link */}
        <button
          onClick={() => navigate(-1)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            marginBottom: 28,
            color: "#2F5D50",
            fontFamily: "Inter, sans-serif",
          }}
        >
          <ChevronLeft size={18} strokeWidth={2} color="#2F5D50" />
          <span style={{ fontSize: 15, fontWeight: 400, color: "#2F5D50" }}>Back</span>
        </button>

        {/* Step eyebrow */}
        <p style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", margin: "0 0 8px", letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Step 1 of 2
        </p>

        {/* Title */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 500, color: "#0F172A", margin: 0, lineHeight: 1.25 }}>
            How will you use EdumentX?
          </h1>
          <div style={{ width: 222, height: 2, background: "#E5A03B", marginTop: 6, borderRadius: 1 }} />
        </div>

        {/* Role cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Student card */}
          <button
            onClick={() => handleSelect("student")}
            style={{
              background: "#FFFFFF",
              border: `${role === "student" ? "2px" : "1px"} solid ${role === "student" ? "#2F5D50" : "#E7E1D3"}`,
              borderRadius: 18,
              padding: "0 16px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 14,
              textAlign: "left",
              width: "100%",
              minHeight: 92,
              fontFamily: "Inter, sans-serif",
              transition: "border-color 0.18s ease",
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.99)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            {/* Icon well */}
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: "#F0EBE0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <GraduationCap size={26} color="#2F5D50" strokeWidth={1.8} />
            </div>

            {/* Text */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#0F172A", marginBottom: 3 }}>
                Student / Parent
              </div>
              <div style={{ fontSize: 15, fontWeight: 400, color: "#6B7280", lineHeight: 1.45 }}>
                Find verified home tutors and manage enrollments.
              </div>
            </div>

            {/* Trailing indicator */}
            {role === "student" ? (
              <div
                className={checkAnim === "student" ? "check-popin" : ""}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 999,
                  background: "#2F5D50",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Check size={14} color="#FFFFFF" strokeWidth={2.5} />
              </div>
            ) : (
              <ChevronRight size={20} color="#9CA3AF" strokeWidth={1.8} />
            )}
          </button>

          {/* Tutor card */}
          <button
            onClick={() => handleSelect("tutor")}
            style={{
              background: "#FFFFFF",
              border: `${role === "tutor" ? "2px" : "1px"} solid ${role === "tutor" ? "#3F8A5A" : "#E7E1D3"}`,
              borderRadius: 18,
              padding: "0 16px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 14,
              textAlign: "left",
              width: "100%",
              minHeight: 92,
              fontFamily: "Inter, sans-serif",
              transition: "border-color 0.18s ease",
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.99)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            {/* Icon well */}
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: "#DCF0E4",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <BookOpen size={26} color="#3F8A5A" strokeWidth={1.8} />
            </div>

            {/* Text */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#0F172A", marginBottom: 3 }}>
                Tutor
              </div>
              <div style={{ fontSize: 15, fontWeight: 400, color: "#6B7280", lineHeight: 1.45 }}>
                List your teaching services and receive enrollment requests.
              </div>
            </div>

            {/* Trailing indicator */}
            {role === "tutor" ? (
              <div
                className={checkAnim === "tutor" ? "check-popin" : ""}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 999,
                  background: "#3F8A5A",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Check size={14} color="#FFFFFF" strokeWidth={2.5} />
              </div>
            ) : (
              <ChevronRight size={20} color="#9CA3AF" strokeWidth={1.8} />
            )}
          </button>
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div style={{ padding: "12px 24px 32px", background: "#FBF8F2", maxWidth: 420, width: "100%", margin: "0 auto" }}>
        <button
          onClick={() => {
            if (!role) return;
            navigate(role === "tutor" ? "/tutor-profile-setup" : "/profile-setup");
          }}
          disabled={!role}
          style={{
            width: "100%",
            height: 56,
            background: role ? "#2F5D50" : "#F1ECE0",
            color: role ? "#FFFFFF" : "#9CA3AF",
            border: "none",
            borderRadius: 14,
            fontSize: 15,
            fontWeight: 500,
            cursor: role ? "pointer" : "not-allowed",
            fontFamily: "Inter, sans-serif",
            transition: "background 0.18s ease, transform 0.1s ease",
          }}
          onMouseDown={(e) => role && ((e.currentTarget as HTMLButtonElement).style.transform = "scale(0.96)")}
          onMouseUp={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1)")}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
