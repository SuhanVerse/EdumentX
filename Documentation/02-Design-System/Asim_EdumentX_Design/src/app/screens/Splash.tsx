import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

export function Splash() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / 2000);
      setProgress(p);
      if (p >= 1) clearInterval(id);
    }, 30);
    const t = setTimeout(() => navigate("/onboarding"), 2100);
    return () => {
      clearInterval(id);
      clearTimeout(t);
    };
  }, [navigate]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#0F172A",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, sans-serif",
        position: "relative",
      }}
    >
      {/* Logo mark — 64px white rounded square with brand-blue E */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <span
          style={{
            fontSize: 36,
            fontWeight: 500,
            color: "#2F5D50",
            lineHeight: 1,
            letterSpacing: "-1px",
          }}
        >
          E
        </span>
      </div>

      {/* Wordmark */}
      <div
        style={{
          fontSize: 34,
          fontWeight: 500,
          color: "#FFFFFF",
          letterSpacing: "-0.5px",
          lineHeight: 1.1,
        }}
      >
        EdumentX
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: 15,
          fontWeight: 400,
          color: "#93C5FD",
          marginTop: 8,
        }}
      >
        Find your perfect tutor nearby
      </div>

      {/* Loading bar */}
      <div
        style={{
          marginTop: 48,
          width: 100,
          height: 4,
          borderRadius: 999,
          background: "rgba(255,255,255,0.2)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            background: "#E4EDE9",
            borderRadius: 999,
            transition: "width 0.05s linear",
          }}
        />
      </div>

      {/* Version */}
      <div
        style={{
          position: "absolute",
          bottom: 32,
          fontSize: 11,
          color: "#93C5FD",
          opacity: 0.7,
        }}
      >
        v2.0
      </div>
    </div>
  );
}
