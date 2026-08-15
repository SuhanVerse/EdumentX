import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, Camera, Plus, Minus } from "lucide-react";
import { TUTORS } from "../data/mockData";
import { StatusBar } from "../components/shared/StatusBar";
import { BottomNav } from "../components/shared/BottomNav";

const ALL_SUBJECTS = ["Mathematics", "Physics", "Chemistry", "Biology", "English", "Science", "Social Studies", "Computer Science", "Economics", "Accountancy"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function TutorEditProfile() {
  const navigate = useNavigate();
  const tutor = TUTORS[0];
  const [name, setName] = useState(tutor.name);
  const [rate, setRate] = useState(tutor.rate.toString());
  const [subjects, setSubjects] = useState<string[]>(tutor.subjects);
  const [experience, setExperience] = useState(tutor.experience);
  const [qualifications, setQualifications] = useState(tutor.education);
  const [about, setAbout] = useState(tutor.about);
  const [selectedDays, setSelectedDays] = useState<string[]>(["Mon", "Wed", "Fri", "Sat"]);
  const [radius, setRadius] = useState(5);

  const toggleSubject = (s: string) => {
    setSubjects((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const toggleDay = (d: string) => {
    setSelectedDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  };

  return (
    <div style={{ width: "100%", height: "100%", background: "#FBF8F2", display: "flex", flexDirection: "column" }}>
      <StatusBar />

      {/* Header */}
      <div style={{ background: "#FFFFFF", borderBottom: "1px solid #E7E1D3", display: "flex", alignItems: "center", paddingLeft: 4, paddingRight: 16, height: 56, flexShrink: 0 }}>
        <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", cursor: "pointer", padding: 8 }}>
          <ChevronLeft size={24} style={{ color: "#2F5D50" }} />
        </button>
        <div style={{ fontSize: 17, fontWeight: 500, color: "#0F172A", paddingLeft: 4, flex: 1 }}>Edit profile</div>
        <button style={{ background: "none", border: "none", color: "#2F5D50", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
          Save
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 80px" }}>
        {/* Avatar */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <div style={{ position: "relative" }}>
            <img src={tutor.avatar} alt={tutor.name} style={{ width: 80, height: 80, borderRadius: 999, objectFit: "cover" }} />
            <div style={{ position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: 999, background: "#2F5D50", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Camera size={14} style={{ color: "#FFFFFF" }} />
            </div>
          </div>
        </div>

        {/* Name */}
        <div style={{ background: "#FFFFFF", borderRadius: 12, padding: "14px 16px", marginBottom: 10, border: "1px solid #E7E1D3" }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Full name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ display: "block", width: "100%", border: "none", outline: "none", fontSize: 15, color: "#0F172A", paddingTop: 6, fontFamily: "Inter, sans-serif", background: "transparent", boxSizing: "border-box" }} />
        </div>

        {/* Monthly rate */}
        <div style={{ background: "#FFFFFF", borderRadius: 12, padding: "14px 16px", marginBottom: 10, border: "1px solid #E7E1D3" }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Monthly rate (Rs)</label>
          <input type="number" value={rate} onChange={(e) => setRate(e.target.value)} style={{ display: "block", width: "100%", border: "none", outline: "none", fontSize: 15, color: "#0F172A", paddingTop: 6, fontFamily: "Inter, sans-serif", background: "transparent", boxSizing: "border-box" }} />
        </div>

        {/* Subjects */}
        <div style={{ background: "#FFFFFF", borderRadius: 12, padding: "14px 16px", marginBottom: 10, border: "1px solid #E7E1D3" }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 10 }}>Subjects I teach</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {ALL_SUBJECTS.map((s) => (
              <button key={s} onClick={() => toggleSubject(s)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: subjects.includes(s) ? "#2F5D50" : "#F1ECE0", color: subjects.includes(s) ? "#FFFFFF" : "#6B7280", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Years of experience */}
        <div style={{ background: "#FFFFFF", borderRadius: 12, padding: "14px 16px", marginBottom: 10, border: "1px solid #E7E1D3" }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 10 }}>Years of experience</label>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => setExperience((p) => Math.max(1, p - 1))} style={{ width: 36, height: 36, borderRadius: 999, border: "1px solid #E7E1D3", background: "#FBF8F2", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Minus size={16} style={{ color: "#6B7280" }} />
            </button>
            <span style={{ fontSize: 20, fontWeight: 500, color: "#0F172A", minWidth: 30, textAlign: "center" }}>{experience}</span>
            <button onClick={() => setExperience((p) => p + 1)} style={{ width: 36, height: 36, borderRadius: 999, border: "1px solid #E7E1D3", background: "#FBF8F2", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Plus size={16} style={{ color: "#6B7280" }} />
            </button>
            <span style={{ fontSize: 13, color: "#6B7280" }}>years</span>
          </div>
        </div>

        {/* Qualifications */}
        <div style={{ background: "#FFFFFF", borderRadius: 12, padding: "14px 16px", marginBottom: 10, border: "1px solid #E7E1D3" }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>Qualifications</label>
          <textarea value={qualifications} onChange={(e) => setQualifications(e.target.value)} rows={2} style={{ width: "100%", border: "1px solid #E7E1D3", borderRadius: 8, padding: "8px 10px", fontSize: 14, color: "#0F172A", fontFamily: "Inter, sans-serif", outline: "none", resize: "none", background: "#FBF8F2", boxSizing: "border-box" }} />
        </div>

        {/* About */}
        <div style={{ background: "#FFFFFF", borderRadius: 12, padding: "14px 16px", marginBottom: 10, border: "1px solid #E7E1D3" }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>About me</label>
          <textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={3} style={{ width: "100%", border: "1px solid #E7E1D3", borderRadius: 8, padding: "8px 10px", fontSize: 14, color: "#0F172A", fontFamily: "Inter, sans-serif", outline: "none", resize: "none", background: "#FBF8F2", boxSizing: "border-box" }} />
        </div>

        {/* Service radius map */}
        <div style={{ background: "#FFFFFF", borderRadius: 12, padding: "14px 16px", marginBottom: 10, border: "1px solid #E7E1D3" }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>Service radius: {radius} km</label>
          <div style={{ height: 100, borderRadius: 10, overflow: "hidden", position: "relative", marginBottom: 10 }}>
            <img src="https://images.unsplash.com/photo-1589791933711-d68aae51e609?w=400&h=100&fit=crop" alt="map" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.5 }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: radius * 12, height: radius * 12, borderRadius: 999, border: "2px dashed #2F5D50", background: "rgba(24,95,165,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 8, height: 8, borderRadius: 999, background: "#2F5D50" }} />
              </div>
            </div>
          </div>
          <input type="range" min={1} max={20} value={radius} onChange={(e) => setRadius(Number(e.target.value))} style={{ width: "100%", accentColor: "#2F5D50" }} />
        </div>

        {/* Weekly availability */}
        <div style={{ background: "#FFFFFF", borderRadius: 12, padding: "14px 16px", marginBottom: 10, border: "1px solid #E7E1D3" }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 10 }}>Weekly availability</label>
          <div style={{ display: "flex", gap: 6 }}>
            {DAYS.map((d) => (
              <button key={d} onClick={() => toggleDay(d)} style={{ flex: 1, height: 40, borderRadius: 8, border: "none", background: selectedDays.includes(d) ? "#2F5D50" : "#F1ECE0", color: selectedDays.includes(d) ? "#FFFFFF" : "#6B7280", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      <BottomNav role="tutor" />
    </div>
  );
}
