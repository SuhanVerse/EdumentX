import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  reviews?: number;
  size?: number;
  showCount?: boolean;
}

export function StarRating({ rating, reviews, size = 14, showCount = true }: StarRatingProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          style={{
            width: size,
            height: size,
            fill: i <= Math.round(rating) ? "#E5A03B" : "transparent",
            color: i <= Math.round(rating) ? "#E5A03B" : "#E7E1D3",
          }}
          strokeWidth={1.5}
        />
      ))}
      <span style={{ fontSize: 12, fontWeight: 500, color: "#0F172A", marginLeft: 2 }}>
        {rating.toFixed(1)}
      </span>
      {showCount && reviews !== undefined && (
        <span style={{ fontSize: 12, color: "#6B7280" }}>({reviews})</span>
      )}
    </div>
  );
}

interface TapStarRatingProps {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}

export function TapStarRating({ value, onChange, size = 36 }: TapStarRatingProps) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} onClick={() => onChange(i)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
          <Star
            style={{
              width: size,
              height: size,
              fill: i <= value ? "#E5A03B" : "transparent",
              color: i <= value ? "#E5A03B" : "#E7E1D3",
            }}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}
