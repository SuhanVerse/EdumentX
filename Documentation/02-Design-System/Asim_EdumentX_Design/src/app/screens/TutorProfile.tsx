import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ChevronLeft,
  Heart,
  Share2,
  ShieldCheck,
  Star,
  MapPin,
  User,
  Users,
  Lock,
  Calendar,
  Play,
  MessageCircle,
  Briefcase,
  ChevronRight,
} from "lucide-react";
import { colors, radius, font } from "../theme/tokens";
import {
  TUTORS,
  REVIEWS,
  SESSION_SLOTS,
  SAMPLE_AVAILABILITY,
  TIME_SLOTS,
  DAYS,
  type SessionSlot,
} from "../data/mockData";
import { SubjectChip } from "../components/shared/SubjectChip";

export function TutorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tutor = TUTORS.find((t) => t.id === id) ?? TUTORS[0];

  const [saved, setSaved] = useState(false);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<Record<string, boolean>>({});

  const firstName = (tutor.name ?? "Tutor").split(" ")[0];
  const [area, city] = (tutor.area ?? "").split(",").map((s) => s.trim());

  const bio =
    tutor.about ??
    "This tutor has not added a bio yet. Reach out to learn more about their teaching approach and experience.";
  const bioTruncated = bio.length > 160 && !aboutExpanded ? bio.slice(0, 160).trimEnd() + "…" : bio;

  const toggleSlot = (key: string) =>
    setSelectedSlots((prev) => ({ ...prev, [key]: !prev[key] }));

  // Derive a rough star distribution from the tutor's distribution or reviews count.
  const totalReviews = tutor.reviews ?? 0;
  const dist = tutor.ratingDistribution ?? { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: colors.paper,
        display: "flex",
        flexDirection: "column",
        fontFamily: font,
        position: "relative",
        color: colors.text,
      }}
    >
      {/* 1. Fixed top bar */}
      <div
        style={{
          padding: "44px 20px 8px",
          background: colors.paper,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <PillButton onClick={() => navigate(-1)}>
          <ChevronLeft size={20} color={colors.text} />
        </PillButton>
        <div style={{ display: "flex", gap: 8 }}>
          <PillButton onClick={() => setSaved((v) => !v)}>
            <Heart
              size={18}
              color={saved ? colors.danger : colors.muted}
              fill={saved ? colors.danger : "transparent"}
            />
          </PillButton>
          <PillButton onClick={() => { /* share */ }}>
            <Share2 size={18} color={colors.muted} />
          </PillButton>
        </div>
      </div>

      {/* 2. Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 120px" }}>
        {/* Profile header */}
        <div style={{ paddingTop: 8 }}>
          <div style={{ position: "relative", width: 72, height: 72, marginBottom: 12 }}>
            <img
              src={tutor.avatar}
              alt={tutor.name}
              style={{
                width: 72,
                height: 72,
                borderRadius: radius.pill,
                objectFit: "cover",
                border: "2px solid rgba(229,160,59,0.3)",
              }}
            />
            {tutor.verified && (
              <span
                style={{
                  position: "absolute",
                  bottom: -2,
                  right: -2,
                  width: 24,
                  height: 24,
                  borderRadius: radius.pill,
                  background: colors.verifyTint,
                  border: "2px solid " + colors.paper,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ShieldCheck size={13} color={colors.verify} />
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 20, fontWeight: 600, color: colors.text }}>{tutor.name}</span>
            {tutor.verified && <ShieldCheck size={16} color={colors.verify} />}
          </div>

          <div style={{ fontSize: 15, color: colors.muted, marginTop: 4 }}>
            {(tutor.subjects ?? []).join(" · ") || "Tutor"}
          </div>

          {(area || city) && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
              <MapPin size={12} color={colors.muted} />
              <span style={{ fontSize: 13, fontWeight: 500, color: colors.muted }}>
                {[area, city].filter(Boolean).join(", ")}
              </span>
            </div>
          )}

          {/* Subject pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
            {(tutor.subjects ?? []).map((s) => (
              <SubjectChip key={s} label={s} />
            ))}
          </div>

          {/* Stat row */}
          <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
            <StatCell
              icon={<Star size={18} color={colors.amber} fill={colors.amber} />}
              value={(tutor.rating ?? 0).toFixed(1)}
              label="Rating"
            />
            <StatCell
              icon={<Briefcase size={18} color={colors.muted} />}
              value={`${tutor.experience ?? 0}y`}
              label="Experience"
            />
            <StatCell
              icon={<MessageCircle size={18} color={colors.muted} />}
              value={String(tutor.reviews ?? 0)}
              label="Reviews"
            />
          </div>
        </div>

        {/* Pricing */}
        <div style={{ display: "flex", gap: 16, marginTop: 24 }}>
          <div style={cardStyle()}>
            <IconWell>
              <User size={18} color={colors.amber} />
            </IconWell>
            <div style={overlineStyle}>1-TO-1</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: colors.text }}>
              Rs {(tutor.rate ?? 0).toLocaleString()}
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: colors.muted, marginTop: 2 }}>/month</div>
          </div>
          <div
            style={{ ...cardStyle(), cursor: "pointer" }}
            onClick={() => navigate("/student/messages")}
          >
            <IconWell>
              <Users size={18} color={colors.amber} />
            </IconWell>
            <div style={overlineStyle}>GROUP BATCH</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: colors.muted, marginTop: 2, lineHeight: 1.4 }}>
              Message to ask about rates
            </div>
          </div>
        </div>

        {/* Session Board */}
        <Section
          title="Session Board"
          trailing={
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: colors.green,
                background: colors.greenTint,
                padding: "3px 10px",
                borderRadius: radius.pill,
              }}
            >
              {SESSION_SLOTS.length} slots
            </span>
          }
        >
          <div style={{ fontSize: 13, fontWeight: 500, color: colors.muted, marginBottom: 12 }}>
            Live one-to-one and batch sessions {firstName} is running right now.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {SESSION_SLOTS.filter((s) => s.status !== "empty").map((s) => (
              <SessionCard key={s.id} slot={s} />
            ))}

            {/* Empty-slot CTA */}
            <div
              onClick={() => navigate("/student/messages")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: colors.card,
                border: `2px dashed ${colors.hairline}`,
                borderRadius: radius.card,
                padding: 16,
                cursor: "pointer",
              }}
            >
              <IconWell noMargin>
                <Calendar size={18} color={colors.amber} />
              </IconWell>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: colors.text }}>
                  Request an empty slot
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: colors.muted, marginTop: 2 }}>
                  Suggest a day and time that works for you
                </div>
              </div>
              <ChevronRight size={18} color={colors.muted} />
            </div>
          </div>
        </Section>

        {/* Weekly availability grid */}
        <Section title="Weekly availability">
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "flex", gap: 6, minWidth: 320 }}>
              {/* Time labels column */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 28 }}>
                {TIME_SLOTS.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      height: 34,
                      display: "flex",
                      alignItems: "center",
                      fontSize: 10,
                      fontWeight: 500,
                      color: colors.muted,
                      whiteSpace: "nowrap",
                      paddingRight: 4,
                    }}
                  >
                    {t.label.split("·")[0].trim()}
                  </div>
                ))}
              </div>

              {DAYS.map((day) => (
                <div key={day} style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                  <div
                    style={{
                      height: 22,
                      textAlign: "center",
                      fontSize: 11,
                      fontWeight: 600,
                      color: colors.text,
                    }}
                  >
                    {day}
                  </div>
                  {TIME_SLOTS.map((t) => {
                    const state = SAMPLE_AVAILABILITY[day]?.[t.id] ?? "off";
                    const key = `${day}-${t.id}`;
                    const isSelected = !!selectedSlots[key];
                    const booked = state === "booked";
                    const open = state === "available";

                    const cellBase: React.CSSProperties = {
                      height: 34,
                      borderRadius: radius.sm,
                      cursor: open ? "pointer" : "default",
                    };

                    if (state === "off") {
                      return (
                        <div
                          key={key}
                          style={{ ...cellBase, background: colors.sand, opacity: 0.5, cursor: "default" }}
                        />
                      );
                    }
                    if (booked) {
                      return (
                        <div
                          key={key}
                          style={{
                            ...cellBase,
                            background: colors.aiTint,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 9,
                            fontWeight: 600,
                            color: colors.ai,
                          }}
                        >
                          Booked
                        </div>
                      );
                    }
                    return (
                      <div
                        key={key}
                        onClick={() => toggleSlot(key)}
                        style={{
                          ...cellBase,
                          background: colors.card,
                          border: isSelected
                            ? `2px solid ${colors.amber}`
                            : `1px solid ${colors.hairline}`,
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
            <LegendItem swatch={{ background: colors.card, border: `1px solid ${colors.hairline}` }} label="Open" />
            <LegendItem swatch={{ background: colors.card, border: `2px solid ${colors.amber}` }} label="Selected" />
            <LegendItem swatch={{ background: colors.aiTint }} label="Booked" />
          </div>
        </Section>

        {/* About */}
        <Section title="About">
          <p style={{ fontSize: 15, color: colors.muted, lineHeight: 1.6, margin: 0 }}>{bioTruncated}</p>
          {bio.length > 160 && (
            <button
              onClick={() => setAboutExpanded((v) => !v)}
              style={{
                marginTop: 8,
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                color: colors.green,
                fontFamily: font,
              }}
            >
              {aboutExpanded ? "Show less" : "Show more"}
            </button>
          )}
        </Section>

        {/* Demo lesson tile */}
        <div style={{ marginTop: 24 }}>
          <div
            style={{
              height: 160,
              background: colors.slate,
              borderRadius: radius.card,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: radius.pill,
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radius.pill,
                  background: "rgba(255,255,255,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Play size={20} color={colors.inverse} fill={colors.inverse} />
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: colors.inverse }}>Teaching demo</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.7)" }}>
              See {firstName}'s teaching style
            </div>
          </div>
        </div>

        {/* Reviews & ratings */}
        <Section title="Reviews & ratings">
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: colors.text, lineHeight: 1 }}>
                {(tutor.rating ?? 0).toFixed(1)}
              </div>
              <div style={{ display: "flex", gap: 2, marginTop: 6, justifyContent: "center" }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    size={11}
                    color={i <= Math.round(tutor.rating ?? 0) ? colors.amber : colors.hairline}
                    fill={i <= Math.round(tutor.rating ?? 0) ? colors.amber : "transparent"}
                  />
                ))}
              </div>
              <div style={{ fontSize: 11, fontWeight: 500, color: colors.muted, marginTop: 6 }}>
                {totalReviews} reviews
              </div>
            </div>

            <div style={{ flex: 1 }}>
              {[5, 4, 3, 2, 1].map((n) => {
                const count = (dist as Record<number, number>)[n] ?? 0;
                const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                return (
                  <div key={n} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 500, color: colors.muted, width: 8 }}>{n}</span>
                    <Star size={10} color={colors.amber} fill={colors.amber} />
                    <div
                      style={{
                        flex: 1,
                        height: 6,
                        borderRadius: radius.pill,
                        background: colors.sand,
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ width: `${pct}%`, height: "100%", background: colors.amber }} />
                    </div>
                    <span style={{ fontSize: 11, color: colors.muted, width: 20, textAlign: "right" }}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Review cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
            {REVIEWS.length === 0 && (
              <div style={{ fontSize: 13, fontWeight: 500, color: colors.muted }}>
                No reviews yet.
              </div>
            )}
            {REVIEWS.map((r) => (
              <div
                key={r.id}
                style={{
                  background: colors.card,
                  border: `1px solid ${colors.hairline}`,
                  borderRadius: radius.card,
                  padding: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <img
                    src={r.avatar}
                    alt={r.name}
                    style={{ width: 40, height: 40, borderRadius: radius.pill, objectFit: "cover" }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: colors.text }}>{r.name}</span>
                      <ShieldCheck size={12} color={colors.verify} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                      <div style={{ display: "flex", gap: 1 }}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            size={10}
                            color={i <= r.rating ? colors.amber : colors.hairline}
                            fill={i <= r.rating ? colors.amber : "transparent"}
                          />
                        ))}
                      </div>
                      <span style={{ fontSize: 11, color: colors.muted }}>{r.date}</span>
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: colors.muted, lineHeight: 1.6, margin: "10px 0 0" }}>
                  {r.text}
                </p>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* 3. Sticky footer */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background: colors.paper,
          borderTop: `1px solid ${colors.hairline}`,
          padding: "12px 24px calc(16px + env(safe-area-inset-bottom))",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 10, fontWeight: 500, color: colors.muted }}>1-to-1 monthly</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: colors.text }}>
            Rs {(tutor.rate ?? 0).toLocaleString()}
          </span>
          <span style={{ fontSize: 10, fontWeight: 500, color: colors.muted }}>/month</span>
        </div>
        <PrimaryButton onClick={() => navigate("/student/enroll")}>
          Enroll with {firstName}
        </PrimaryButton>
      </div>
    </div>
  );
}

/* ---------- Local helper components ---------- */

function PillButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 40,
        height: 40,
        borderRadius: radius.pill,
        background: colors.card,
        border: `1px solid ${colors.hairline}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        padding: 0,
      }}
    >
      {children}
    </button>
  );
}

function StatCell({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div
      style={{
        flex: 1,
        background: colors.card,
        border: `1px solid ${colors.hairline}`,
        borderRadius: radius.card,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
      }}
    >
      {icon}
      <div style={{ fontSize: 20, fontWeight: 600, color: colors.text }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: colors.muted }}>{label}</div>
    </div>
  );
}

function Section({
  title,
  trailing,
  children,
}: {
  title: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: colors.text }}>{title}</span>
        {trailing}
      </div>
      {children}
    </div>
  );
}

function IconWell({ children, noMargin }: { children: React.ReactNode; noMargin?: boolean }) {
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: radius.well,
        background: colors.amberTint,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        marginBottom: noMargin ? 0 : 10,
      }}
    >
      {children}
    </div>
  );
}

const overlineStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.06em",
  color: colors.muted,
  textTransform: "uppercase",
  marginBottom: 4,
};

function cardStyle(): React.CSSProperties {
  return {
    flex: 1,
    background: colors.card,
    border: `1px solid ${colors.hairline}`,
    borderRadius: radius.card,
    padding: 16,
  };
}

function LegendItem({ swatch, label }: { swatch: React.CSSProperties; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 14, height: 14, borderRadius: 4, display: "inline-block", ...swatch }} />
      <span style={{ fontSize: 11, fontWeight: 500, color: colors.muted }}>{label}</span>
    </div>
  );
}

function SessionCard({ slot }: { slot: SessionSlot }) {
  const isPrivate = slot.type === "private-batch";
  const isFull = slot.status === "full" || slot.students >= slot.capacity;
  const pct = slot.capacity > 0 ? Math.min(100, (slot.students / slot.capacity) * 100) : 0;
  const TypeIcon = isPrivate ? Lock : Users;
  const typeLabel = isPrivate ? "PRIVATE" : "PUBLIC BATCH";

  return (
    <div
      style={{
        background: colors.card,
        border: `1px solid ${colors.hairline}`,
        borderRadius: radius.card,
        padding: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <TypeIcon size={13} color={colors.green} />
          <span style={{ ...overlineStyle, marginBottom: 0, color: colors.green }}>{typeLabel}</span>
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: "3px 8px",
            borderRadius: radius.pill,
            background: isFull ? colors.sand : colors.greenTint,
            color: isFull ? colors.muted : colors.green,
          }}
        >
          {isFull ? "FULL" : "OPEN"}
        </span>
      </div>

      <div style={{ fontSize: 14, fontWeight: 500, color: colors.text, marginTop: 8 }}>
        {slot.subject ?? slot.label ?? "Session"} {slot.label ? `— ${slot.label}` : ""}
      </div>

      {slot.schedule && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
          <Calendar size={12} color={colors.muted} />
          <span style={{ fontSize: 13, fontWeight: 500, color: colors.muted }}>{slot.schedule}</span>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: colors.muted, whiteSpace: "nowrap" }}>
          {slot.students}/{slot.capacity} filled
        </span>
        <div
          style={{
            flex: 1,
            height: 6,
            borderRadius: radius.pill,
            background: colors.sand,
            overflow: "hidden",
          }}
        >
          <div style={{ width: `${pct}%`, height: "100%", background: colors.green }} />
        </div>
        <button
          disabled={isFull}
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "5px 12px",
            borderRadius: radius.pill,
            border: "none",
            cursor: isFull ? "default" : "pointer",
            fontFamily: font,
            background: isFull ? colors.sand : colors.greenTint,
            color: isFull ? colors.muted : colors.green,
          }}
        >
          {isFull ? "Full" : "Enroll"}
        </button>
      </div>
    </div>
  );
}

function PrimaryButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        flex: 1,
        height: 52,
        borderRadius: radius.card,
        background: colors.amber,
        color: colors.inverse,
        border: "none",
        fontSize: 15,
        fontWeight: 600,
        fontFamily: font,
        cursor: "pointer",
        transform: pressed ? "scale(0.96)" : "scale(1)",
        transition: "transform 0.1s ease",
      }}
    >
      {children}
    </button>
  );
}
