import { useState } from "react";
import { useNavigate } from "react-router";
import { MapPin, Sparkles, ShieldCheck } from "lucide-react";

interface Slide {
  title: string;
  subtitle: string;
  bg: string;
  accent: string;
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
}

const SLIDES: Slide[] = [
  {
    title: "Discover tutors on the map",
    subtitle: "See verified home tutors in your neighborhood — sorted by distance, subject, and rating.",
    bg: "#E4EDE9",
    accent: "#2F5D50",
    Icon: MapPin,
  },
  {
    title: "Ask AI for the best match",
    subtitle: "Tell our AI assistant what you need to learn. It recommends the right tutor in seconds.",
    bg: "#E3EDF4",
    accent: "#4A7FA5",
    Icon: Sparkles,
  },
  {
    title: "Verified, trusted tutors",
    subtitle: "Every Blue Tick Pro tutor is document-verified by our team. Your safety, our priority.",
    bg: "#DCF0E4",
    accent: "#3F8A5A",
    Icon: ShieldCheck,
  },
];

export function Onboarding() {
  const [slide, setSlide] = useState(0);
  const navigate = useNavigate();
  const current = SLIDES[slide];

  const handleNext = () => {
    if (slide < SLIDES.length - 1) setSlide(slide + 1);
    else navigate("/phone-entry");
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Skip */}
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "50px 20px 0" }}>
        <button
          onClick={() => navigate("/phone-entry")}
          style={{
            background: "none",
            border: "none",
            fontSize: 14,
            color: "#6B7280",
            cursor: "pointer",
            fontFamily: "Inter, sans-serif",
            padding: "8px 4px",
          }}
        >
          Skip
        </button>
      </div>

      {/* Illustration */}
      <div
        style={{
          margin: "20px 24px 0",
          borderRadius: 20,
          height: 280,
          background: current.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 999,
            background: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <current.Icon size={56} color={current.accent} strokeWidth={1.6} />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "32px 24px 24px", display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 24, fontWeight: 500, color: "#0F172A", marginBottom: 12, lineHeight: 1.3 }}>
          {current.title}
        </div>
        <div style={{ fontSize: 15, color: "#6B7280", lineHeight: 1.6, flex: 1 }}>
          {current.subtitle}
        </div>

        {/* Dots */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, justifyContent: "center" }}>
          {SLIDES.map((_, i) => (
            <div
              key={i}
              onClick={() => setSlide(i)}
              style={{
                width: i === slide ? 24 : 8,
                height: 8,
                borderRadius: 999,
                background: i === slide ? "#2F5D50" : "#E7E1D3",
                cursor: "pointer",
                transition: "all 0.3s",
              }}
            />
          ))}
        </div>

        {/* Next button */}
        <button
          onClick={handleNext}
          style={{
            background: "#2F5D50",
            color: "#FFFFFF",
            border: "none",
            borderRadius: 12,
            height: 52,
            fontSize: 15,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "Inter, sans-serif",
          }}
        >
          {slide === SLIDES.length - 1 ? "Get started" : "Next"}
        </button>
      </div>
    </div>
  );
}
