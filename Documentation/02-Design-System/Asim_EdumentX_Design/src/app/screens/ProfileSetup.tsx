import { useState } from "react";
import { useNavigate } from "react-router";
import { Camera, MapPin, Navigation } from "lucide-react";

const GRADES = ["Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11 (Science)", "Grade 11 (Management)", "Grade 12 (Science)", "Grade 12 (Management)", "BCA", "BSc.IT"];
const SUBJECTS = ["Mathematics", "Science", "English", "Social Studies", "Physics", "Chemistry", "Biology", "Computer Science", "Economics", "Accountancy"];

export function ProfileSetup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [grade, setGrade] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [locationDetected, setLocationDetected] = useState(false);
  const navigate = useNavigate();

  const toggleSubject = (s: string) => {
    setSubjects((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const detectLocation = () => setLocationDetected(true);

  return (
    <div style={{ width: "100%", height: "100%", background: "#FBF8F2", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: "#2F5D50", paddingTop: 52, paddingBottom: 20, paddingLeft: 24, paddingRight: 24, flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 500, color: "#FFFFFF", marginBottom: 4 }}>Set up your profile</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>This helps tutors find and match with you</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 100px" }}>
        {/* Avatar */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <div style={{ position: "relative" }}>
            <div style={{ width: 80, height: 80, borderRadius: 999, background: "#E7E1D3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>
              👤
            </div>
            <div
              style={{ position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: 999, background: "#2F5D50", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <Camera size={14} style={{ color: "#FFFFFF" }} />
            </div>
          </div>
        </div>

        {/* Fields */}
        <div style={{ background: "#FFFFFF", borderRadius: 12, padding: "16px", marginBottom: 12, border: "1px solid #E7E1D3" }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Full Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Aarav Tamang"
            style={{ display: "block", width: "100%", border: "none", outline: "none", fontSize: 15, color: "#0F172A", paddingTop: 8, fontFamily: "Inter, sans-serif", background: "transparent", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ background: "#FFFFFF", borderRadius: 12, padding: "16px", marginBottom: 12, border: "1px solid #E7E1D3" }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Email (optional)</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            style={{ display: "block", width: "100%", border: "none", outline: "none", fontSize: 15, color: "#0F172A", paddingTop: 8, fontFamily: "Inter, sans-serif", background: "transparent", boxSizing: "border-box" }}
          />
        </div>

        {/* Grade selector */}
        <div style={{ background: "#FFFFFF", borderRadius: 12, padding: "16px", marginBottom: 12, border: "1px solid #E7E1D3" }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 10 }}>Grade / Class</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {GRADES.slice(0, 8).map((g) => (
              <button
                key={g}
                onClick={() => setGrade(g)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: grade === g ? "#2F5D50" : "#F1ECE0",
                  color: grade === g ? "#FFFFFF" : "#6B7280",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Subjects */}
        <div style={{ background: "#FFFFFF", borderRadius: 12, padding: "16px", marginBottom: 12, border: "1px solid #E7E1D3" }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 10 }}>Subjects needed</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {SUBJECTS.map((s) => (
              <button
                key={s}
                onClick={() => toggleSubject(s)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: subjects.includes(s) ? "#2F5D50" : "#F1ECE0",
                  color: subjects.includes(s) ? "#FFFFFF" : "#6B7280",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div style={{ background: "#FFFFFF", borderRadius: 12, padding: "16px", marginBottom: 12, border: "1px solid #E7E1D3" }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 10 }}>Your location</label>
          <button
            onClick={detectLocation}
            style={{
              width: "100%",
              height: 44,
              borderRadius: 10,
              border: `1px solid ${locationDetected ? "#3F8A5A" : "#E7E1D3"}`,
              background: locationDetected ? "#E8F8F2" : "#FBF8F2",
              display: "flex",
              alignItems: "center",
              gap: 10,
              paddingLeft: 12,
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
            }}
          >
            <Navigation size={16} style={{ color: locationDetected ? "#3F8A5A" : "#9CA3AF" }} />
            <span style={{ fontSize: 14, color: locationDetected ? "#3F8A5A" : "#6B7280", fontWeight: locationDetected ? 500 : 400 }}>
              {locationDetected ? "📍 Lazimpat, Kathmandu" : "Auto-detect my location"}
            </span>
          </button>
          {!locationDetected && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
              <MapPin size={14} style={{ color: "#9CA3AF" }} />
              <span style={{ fontSize: 12, color: "#9CA3AF" }}>Or tap the map to set manually</span>
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 20px 32px", background: "#FBF8F2", borderTop: "1px solid #E7E1D3" }}>
        <button
          onClick={() => navigate("/student/home")}
          style={{
            width: "100%",
            height: 52,
            background: "#2F5D50",
            color: "#FFFFFF",
            border: "none",
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "Inter, sans-serif",
          }}
        >
          Complete profile
        </button>
      </div>
    </div>
  );
}
