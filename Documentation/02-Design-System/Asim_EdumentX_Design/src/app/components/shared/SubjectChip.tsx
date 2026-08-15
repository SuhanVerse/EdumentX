interface SubjectChipProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
  small?: boolean;
}

/* v2: subject chips use trust-teal-light bg + trust-teal-dark text. Selected = brand/primary fill. */
export function SubjectChip({ label, active, onClick, small }: SubjectChipProps) {
  const bg = active ? "#2F5D50" : "#DCF0E4";
  const text = active ? "#FFFFFF" : "#3F8A5A";

  return (
    <span
      onClick={onClick}
      style={{
        background: bg,
        color: text,
        fontSize: small ? 11 : 12,
        fontWeight: 500,
        padding: small ? "4px 10px" : "6px 12px",
        borderRadius: 999,
        display: "inline-flex",
        alignItems: "center",
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
        lineHeight: 1.4,
      }}
    >
      {label}
    </span>
  );
}
