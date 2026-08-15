import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Calendar, Clock, MapPin, Users2, CheckCircle2, Sparkles, MessageSquare, X } from "lucide-react";
import { ENROLLMENTS } from "../data/mockData";
import { ScreenHeader } from "../components/shared/ScreenHeader";
import { SubjectChip } from "../components/shared/SubjectChip";
import { StatusBadge } from "../components/shared/StatusBadge";

export function EnrollmentDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const enrollment = ENROLLMENTS.find((e) => e.id === id) ?? ENROLLMENTS[0];
  const [showSheet, setShowSheet] = useState(false);
  const [requested, setRequested] = useState(false);
  const [note, setNote] = useState("I'd like to share fees with friends as a private batch.");

  const isActive = enrollment.status === "active";

  return (
    <div style={{ width: "100%", height: "100%", background: "#FBF8F2", display: "flex", flexDirection: "column", fontFamily: "Inter, sans-serif", position: "relative" }}>
      <ScreenHeader title="Enrollment details" subtitle={enrollment.tutor.name} backPath={-1 as any} />

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 110px" }}>
        {/* Tutor */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E7E1D3", borderRadius: 14, padding: 16, marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <img src={enrollment.tutor.avatar} alt={enrollment.tutor.name} style={{ width: 56, height: 56, borderRadius: 999, objectFit: "cover" }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 16, fontWeight: 500, color: "#0F172A" }}>{enrollment.tutor.name}</div>
                <StatusBadge status={enrollment.status} />
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                {enrollment.subjects.map((s) => <SubjectChip key={s} label={s} small />)}
              </div>
            </div>
          </div>
        </div>

        {/* Session info */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E7E1D3", borderRadius: 14, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Session type</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 999, background: "#E4EDE9", marginBottom: 14 }}>
            <Users2 size={12} color="#2F5D50" />
            <span style={{ fontSize: 12, color: "#2F5D50", fontWeight: 500 }}>One-to-one</span>
          </div>
          <Row icon={Calendar} label="Period" value={`${enrollment.startDate} → ${enrollment.endDate}`} />
          <Row icon={Clock} label="Schedule" value={`${enrollment.schedule} · ${enrollment.plan}`} />
          <Row icon={MapPin} label="Location" value="Your home — Lazimpat" />
        </div>

        {/* Batch conversion CTA — active 1-to-1 only */}
        {isActive && (
          <div style={{ background: "linear-gradient(135deg, #E3EDF4 0%, #DCF0E4 100%)", border: "1px solid #B9D0E0", borderRadius: 14, padding: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#4A7FA5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={18} color="#FFFFFF" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#4A7FA5" }}>Share the cost with friends</div>
                <div style={{ fontSize: 11, color: "#4A7FA5", marginTop: 2 }}>Convert to a private batch — invite up to 4 friends</div>
              </div>
            </div>
            <ul style={{ margin: 0, padding: "0 0 10px 16px", fontSize: 12, color: "#4338CA", lineHeight: 1.7 }}>
              <li>Tutor receives your request to switch to a private batch</li>
              <li>On acceptance, you get a session code to share</li>
              <li>Up to 5 students total — your friends only</li>
            </ul>
            {requested ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 12px", background: "rgba(255,255,255,0.7)", borderRadius: 10, fontSize: 12, color: "#3F8A5A" }}>
                  <CheckCircle2 size={14} color="#3F8A5A" />
                  <span>Conversion request sent — waiting for tutor.</span>
                </div>
                <button
                  onClick={() => navigate("/student/session-code")}
                  style={{ height: 40, background: "#FFFFFF", color: "#4A7FA5", border: "1px solid #B9D0E0", borderRadius: 10, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}
                >
                  Preview shareable code →
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSheet(true)}
                style={{ width: "100%", height: 44, background: "#4A7FA5", color: "#FFFFFF", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}
              >
                Request batch conversion
              </button>
            )}
          </div>
        )}

        <div style={{ background: "#FFFFFF", border: "1px solid #E7E1D3", borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#0F172A", marginBottom: 10 }}>More</div>
          <button style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 0", border: "none", borderBottom: "1px solid #E7E1D3", background: "none", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
            <MessageSquare size={16} color="#2F5D50" />
            <span style={{ fontSize: 13, color: "#0F172A" }}>Message tutor</span>
          </button>
          <button onClick={() => navigate("/student/review")} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 0", border: "none", background: "none", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
            <Sparkles size={16} color="#E5A03B" />
            <span style={{ fontSize: 13, color: "#0F172A" }}>Rate & review</span>
          </button>
        </div>
      </div>

      {/* Bottom sheet */}
      {showSheet && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(17,24,39,0.5)", display: "flex", alignItems: "flex-end", zIndex: 10 }} onClick={() => setShowSheet(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", background: "#FFFFFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: "20px 16px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ fontSize: 16, fontWeight: 500, color: "#0F172A" }}>Request batch conversion</div>
              <button onClick={() => setShowSheet(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <X size={20} color="#6B7280" />
              </button>
            </div>
            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 14 }}>
              {enrollment.tutor.name} will be asked to convert this session to a private batch (up to 5 students).
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              style={{ width: "100%", border: "1px solid #E7E1D3", borderRadius: 10, padding: "10px 12px", fontSize: 13, color: "#0F172A", fontFamily: "Inter, sans-serif", outline: "none", resize: "none", background: "#FBF8F2", marginBottom: 14, boxSizing: "border-box" }}
              placeholder="Add a note for the tutor"
            />
            <button
              onClick={() => { setRequested(true); setShowSheet(false); }}
              style={{ width: "100%", height: 48, background: "#4A7FA5", color: "#FFFFFF", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}
            >
              Send request
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
      <Icon size={15} color="#6B7280" />
      <div style={{ flex: 1, fontSize: 12, color: "#6B7280" }}>{label}</div>
      <div style={{ fontSize: 13, color: "#0F172A", fontWeight: 500 }}>{value}</div>
    </div>
  );
}
