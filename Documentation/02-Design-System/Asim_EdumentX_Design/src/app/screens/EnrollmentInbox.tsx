import { useState } from "react";
import { Check, X, RefreshCw, MapPin, ShieldCheck, User, Users2, Lock, Sparkles, AlertCircle, KeyRound } from "lucide-react";
import { PENDING_REQUESTS, BATCH_REQUESTS, SESSION_SLOTS, MAP_IMG } from "../data/mockData";
import { SubjectChip } from "../components/shared/SubjectChip";
import { StatusBadge } from "../components/shared/StatusBadge";
import { BottomNav } from "../components/shared/BottomNav";
import { ScreenHeader } from "../components/shared/ScreenHeader";

type ActionStatus = "pending" | "accepted" | "rejected";
type Tab = "all" | "one-to-one" | "batch";

const APPROX_AREAS: Record<string, { name: string; distance: number; overlap: "good" | "fair" }> = {
  "1": { name: "Baluwatar area (~400m radius)", distance: 1.2, overlap: "good" },
  "2": { name: "Gaushala area (~500m radius)", distance: 2.4, overlap: "fair" },
};

export function EnrollmentInbox() {
  const [tab, setTab] = useState<Tab>("all");
  const [statuses, setStatuses] = useState<Record<string, ActionStatus>>({});
  const setStatus = (id: string, s: ActionStatus) => setStatuses((p) => ({ ...p, [id]: s }));

  const oneToOneCount = PENDING_REQUESTS.length;
  const batchCount = BATCH_REQUESTS.length;
  const total = oneToOneCount + batchCount;

  const showOne = tab === "all" || tab === "one-to-one";
  const showBatch = tab === "all" || tab === "batch";

  const one2one = PENDING_REQUESTS[0];
  const publicJoin = BATCH_REQUESTS.find((b) => b.kind === "join" && b.slotId === "slot-1");
  const conversion = BATCH_REQUESTS.find((b) => b.kind === "conversion");
  const privateJoin = BATCH_REQUESTS.find((b) => b.kind === "join" && b.slotId === "slot-2");

  return (
    <div style={{ width: "100%", height: "100%", background: "#FBF8F2", display: "flex", flexDirection: "column", fontFamily: "Inter, sans-serif" }}>
      <ScreenHeader
        title="Requests inbox"
        subtitle={`${total} pending · ${oneToOneCount} enrollment · ${batchCount} batch`}
      />

      {/* Filter tabs */}
      <div style={{ background: "#FFFFFF", borderBottom: "1px solid #E7E1D3", display: "flex", padding: "8px 12px", gap: 6, flexShrink: 0 }}>
        {([
          { key: "all", label: "All", count: total },
          { key: "one-to-one", label: "One-to-one", count: oneToOneCount },
          { key: "batch", label: "Batch", count: batchCount },
        ] as const).map((t) => {
          const on = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{ height: 34, padding: "0 12px", borderRadius: 999, border: on ? "none" : "1px solid #E7E1D3", background: on ? "#2F5D50" : "#FFFFFF", color: on ? "#FFFFFF" : "#6B7280", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", gap: 6 }}
            >
              {t.label}
              <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 999, background: on ? "rgba(255,255,255,0.25)" : "#F1ECE0", color: on ? "#FFFFFF" : "#6B7280" }}>{t.count}</span>
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 88px" }}>
        {/* 1. One-to-one example */}
        {showOne && one2one && (
          <>
            <SectionHeader Icon={User} color="#2F5D50" label="One-to-one enrollment" hint="A new student wants a private session" />
            <OneToOneCard req={one2one} status={statuses[one2one.id] ?? "pending"} setStatus={(s) => setStatus(one2one.id, s)} />
          </>
        )}

        {/* 2. Batch example — public batch join */}
        {showBatch && publicJoin && (
          <>
            <SectionHeader Icon={Users2} color="#3F8A5A" label="Public batch — join request" hint="Student found this batch on your profile" />
            <BatchJoinCard br={publicJoin} status={statuses[publicJoin.id] ?? "pending"} setStatus={(s) => setStatus(publicJoin.id, s)} isPrivate={false} />
          </>
        )}

        {/* 3. Conversion request from existing 1-to-1 student */}
        {showBatch && conversion && (
          <>
            <SectionHeader Icon={Sparkles} color="#4A7FA5" label="Batch conversion request" hint="Existing 1-to-1 student wants to invite friends" />
            <ConversionCard br={conversion} status={statuses[conversion.id] ?? "pending"} setStatus={(s) => setStatus(conversion.id, s)} />
          </>
        )}

        {/* 4. Friend joining a private batch via session code */}
        {showBatch && privateJoin && (
          <>
            <SectionHeader Icon={Lock} color="#4A7FA5" label="Private batch — join via code" hint="Friend of an existing student entered the session code" />
            <BatchJoinCard br={privateJoin} status={statuses[privateJoin.id] ?? "pending"} setStatus={(s) => setStatus(privateJoin.id, s)} isPrivate />
          </>
        )}

        {total === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 80, gap: 8 }}>
            <div style={{ fontSize: 16, fontWeight: 500, color: "#6B7280" }}>No pending requests</div>
            <div style={{ fontSize: 13, color: "#9CA3AF" }}>New requests will appear here</div>
          </div>
        )}
      </div>

      <BottomNav role="tutor" />
    </div>
  );
}

function SectionHeader({ Icon, color, label, hint }: { Icon: any; color: string; label: string; hint: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 2px 10px" }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}1A`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={14} color={color} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#0F172A" }}>{label}</div>
        <div style={{ fontSize: 11, color: "#6B7280", marginTop: 1 }}>{hint}</div>
      </div>
    </div>
  );
}

function OneToOneCard({
  req, status, setStatus,
}: { req: typeof PENDING_REQUESTS[number]; status: ActionStatus; setStatus: (s: ActionStatus) => void }) {
  const area = APPROX_AREAS[req.id] ?? { name: "Approx student area", distance: 1.5, overlap: "good" as const };

  return (
    <div
      style={{
        background: "#FFFFFF", borderRadius: 14, padding: 16, marginBottom: 16,
        border: status === "accepted" ? "1px solid #3F8A5A" : status === "rejected" ? "1px solid #F0D0C9" : "1px solid #E7E1D3",
        opacity: status !== "pending" ? 0.85 : 1,
      }}
    >
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 8px", borderRadius: 999, background: "#E4EDE9", border: "1px solid #C3E0D0", marginBottom: 10 }}>
        <User size={11} color="#2F5D50" />
        <span style={{ fontSize: 10, color: "#2F5D50", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>One-to-one</span>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
        <img src={req.student.avatar} alt={req.student.name} style={{ width: 44, height: 44, borderRadius: 999, objectFit: "cover" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#0F172A" }}>{req.student.name}</div>
            {status !== "pending"
              ? <StatusBadge status={status === "accepted" ? "active" : "rejected"} label={status === "accepted" ? "Accepted" : "Rejected"} />
              : <StatusBadge status="pending" />}
          </div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{req.student.grade}</div>
        </div>
      </div>

      <div style={{ background: "#FBF8F2", borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
          {req.subjects.map((s) => <SubjectChip key={s} label={s} small />)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {[
            { label: "Plan", value: req.plan },
            { label: "Schedule", value: req.schedule },
            { label: "Start", value: req.startDate },
            { label: "Distance", value: `${area.distance} km` },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#6B7280", marginTop: 1 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderRadius: 12, overflow: "hidden", position: "relative", height: 110, marginBottom: 8, border: "1px solid #E7E1D3" }}>
        <img src={MAP_IMG} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "rgba(232,240,254,0.35)" }} />
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <circle cx="40%" cy="55%" r="38" fill="rgba(26,86,219,0.10)" stroke="#2F5D50" strokeWidth="1" strokeDasharray="4,3" />
          <circle cx="62%" cy="42%" r="28" fill="rgba(63,138,90,0.20)" stroke="#3F8A5A" strokeWidth="1.5" />
        </svg>
        <div style={{ position: "absolute", top: 8, left: 8, padding: "4px 8px", background: "rgba(255,255,255,0.95)", borderRadius: 6, fontSize: 10, color: "#0F172A", fontWeight: 500 }}>
          {area.name}
        </div>
      </div>

      <div
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: area.overlap === "good" ? "#DCF0E4" : "#FBEFD9",
          border: `1px solid ${area.overlap === "good" ? "#C3E0D0" : "#FDE68A"}`,
          borderRadius: 10, padding: "8px 12px", marginBottom: 12,
        }}
      >
        {area.overlap === "good" ? <ShieldCheck size={14} color="#3F8A5A" /> : <MapPin size={14} color="#B45309" />}
        <div style={{ fontSize: 12, color: area.overlap === "good" ? "#3F8A5A" : "#92400E", lineHeight: 1.5 }}>
          {area.overlap === "good"
            ? "Within your service radius — exact address shared after acceptance."
            : "Slightly outside your usual radius. Travel may be required."}
        </div>
      </div>

      {status === "pending" && (
        <div style={{ display: "flex", gap: 8 }}>
          <ActionButton kind="accept" onClick={() => setStatus("accepted")} />
          <ActionButton kind="decline" onClick={() => setStatus("rejected")} />
          <button style={{ flex: 1, height: 40, background: "#E4EDE9", color: "#2F5D50", border: "1px solid #C3E0D0", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
            <RefreshCw size={12} /> Counter
          </button>
        </div>
      )}

      {status !== "pending" && (
        <div style={{ textAlign: "center", fontSize: 12, color: "#6B7280" }}>
          {status === "accepted" ? "Accepted — student notified, slot filled" : "Declined"}
        </div>
      )}
    </div>
  );
}

function ConversionCard({
  br, status, setStatus,
}: { br: typeof BATCH_REQUESTS[number]; status: ActionStatus; setStatus: (s: ActionStatus) => void }) {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, #E3EDF4 0%, #FFFFFF 100%)",
        borderRadius: 14, padding: 16, marginBottom: 16,
        border: status === "accepted" ? "1px solid #3F8A5A" : status === "rejected" ? "1px solid #F0D0C9" : "1px solid #B9D0E0",
        opacity: status !== "pending" ? 0.85 : 1,
      }}
    >
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 8px", borderRadius: 999, background: "#FFFFFF", border: "1px solid #B9D0E0", marginBottom: 10 }}>
        <Sparkles size={11} color="#4A7FA5" />
        <span style={{ fontSize: 10, color: "#4A7FA5", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Conversion · 1-to-1 → private batch</span>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
        <img src={br.student.avatar} alt={br.student.name} style={{ width: 44, height: 44, borderRadius: 999, objectFit: "cover" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#0F172A" }}>{br.student.name}</div>
            {status !== "pending" && <StatusBadge status={status === "accepted" ? "active" : "rejected"} label={status === "accepted" ? "Accepted" : "Rejected"} />}
          </div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{br.student.grade} · {br.subject}</div>
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.85)", border: "1px solid #B9D0E0", borderRadius: 10, padding: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "#4A7FA5", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6, fontWeight: 500 }}>Current session</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <User size={14} color="#2F5D50" />
          <span style={{ fontSize: 12, color: "#0F172A" }}>1-to-1 · started 2026-03-01</span>
        </div>
        <div style={{ height: 1, background: "#E7E1D3", margin: "10px 0" }} />
        <div style={{ fontSize: 11, color: "#3F8A5A", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6, fontWeight: 500 }}>Becomes</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Lock size={14} color="#4A7FA5" />
          <span style={{ fontSize: 12, color: "#0F172A" }}>Private batch · up to 5 students</span>
        </div>
      </div>

      {br.message && (
        <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.6, fontStyle: "italic", padding: "8px 12px", background: "#FBF8F2", borderLeft: "2px solid #B9D0E0", borderRadius: "0 8px 8px 0", marginBottom: 12 }}>
          "{br.message}"
        </div>
      )}

      <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 12 }}>
        On acceptance, a session code will be generated and shown to {br.student.name.split(" ")[0]} so they can invite friends.
      </div>

      {status === "pending" && (
        <div style={{ display: "flex", gap: 8 }}>
          <ActionButton kind="accept" label="Accept & generate code" onClick={() => setStatus("accepted")} />
          <ActionButton kind="decline" onClick={() => setStatus("rejected")} />
        </div>
      )}

      {status === "accepted" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "#DCF0E4", border: "1px solid #C3E0D0", borderRadius: 10 }}>
          <KeyRound size={14} color="#3F8A5A" />
          <div style={{ flex: 1, fontSize: 12, color: "#3F8A5A" }}>Session code <strong style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", letterSpacing: "0.1em" }}>RS-PH-7K2X</strong> sent to {br.student.name.split(" ")[0]}</div>
        </div>
      )}
      {status === "rejected" && <div style={{ textAlign: "center", fontSize: 12, color: "#6B7280" }}>Declined</div>}
    </div>
  );
}

function BatchJoinCard({
  br, status, setStatus, isPrivate,
}: { br: typeof BATCH_REQUESTS[number]; status: ActionStatus; setStatus: (s: ActionStatus) => void; isPrivate: boolean }) {
  const slot = SESSION_SLOTS.find((s) => s.id === br.slotId);
  const isFull = !!(slot && slot.students >= slot.capacity);
  const blocked = isFull && status === "pending";

  const accent = isPrivate
    ? { color: "#4A7FA5", bg: "#E3EDF4", border: "#B9D0E0", Icon: Lock, label: "Private batch" }
    : { color: "#3F8A5A", bg: "#DCF0E4", border: "#C3E0D0", Icon: Users2, label: "Public batch" };

  return (
    <div
      style={{
        background: "#FFFFFF", borderRadius: 14, padding: 16, marginBottom: 16,
        border: status === "accepted" ? "1px solid #3F8A5A" : status === "rejected" ? "1px solid #F0D0C9" : `1px solid ${accent.border}`,
        opacity: status !== "pending" ? 0.85 : 1,
      }}
    >
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 8px", borderRadius: 999, background: accent.bg, border: `1px solid ${accent.border}`, marginBottom: 10 }}>
        <accent.Icon size={11} color={accent.color} />
        <span style={{ fontSize: 10, color: accent.color, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{accent.label} · join request</span>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
        <img src={br.student.avatar} alt={br.student.name} style={{ width: 44, height: 44, borderRadius: 999, objectFit: "cover" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#0F172A" }}>{br.student.name}</div>
            {status !== "pending" && <StatusBadge status={status === "accepted" ? "active" : "rejected"} label={status === "accepted" ? "Accepted" : "Rejected"} />}
          </div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{br.student.grade} · {br.subject}</div>
        </div>
      </div>

      {slot && (
        <div style={{ background: "#FBF8F2", border: "1px solid #E7E1D3", borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <accent.Icon size={12} color={accent.color} />
            <span style={{ fontSize: 12, fontWeight: 500, color: "#0F172A" }}>{slot.label}</span>
          </div>
          <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 8 }}>{slot.schedule}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, height: 6, borderRadius: 999, background: "#F1ECE0", overflow: "hidden" }}>
              <div style={{ width: `${(slot.students / slot.capacity) * 100}%`, height: "100%", background: isFull ? "#C1503D" : accent.color, borderRadius: 999 }} />
            </div>
            <div style={{ fontSize: 11, fontWeight: 500, color: isFull ? "#C1503D" : "#6B7280" }}>{slot.students}/{slot.capacity}</div>
          </div>
          {isPrivate && br.sessionCode && (
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#4A7FA5" }}>
              <KeyRound size={11} />
              <span>Code entered: <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", letterSpacing: "0.08em" }}>{br.sessionCode}</span></span>
            </div>
          )}
        </div>
      )}

      {blocked && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "#F7E4E0", border: "1px solid #F0D0C9", borderRadius: 8, marginBottom: 12 }}>
          <AlertCircle size={13} color="#C1503D" />
          <div style={{ fontSize: 11, color: "#C1503D", lineHeight: 1.5 }}>
            Session is at full capacity — approval is blocked automatically.
          </div>
        </div>
      )}

      {status === "pending" && (
        <div style={{ display: "flex", gap: 8 }}>
          <ActionButton kind="accept" disabled={blocked} onClick={() => !blocked && setStatus("accepted")} />
          <ActionButton kind="decline" onClick={() => setStatus("rejected")} />
        </div>
      )}

      {status === "accepted" && <div style={{ textAlign: "center", fontSize: 12, color: "#3F8A5A" }}>Accepted — student added to batch</div>}
      {status === "rejected" && <div style={{ textAlign: "center", fontSize: 12, color: "#6B7280" }}>Declined</div>}
    </div>
  );
}

function ActionButton({ kind, label, onClick, disabled }: { kind: "accept" | "decline"; label?: string; onClick: () => void; disabled?: boolean }) {
  if (kind === "accept") {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        style={{ flex: 1, height: 40, background: disabled ? "#F1ECE0" : "#3F8A5A", color: disabled ? "#9CA3AF" : "#FFFFFF", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
      >
        <Check size={14} /> {label ?? "Accept"}
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      style={{ flex: 1, height: 40, background: "#FFFFFF", color: "#C1503D", border: "1px solid #F0D0C9", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
    >
      <X size={14} /> Decline
    </button>
  );
}
