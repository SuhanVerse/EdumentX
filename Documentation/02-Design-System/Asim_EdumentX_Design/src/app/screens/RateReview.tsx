import { useState } from "react";
import { useNavigate } from "react-router";
import { ShieldCheck, Lock, CheckCircle2, Camera } from "lucide-react";
import { TUTORS } from "../data/mockData";
import { TapStarRating } from "../components/shared/StarRating";
import { ScreenHeader } from "../components/shared/ScreenHeader";
import { BlueTick } from "../components/shared/BlueTick";

const MIN_CHARS = 30;
const MAX_CHARS = 500;
const SESSIONS_COMPLETED = 4; // mock — must be ≥ 2 to unlock

const DIMENSIONS = [
  { key: "teaching", label: "Teaching Quality", help: "Clarity, structure, and depth of explanations" },
  { key: "punctuality", label: "Punctuality", help: "Showed up on time and stayed for the full session" },
  { key: "communication", label: "Communication", help: "Responsiveness and patience with questions" },
  { key: "knowledge", label: "Subject Knowledge", help: "Mastery of the subject and exam patterns" },
  { key: "overall", label: "Overall Experience", help: "How would you sum up the experience?" },
] as const;

const TAGS = [
  "Very clear explanations",
  "Patient with questions",
  "Always on time",
  "Great for exam prep",
  "Affordable",
  "Good for beginners",
];

type Dim = typeof DIMENSIONS[number]["key"];

export function RateReview() {
  const navigate = useNavigate();
  const tutor = TUTORS[0];
  const locked = SESSIONS_COMPLETED < 2;

  const [ratings, setRatings] = useState<Record<Dim, number>>({
    teaching: 0, punctuality: 0, communication: 0, knowledge: 0, overall: 0,
  });
  const [review, setReview] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const allRated = Object.values(ratings).every((r) => r > 0);
  const reviewValid = review.length >= MIN_CHARS && review.length <= MAX_CHARS;
  const canSubmit = allRated && reviewValid && !locked;

  const toggleTag = (t: string) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  if (submitted) {
    return (
      <div style={{ width: "100%", height: "100%", background: "#FFFFFF", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Inter, sans-serif" }}>
        <div style={{ width: 88, height: 88, borderRadius: 999, background: "#DCF0E4", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <CheckCircle2 size={48} color="#3F8A5A" strokeWidth={1.8} />
        </div>
        <div style={{ fontSize: 22, fontWeight: 500, color: "#0F172A", marginBottom: 8, textAlign: "center" }}>Review submitted</div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, background: "#DCF0E4", marginBottom: 16 }}>
          <ShieldCheck size={14} color="#3F8A5A" />
          <span style={{ fontSize: 12, color: "#3F8A5A", fontWeight: 500 }}>Verified Enrollment</span>
        </div>
        <div style={{ fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 1.6, marginBottom: 32, maxWidth: 320 }}>
          Thanks for sharing honest feedback — it helps other students make confident choices.
        </div>
        <button
          onClick={() => navigate("/student/enrollments")}
          style={{ width: "100%", height: 52, background: "#2F5D50", color: "#FFFFFF", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}
        >
          Back to enrollments
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", background: "#FBF8F2", display: "flex", flexDirection: "column", fontFamily: "Inter, sans-serif", position: "relative" }}>
      <ScreenHeader title="Rate & Review" backPath="/student/enrollments" />

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 120px" }}>
        {/* Tutor identity card */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E7E1D3", borderRadius: 14, padding: 14, marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative" }}>
            <img src={tutor.avatar} alt={tutor.name} style={{ width: 56, height: 56, borderRadius: 999, objectFit: "cover" }} />
            <div style={{ position: "absolute", bottom: -2, right: -2 }}>
              <BlueTick size={18} tier={tutor.tier ?? "phone"} />
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 500, color: "#0F172A" }}>{tutor.name}</div>
            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{tutor.subjects.slice(0, 2).join(" · ")}</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, padding: "3px 8px", borderRadius: 999, background: "#DCF0E4" }}>
              <ShieldCheck size={11} color="#3F8A5A" />
              <span style={{ fontSize: 11, color: "#3F8A5A", fontWeight: 500 }}>
                {SESSIONS_COMPLETED} sessions · Verified Enrollment
              </span>
            </div>
          </div>
        </div>

        {locked ? (
          <div style={{ background: "#FBEFD9", border: "1px solid #FDE68A", borderRadius: 14, padding: 20, textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: 999, background: "#FDE68A", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Lock size={22} color="#B45309" />
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, color: "#92400E", marginBottom: 6 }}>Review locked</div>
            <div style={{ fontSize: 13, color: "#B45309", lineHeight: 1.6 }}>
              You can submit a review after completing at least 2 confirmed sessions with this tutor.
            </div>
          </div>
        ) : (
          <>
            {/* Multi-dimensional ratings */}
            <div style={{ background: "#FFFFFF", border: "1px solid #E7E1D3", borderRadius: 14, padding: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#0F172A", marginBottom: 4 }}>Rate each dimension</div>
              <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 14 }}>All five required · 1 to 5 stars</div>
              {DIMENSIONS.map((d, i) => (
                <div
                  key={d.key}
                  style={{
                    paddingTop: i === 0 ? 0 : 12,
                    paddingBottom: i === DIMENSIONS.length - 1 ? 0 : 12,
                    borderBottom: i < DIMENSIONS.length - 1 ? "1px solid #E7E1D3" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#0F172A" }}>{d.label}</div>
                      <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{d.help}</div>
                    </div>
                    <TapStarRating
                      value={ratings[d.key]}
                      onChange={(v) => setRatings((r) => ({ ...r, [d.key]: v }))}
                      size={22}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Written review */}
            <div style={{ background: "#FFFFFF", border: "1px solid #E7E1D3", borderRadius: 14, padding: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#0F172A", marginBottom: 4 }}>Write a review</div>
              <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 10 }}>
                Minimum {MIN_CHARS} characters — share what worked and what could improve.
              </div>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value.slice(0, MAX_CHARS))}
                placeholder="My tutor explained calculus step by step using real exam questions. They were patient when I got stuck and made sure I understood before moving on…"
                rows={6}
                style={{
                  width: "100%",
                  border: "1px solid #E7E1D3",
                  borderRadius: 10,
                  padding: "12px 14px",
                  fontSize: 14,
                  color: "#0F172A",
                  fontFamily: "Inter, sans-serif",
                  outline: "none",
                  resize: "none",
                  background: "#FBF8F2",
                  boxSizing: "border-box",
                  lineHeight: 1.6,
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11 }}>
                <span style={{ color: review.length < MIN_CHARS ? "#C1503D" : "#3F8A5A" }}>
                  {review.length < MIN_CHARS ? `${MIN_CHARS - review.length} more characters needed` : "Looks good"}
                </span>
                <span style={{ color: "#9CA3AF" }}>
                  {review.length}/{MAX_CHARS}
                </span>
              </div>
            </div>

            {/* Tags */}
            <div style={{ background: "#FFFFFF", border: "1px solid #E7E1D3", borderRadius: 14, padding: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#0F172A", marginBottom: 4 }}>What stood out? (optional)</div>
              <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 12 }}>Tap any that apply.</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {TAGS.map((t) => {
                  const on = tags.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={() => toggleTag(t)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 999,
                        border: on ? "1px solid #2F5D50" : "1px solid #E7E1D3",
                        background: on ? "#E4EDE9" : "#FFFFFF",
                        color: on ? "#2F5D50" : "#6B7280",
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: "pointer",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Photo (optional) */}
            <button
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                background: "#FFFFFF", border: "1px dashed #E7E1D3", borderRadius: 14,
                padding: "14px 16px", cursor: "pointer", fontFamily: "Inter, sans-serif",
              }}
            >
              <Camera size={18} color="#6B7280" />
              <span style={{ fontSize: 13, color: "#6B7280" }}>Add a photo (optional)</span>
            </button>
          </>
        )}
      </div>

      {/* Submit */}
      {!locked && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 16px 24px", background: "#FFFFFF", borderTop: "1px solid #E7E1D3" }}>
          <button
            onClick={() => canSubmit && setSubmitted(true)}
            disabled={!canSubmit}
            style={{
              width: "100%", height: 52,
              background: canSubmit ? "#2F5D50" : "#E7E1D3",
              color: canSubmit ? "#FFFFFF" : "#9CA3AF",
              border: "none", borderRadius: 12,
              fontSize: 15, fontWeight: 500,
              cursor: canSubmit ? "pointer" : "not-allowed",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Submit review
          </button>
        </div>
      )}
    </div>
  );
}
