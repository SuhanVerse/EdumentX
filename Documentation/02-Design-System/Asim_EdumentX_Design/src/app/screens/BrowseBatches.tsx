import { useState } from "react";
import { useNavigate } from "react-router";
import { Users2, MapPin, Clock, Search } from "lucide-react";
import { ScreenHeader } from "../components/shared/ScreenHeader";
import { BottomNav } from "../components/shared/BottomNav";
import { SubjectChip } from "../components/shared/SubjectChip";

interface Batch {
  id: string;
  subject: string;
  level: string;
  tutor: string;
  area: string;
  distance: number;
  schedule: string;
  filled: number;
  capacity: number;
  pricePerStudent: number;
}

const BATCHES: Batch[] = [
  { id: "b1", subject: "Math", level: "SEE", tutor: "Bishal Acharya", area: "Baluwatar", distance: 1.2, schedule: "Mon/Wed/Fri · 6 PM", filled: 4, capacity: 6, pricePerStudent: 3500 },
  { id: "b2", subject: "Physics", level: "+2 Science", tutor: "Riya Shrestha", area: "Lazimpat", distance: 2.4, schedule: "Tue/Thu/Sat · 7 PM", filled: 3, capacity: 5, pricePerStudent: 4500 },
  { id: "b3", subject: "Chemistry", level: "+2 Science", tutor: "Anil Karki", area: "Naxal", distance: 3.0, schedule: "Daily · 5 PM", filled: 5, capacity: 6, pricePerStudent: 4000 },
  { id: "b4", subject: "English", level: "Class 8", tutor: "Sita Magar", area: "Maharajgunj", distance: 4.1, schedule: "Mon/Wed · 4 PM", filled: 2, capacity: 4, pricePerStudent: 2500 },
];

export function BrowseBatches() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const filtered = BATCHES.filter((b) =>
    [b.subject, b.tutor, b.area].some((f) => f.toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <div style={{ width: "100%", height: "100%", background: "#FBF8F2", display: "flex", flexDirection: "column", fontFamily: "Inter, sans-serif" }}>
      <ScreenHeader title="Browse open batches" subtitle="Join an existing group class near you" backPath="/student/home" />

      <div style={{ padding: "14px 16px 8px" }}>
        <div style={{ background: "#FFFFFF", border: "1px solid #E7E1D3", borderRadius: 12, height: 44, display: "flex", alignItems: "center", paddingLeft: 12, paddingRight: 12, gap: 10 }}>
          <Search size={16} color="#9CA3AF" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subject, tutor, area"
            style={{ flex: 1, border: "none", outline: "none", fontSize: 14, color: "#0F172A", background: "transparent", fontFamily: "Inter, sans-serif" }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 88px", display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map((b) => {
          const pct = Math.round((b.filled / b.capacity) * 100);
          const seatsLeft = b.capacity - b.filled;
          return (
            <div
              key={b.id}
              style={{ background: "#FFFFFF", border: "1px solid #E7E1D3", borderRadius: 14, padding: 14 }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <SubjectChip label={`${b.subject} · ${b.level}`} small />
                <div style={{ fontSize: 12, color: seatsLeft <= 1 ? "#C1503D" : "#3F8A5A", fontWeight: 500 }}>
                  {seatsLeft} {seatsLeft === 1 ? "seat" : "seats"} left
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 500, color: "#0F172A", marginBottom: 4 }}>
                with {b.tutor}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12, color: "#6B7280", marginBottom: 10 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <MapPin size={12} /> {b.area} · {b.distance} km
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Clock size={12} /> {b.schedule}
                </span>
              </div>
              {/* Capacity meter */}
              <div style={{ background: "#F1ECE0", height: 6, borderRadius: 999, overflow: "hidden", marginBottom: 10 }}>
                <div style={{ width: `${pct}%`, height: "100%", background: pct >= 80 ? "#E5A03B" : "#3F8A5A", borderRadius: 999 }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6B7280" }}>
                  <Users2 size={14} /> {b.filled}/{b.capacity} students
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#0F172A" }}>
                  Rs {b.pricePerStudent.toLocaleString()}/mo each
                </div>
              </div>
              <button
                onClick={() => navigate("/student/enroll")}
                style={{
                  width: "100%", marginTop: 12, height: 44,
                  background: "#2F5D50", color: "#FFFFFF",
                  border: "none", borderRadius: 10,
                  fontSize: 14, fontWeight: 500, cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                Request to join
              </button>
            </div>
          );
        })}
      </div>

      <BottomNav role="student" />
    </div>
  );
}
