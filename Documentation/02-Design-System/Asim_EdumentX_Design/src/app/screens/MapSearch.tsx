import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Search, SlidersHorizontal, ChevronLeft, Star, ShieldCheck, MapPin } from "lucide-react";
import { TUTORS, MAP_IMG, type Tutor } from "../data/mockData";
import { BottomNav } from "../components/shared/BottomNav";
import { SubjectChip } from "../components/shared/SubjectChip";
import { colors, radius, font } from "../theme/tokens";

const MAP_PINS: { tutorId: string; x: number; y: number }[] = [
  { tutorId: "1", x: 48, y: 38 },
  { tutorId: "2", x: 68, y: 55 },
  { tutorId: "3", x: 32, y: 62 },
  { tutorId: "4", x: 58, y: 28 },
  { tutorId: "5", x: 75, y: 45 },
];

const CARD_STEP = 216;

function Pin({
  tutor,
  x,
  y,
  selected,
  onSelect,
}: {
  tutor: Tutor;
  x: number;
  y: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const ring = selected ? colors.inverse : tutor.verified ? colors.amber : colors.slate;
  const ringWidth = selected ? 4 : 2.5;

  return (
    <div
      onClick={onSelect}
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -100%)",
        cursor: "pointer",
        zIndex: selected ? 6 : 3,
      }}
    >
      <div style={{ position: "relative", width: 34, height: 34 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50% 50% 50% 0",
            transform: "rotate(45deg)",
            background: colors.card,
            border: `${ringWidth}px solid ${ring}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "border 0.15s",
          }}
        >
          <img
            src={tutor.avatar}
            alt={tutor.name}
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              objectFit: "cover",
              transform: "rotate(-45deg)",
            }}
          />
        </div>
        {tutor.verified && (
          <div
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: colors.amber,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `1.5px solid ${colors.card}`,
            }}
          >
            <ShieldCheck size={9} color={colors.inverse} />
          </div>
        )}
      </div>
    </div>
  );
}

export function MapSearch() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const cards = MAP_PINS.map((p) => TUTORS.find((t) => t.id === p.tutorId)).filter(
    (t): t is Tutor => !!t
  );

  const select = (id: string) => {
    setSelected(id);
    const idx = cards.findIndex((t) => t.id === id);
    if (idx >= 0 && carouselRef.current) {
      carouselRef.current.scrollTo({ left: idx * CARD_STEP, behavior: "smooth" });
    }
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: colors.paper,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        fontFamily: font,
      }}
    >
      {/* Dark slate hero header */}
      <div style={{ background: colors.slate, padding: "44px 16px 16px", zIndex: 10 }}>
        <div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Find a tutor</div>
          <div style={{ display: "inline-block", marginTop: 2 }}>
            <div style={{ fontSize: 22, fontWeight: 500, color: colors.inverse }}>Near you</div>
            <div style={{ height: 2, background: colors.amber, borderRadius: 1, marginTop: 2 }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button
            onClick={() => navigate("/student/home")}
            style={{
              width: 44,
              height: 44,
              flexShrink: 0,
              background: "rgba(255,255,255,0.1)",
              border: "none",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <ChevronLeft size={20} color={colors.inverse} />
          </button>

          <div
            style={{
              flex: 1,
              height: 48,
              background: colors.card,
              border: `1px solid ${colors.hairline}`,
              borderRadius: radius.card,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0 14px",
            }}
          >
            <Search size={18} color={colors.muted} />
            <input
              placeholder="Search tutors, subjects…"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 15,
                color: colors.text,
                fontFamily: font,
              }}
            />
          </div>

          <button
            onClick={() => navigate("/student/filters")}
            style={{
              width: 48,
              height: 48,
              flexShrink: 0,
              background: colors.amber,
              border: "none",
              borderRadius: radius.card,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <SlidersHorizontal size={20} color={colors.inverse} />
          </button>
        </div>
      </div>

      {/* Map canvas */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <img
          src={MAP_IMG}
          alt="Map"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
        <div style={{ position: "absolute", inset: 0, background: "rgba(251,248,242,0.25)" }} />

        {/* Decorative roads */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <line x1="0" y1="42%" x2="100%" y2="38%" stroke="rgba(255,255,255,0.6)" strokeWidth="7" />
          <line x1="0" y1="70%" x2="100%" y2="66%" stroke="rgba(255,255,255,0.45)" strokeWidth="5" />
          <line x1="28%" y1="0" x2="34%" y2="100%" stroke="rgba(255,255,255,0.6)" strokeWidth="7" />
          <line x1="66%" y1="0" x2="60%" y2="100%" stroke="rgba(255,255,255,0.45)" strokeWidth="5" />
        </svg>

        {/* Your location */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: colors.green,
              border: `3px solid ${colors.inverse}`,
              boxShadow: "0 0 0 6px rgba(47,93,80,0.2)",
            }}
          />
        </div>

        {/* Floating count pill */}
        <div
          style={{
            position: "absolute",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            background: colors.card,
            border: `1px solid ${colors.hairline}`,
            borderRadius: radius.pill,
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            gap: 6,
            zIndex: 4,
          }}
        >
          <MapPin size={14} color={colors.green} />
          <span style={{ fontSize: 13, fontWeight: 500, color: colors.text }}>
            {TUTORS.length} tutors on map
          </span>
        </div>

        {/* Pins */}
        {MAP_PINS.map((pin) => {
          const t = TUTORS.find((x) => x.id === pin.tutorId);
          if (!t) return null;
          return (
            <Pin
              key={pin.tutorId}
              tutor={t}
              x={pin.x}
              y={pin.y}
              selected={selected === t.id}
              onSelect={() => select(t.id)}
            />
          );
        })}

        {/* Bottom snap carousel */}
        <div
          ref={carouselRef}
          style={{
            position: "absolute",
            bottom: 16,
            left: 0,
            right: 0,
            display: "flex",
            gap: 16,
            overflowX: "auto",
            padding: "0 16px",
            scrollSnapType: "x mandatory",
            scrollbarWidth: "none",
            zIndex: 5,
          }}
        >
          {cards.map((t) => {
            const isSel = selected === t.id;
            return (
              <div
                key={t.id}
                onClick={() => select(t.id)}
                style={{
                  width: 200,
                  flexShrink: 0,
                  scrollSnapAlign: "center",
                  background: colors.card,
                  borderRadius: radius.card,
                  border: `1px solid ${isSel ? colors.amber : colors.hairline}`,
                  padding: 14,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <img
                    src={t.avatar}
                    alt={t.name}
                    style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: colors.text,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {t.name}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <Star size={12} color={colors.amber} fill={colors.amber} />
                      <span style={{ fontSize: 12, color: colors.muted }}>
                        {t.rating.toFixed(1)} · {t.distance} km
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {t.subjects.slice(0, 2).map((s) => (
                    <SubjectChip key={s} label={s} small />
                  ))}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: colors.text }}>
                    Rs {t.rate.toLocaleString()}/mo
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/student/tutor/${t.id}`);
                    }}
                    style={{
                      background: colors.green,
                      color: colors.inverse,
                      border: "none",
                      borderRadius: radius.sm,
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: font,
                    }}
                  >
                    View
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <BottomNav role="student" />
    </div>
  );
}
