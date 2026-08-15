import { useState } from "react";
import { useNavigate } from "react-router";
import { Bell, Search, MapPin, MessageCircle } from "lucide-react";
import { TUTORS } from "../data/mockData";
import { TutorCard } from "../components/shared/TutorCard";
import { BottomNav } from "../components/shared/BottomNav";
import { StatusBar } from "../components/shared/StatusBar";
import { colors, radius, font } from "../theme/tokens";

export function StudentHome() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const tutors = [...TUTORS].sort((a, b) => a.distance - b.distance);

  return (
    <div style={{ width: "100%", height: "100%", background: colors.paper, display: "flex", flexDirection: "column", position: "relative", fontFamily: font }}>
      <StatusBar />

      {/* Light header */}
      <div style={{ padding: "8px 24px 16px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: colors.muted, marginBottom: 2 }}>Good day,</div>
            <div style={{ display: "inline-block" }}>
              <div style={{ fontSize: 22, fontWeight: 500, color: colors.text }}>Aarav Tamang</div>
              <div style={{ height: 2, background: colors.amber, borderRadius: 1, marginTop: 4, width: "62%" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => navigate("/student/chat")}
              style={{ background: colors.card, border: `1px solid ${colors.hairline}`, borderRadius: 999, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <MessageCircle size={19} color={colors.green} strokeWidth={1.8} />
            </button>
            <button
              onClick={() => navigate("/notifications")}
              style={{ background: colors.card, border: `1px solid ${colors.hairline}`, borderRadius: 999, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}
            >
              <Bell size={20} color={colors.text} strokeWidth={1.8} />
              <div style={{ position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: 999, background: colors.amber, border: `2px solid ${colors.card}` }} />
            </button>
          </div>
        </div>

        {/* Location */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
          <MapPin size={14} color={colors.muted} strokeWidth={1.8} />
          <span style={{ fontSize: 13, color: colors.muted }}>Lazimpat, Kathmandu</span>
        </div>

        {/* Search bar */}
        <div style={{ background: colors.card, border: `1px solid ${colors.hairline}`, borderRadius: radius.card, height: 48, display: "flex", alignItems: "center", paddingLeft: 14, paddingRight: 14, gap: 10 }}>
          <Search size={18} color={colors.placeholder} strokeWidth={1.8} style={{ flexShrink: 0 }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subjects, tutors, locations…"
            style={{ flex: 1, border: "none", outline: "none", fontSize: 15, color: colors.text, fontFamily: font, background: "transparent" }}
          />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 24px", paddingBottom: 88 }}>
        {/* Single amber CTA */}
        <button
          onClick={() => navigate("/student/map")}
          style={{ width: "100%", height: 52, background: colors.amber, color: colors.inverse, border: "none", borderRadius: radius.card, fontSize: 15, fontWeight: 500, cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 24, transition: "transform 0.1s ease" }}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.96)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <MapPin size={18} strokeWidth={2} />
          Explore tutors on the map
        </button>

        {/* Tutor list */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 2 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: colors.text }}>Recommended tutors</div>
          <div style={{ fontSize: 13, color: colors.muted }}>{tutors.length} available</div>
        </div>
        <div style={{ fontSize: 13, color: colors.muted, marginBottom: 12 }}>Verified tutors ready to help you learn</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tutors.map((t) => (
            <TutorCard key={t.id} tutor={t} />
          ))}
        </div>
      </div>

      <BottomNav role="student" />
    </div>
  );
}
