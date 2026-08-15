type Status =
  | "active"
  | "pending"
  | "past"
  | "approved"
  | "rejected"
  | "suspended"
  | "verified"
  | "unverified"
  | "completed"
  | "capacity"
  | "batch"
  | "counter";

interface StatusBadgeProps {
  status: Status;
  label?: string;
}

/* v2 tokens — flat chips, radius/pill */
const STATUS_MAP: Record<Status, { bg: string; text: string; label: string }> = {
  active:     { bg: "#DCF0E4", text: "#3F8A5A", label: "Active" },
  pending:    { bg: "#FBEFD9", text: "#B45309", label: "Pending" },
  past:       { bg: "#F1ECE0", text: "#6B7280", label: "Past" },
  approved:   { bg: "#DCF0E4", text: "#2F5D50", label: "Approved" },
  rejected:   { bg: "#F7E4E0", text: "#C1503D", label: "Rejected" },
  suspended:  { bg: "#F7E4E0", text: "#C1503D", label: "Suspended" },
  verified:   { bg: "#DCF0E4", text: "#3F8A5A", label: "Verified" },
  unverified: { bg: "#F1ECE0", text: "#9CA3AF", label: "Unverified" },
  completed:  { bg: "#DCF0E4", text: "#2F5D50", label: "Completed" },
  capacity:   { bg: "#F1ECE0", text: "#9CA3AF", label: "At capacity" },
  batch:      { bg: "#E3EDF4", text: "#0F172A", label: "Batch" },
  counter:    { bg: "#FFF7ED", text: "#92400E", label: "Counter-offer" },
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const cfg = STATUS_MAP[status];
  return (
    <span
      style={{
        background: cfg.bg,
        color: cfg.text,
        fontSize: 11,
        fontWeight: 500,
        padding: "4px 10px",
        borderRadius: 999,
        display: "inline-flex",
        alignItems: "center",
        lineHeight: 1.4,
      }}
    >
      {label ?? cfg.label}
    </span>
  );
}
