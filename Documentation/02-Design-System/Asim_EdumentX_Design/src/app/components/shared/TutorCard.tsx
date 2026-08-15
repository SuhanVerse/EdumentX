import { useNavigate } from "react-router";
import { MapPin, Star } from "lucide-react";
import type { Tutor } from "../../data/mockData";
import { BlueTick } from "./BlueTick";
import { SubjectChip } from "./SubjectChip";

interface TutorCardProps {
  tutor: Tutor;
  compact?: boolean;
}

export function TutorCard({ tutor, compact }: TutorCardProps) {
  const navigate = useNavigate();

  if (compact) {
    return (
      <div
        onClick={() => navigate(`/student/tutor/${tutor.id}`)}
        style={{
          background: "#FFFFFF",
          borderRadius: 12,
          padding: 12,
          border: "1px solid #E7E1D3",
          cursor: "pointer",
          width: 170,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div style={{ position: "relative" }}>
          <img
            src={tutor.avatar}
            alt={tutor.name}
            style={{ width: 56, height: 56, borderRadius: 999, objectFit: "cover" }}
          />
          {tutor.verified && (
            <div style={{ position: "absolute", bottom: -2, right: -2 }}>
              <BlueTick size={18} />
            </div>
          )}
        </div>
        <div style={{ textAlign: "center", width: "100%" }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#0F172A", lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {tutor.name}
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", minHeight: 22 }}>
          {tutor.subjects.slice(0, 1).map((s) => (
            <SubjectChip key={s} label={s} small />
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 12, color: "#9CA3AF" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
            <MapPin size={12} />{tutor.distance} km
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
            <Star size={12} fill="#E5A03B" color="#E5A03B" />
            <span style={{ color: "#0F172A" }}>{tutor.rating}</span>
            <span>({tutor.reviews})</span>
          </span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#0F172A" }}>
          Rs {tutor.rate.toLocaleString()}/mo
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => navigate(`/student/tutor/${tutor.id}`)}
      style={{
        background: "#FFFFFF",
        borderRadius: 12,
        padding: 14,
        border: "1px solid #E7E1D3",
        cursor: "pointer",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      <div style={{ position: "relative", flexShrink: 0 }}>
        <img
          src={tutor.avatar}
          alt={tutor.name}
          style={{ width: 48, height: 48, borderRadius: 999, objectFit: "cover" }}
        />
        {tutor.verified && (
          <div style={{ position: "absolute", bottom: -2, right: -2 }}>
            <BlueTick size={16} />
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 500, color: "#0F172A" }}>{tutor.name}</span>
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
          {tutor.subjects.slice(0, 2).map((s) => (
            <SubjectChip key={s} label={s} small />
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#9CA3AF", fontSize: 12 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              <MapPin size={12} />{tutor.distance} km
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              <Star size={12} fill="#E5A03B" color="#E5A03B" />
              <span style={{ color: "#0F172A" }}>{tutor.rating}</span>
              <span>({tutor.reviews})</span>
            </span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#0F172A" }}>
            Rs {tutor.rate.toLocaleString()}/mo
          </span>
        </div>
      </div>
    </div>
  );
}
