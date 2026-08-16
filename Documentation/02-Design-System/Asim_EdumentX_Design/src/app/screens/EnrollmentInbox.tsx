import { useState } from "react";
import { Check, X, Users2, Lock, Sparkles, AlertCircle, KeyRound, User, ChevronDown, ChevronUp } from "lucide-react";
import { PENDING_REQUESTS, BATCH_REQUESTS, SESSION_SLOTS } from "../data/mockData";
import { SubjectChip } from "../components/shared/SubjectChip";
import { StatusBadge } from "../components/shared/StatusBadge";
import { BottomNav } from "../components/shared/BottomNav";
import { colors, type as typo, font } from "../theme/tokens";

type ActionStatus = "pending" | "accepted" | "rejected";

// Slot picker modal
function SlotPickerModal({
  studentName,
  onConfirm,
  onCancel,
}: { studentName: string; onConfirm: (slot: string) => void; onCancel: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);

  const SLOTS = [
    { id: "eve1-mon", day: "Monday", label: "5–7 PM", available: true },
    { id: "eve2-mon", day: "Monday", label: "7–9 PM", available: false },
    { id: "aft1-wed", day: "Wednesday", label: "3–5 PM", available: true },
    { id: "eve1-wed", day: "Wednesday", label: "5–7 PM", available: false },
    { id: "eve1-fri", day: "Friday", label: "5–7 PM", available: true },
    { id: "eve2-fri", day: "Friday", label: "7–9 PM", available: true },
  ];

  const byDay = SLOTS.reduce<Record<string, typeof SLOTS>>((acc, s) => {
    (acc[s.day] = acc[s.day] ?? []).push(s);
    return acc;
  }, {});

  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", zIndex: 30 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxHeight: "88%", background: colors.card, borderRadius: "24px 24px 0 0", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "12px 0 0", display: "flex", justifyContent: "center" }}>
          <div style={{ width: 40, height: 4, borderRadius: 999, background: colors.hairline }} />
        </div>
        <div style={{ padding: "16px 20px 12px" }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: colors.text }}>Pick a slot</div>
          <div style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>
            Choose the weekly slot for <strong>{studentName}</strong>'s enrollment. Booked slots are disabled.
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px" }}>
          {Object.entries(byDay).map(([day, slots]) => (
            <div key={day} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 500, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{day}</div>
              {slots.map((slot) => (
                <button
                  key={slot.id}
                  disabled={!slot.available}
                  onClick={() => slot.available && setSelected(slot.id)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", padding: "10px 14px",
                    borderBottom: `1px solid ${colors.hairline}`, background: selected === slot.id ? colors.amberTint : "transparent",
                    border: "none", cursor: slot.available ? "pointer" : "default", fontFamily: font,
                  }}
                >
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: slot.available ? colors.text : colors.placeholder }}>{slot.label}</div>
                  <span style={{
                    fontSize: 11, fontWeight: 500, padding: "3px 8px", borderRadius: 999,
                    background: slot.available ? colors.verifyTint : colors.sand,
                    color: slot.available ? colors.verify : colors.placeholder,
                  }}>
                    {slot.available ? "Available" : "Booked"}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>

        <div style={{ borderTop: `1px solid ${colors.hairline}`, padding: "16px 20px 24px" }}>
          <button
            onClick={() => selected && onConfirm(selected)}
            disabled={!selected}
            style={{
              width: "100%", height: 52, borderRadius: 14, border: "none", fontFamily: font,
              background: selected ? colors.verify : colors.sand,
              color: selected ? colors.inverse : colors.muted,
              fontSize: 15, fontWeight: 600, cursor: selected ? "pointer" : "default", marginBottom: 10,
            }}
          >
            {selected ? "Accept enrollment" : "Tap an available slot"}
          </button>
          <button onClick={onCancel} style={{ width: "100%", height: 40, background: "none", border: "none", color: colors.muted, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: font }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Request card with 4px amber left stripe
function RequestCard({ req, status, onAccept, onDecline }: {
  req: typeof PENDING_REQUESTS[number];
  status: ActionStatus;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const stripeColor = status === "accepted" ? colors.verify : status === "rejected" ? colors.danger : colors.amber;

  return (
    <div style={{
      background: colors.card, borderRadius: 14, marginBottom: 14,
      border: `1px solid ${colors.hairline}`, position: "relative", overflow: "hidden",
      opacity: status !== "pending" ? 0.85 : 1,
    }}>
      {/* 4px left stripe */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: stripeColor }} />
      <div style={{ padding: 16, paddingLeft: 20 }}>
        {/* Header row */}
        <button
          onClick={() => setExpanded((e) => !e)}
          style={{ width: "100%", background: "none", border: "none", cursor: "pointer", fontFamily: font, padding: 0, display: "flex", alignItems: "center", gap: 10 }}
        >
          <img src={req.student.avatar} alt={req.student.name} style={{ width: 40, height: 40, borderRadius: 999, objectFit: "cover", flexShrink: 0 }} />
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: colors.text }}>{req.student.name}</div>
            <div style={{ fontSize: 12, color: colors.muted, marginTop: 1 }}>{req.student.grade}</div>
          </div>
          <StatusBadge status={status === "accepted" ? "active" : status === "rejected" ? "rejected" : "pending"} label={status === "accepted" ? "Accepted" : status === "rejected" ? "Declined" : "Pending"} />
          {expanded ? <ChevronUp size={16} color={colors.muted} /> : <ChevronDown size={16} color={colors.muted} />}
        </button>

        {expanded && (
          <>
            {/* Subject chips */}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 12 }}>
              {req.subjects.map((s) => <SubjectChip key={s} label={s} small />)}
            </div>

            {/* Detail grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12, background: colors.paper, borderRadius: 8, padding: 12 }}>
              {[
                { label: "Schedule", value: req.schedule },
                { label: "Start", value: req.startDate },
                { label: "Plan", value: req.plan },
                { label: "End", value: "Open" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, fontWeight: 500, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: colors.text, marginTop: 2 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Actions */}
            {status === "pending" && (
              <div style={{ display: "flex", gap: 8, marginTop: 14, borderTop: `1px solid ${colors.hairline}`, paddingTop: 14 }}>
                <button
                  onClick={onAccept}
                  style={{ flex: 1, height: 40, background: colors.verify, color: colors.inverse, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
                >
                  <Check size={14} /> Accept
                </button>
                <button
                  onClick={onDecline}
                  style={{ flex: 1, height: 40, background: colors.card, color: colors.danger, border: `1px solid ${colors.dangerTint}`, borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
                >
                  <X size={14} /> Decline
                </button>
              </div>
            )}

            {status === "accepted" && (
              <div style={{ marginTop: 12, fontSize: 12, color: colors.verify }}>Accepted — exact address shared with student</div>
            )}
            {status === "rejected" && (
              <div style={{ marginTop: 12, fontSize: 12, color: colors.muted }}>Declined</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Batch join / conversion card
function BatchCard({ br, status, onAccept, onDecline }: {
  br: typeof BATCH_REQUESTS[number];
  status: ActionStatus;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const slot = SESSION_SLOTS.find((s) => s.id === br.slotId);
  const isFull = !!(slot && slot.students >= slot.capacity);
  const blocked = br.kind === "join" && isFull && status === "pending";

  const isConv = br.kind === "conversion";
  const accent = isConv
    ? { bg: colors.aiTint, border: "#B9D0E0", color: colors.ai, Icon: Sparkles, label: "Conversion request" }
    : { bg: colors.verifyTint, border: "#C3E0D0", color: colors.verify, Icon: Lock, label: "Join request" };

  const stripeColor = status === "accepted" ? colors.verify : status === "rejected" ? colors.danger : colors.amber;

  return (
    <div style={{
      background: colors.card, borderRadius: 14, marginBottom: 14,
      border: `1px solid ${colors.hairline}`, position: "relative", overflow: "hidden",
      opacity: status !== "pending" ? 0.85 : 1,
    }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: stripeColor }} />
      <div style={{ padding: 16, paddingLeft: 20 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 8px", borderRadius: 999, background: accent.bg, border: `1px solid ${accent.border}`, marginBottom: 12 }}>
          <accent.Icon size={11} color={accent.color} />
          <span style={{ fontSize: 10, color: accent.color, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{accent.label}</span>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
          <img src={br.student.avatar} alt={br.student.name} style={{ width: 40, height: 40, borderRadius: 999, objectFit: "cover", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: colors.text }}>{br.student.name}</div>
              {status !== "pending" && <StatusBadge status={status === "accepted" ? "active" : "rejected"} label={status === "accepted" ? "Accepted" : "Declined"} />}
            </div>
            <div style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{br.student.grade} · {br.subject}</div>
          </div>
        </div>

        {slot && (
          <div style={{ background: colors.paper, border: `1px solid ${colors.hairline}`, borderRadius: 10, padding: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: colors.text, marginBottom: 4 }}>{slot.label}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, height: 6, borderRadius: 999, background: colors.sand, overflow: "hidden" }}>
                <div style={{ width: `${(slot.students / slot.capacity) * 100}%`, height: "100%", background: isFull ? colors.danger : accent.color, borderRadius: 999 }} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 500, color: isFull ? colors.danger : colors.muted }}>{slot.students}/{slot.capacity}</div>
            </div>
            {br.kind === "join" && br.sessionCode && (
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: colors.ai }}>
                <KeyRound size={11} />
                Code entered: <span style={{ fontFamily: "ui-monospace, monospace", letterSpacing: "0.08em" }}>{br.sessionCode}</span>
              </div>
            )}
          </div>
        )}

        {blocked && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: colors.dangerTint, border: `1px solid #F0D0C9`, borderRadius: 8, marginBottom: 12 }}>
            <AlertCircle size={13} color={colors.danger} />
            <div style={{ fontSize: 11, color: colors.danger }}>Session is at full capacity — approval is blocked automatically.</div>
          </div>
        )}

        {isConv && status === "pending" && (
          <div style={{ fontSize: 11, color: colors.muted, marginBottom: 12, lineHeight: 1.5 }}>
            On acceptance, a session code will be generated for {br.student.name.split(" ")[0]} to invite friends.
          </div>
        )}

        {status === "pending" && (
          <div style={{ display: "flex", gap: 8, borderTop: `1px solid ${colors.hairline}`, paddingTop: 14 }}>
            <button
              onClick={() => !blocked && onAccept()}
              disabled={blocked}
              style={{ flex: 1, height: 40, background: blocked ? colors.sand : colors.verify, color: blocked ? colors.placeholder : colors.inverse, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: blocked ? "not-allowed" : "pointer", fontFamily: font, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
            >
              <Check size={14} /> {isConv ? "Accept & generate code" : "Accept"}
            </button>
            <button
              onClick={onDecline}
              style={{ flex: 1, height: 40, background: colors.card, color: colors.danger, border: `1px solid ${colors.dangerTint}`, borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
            >
              <X size={14} /> Decline
            </button>
          </div>
        )}

        {status === "accepted" && isConv && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: colors.verifyTint, border: `1px solid #C3E0D0`, borderRadius: 10, marginTop: 4 }}>
            <KeyRound size={14} color={colors.verify} />
            <div style={{ flex: 1, fontSize: 12, color: colors.verify }}>Session code <strong style={{ fontFamily: "ui-monospace, monospace", letterSpacing: "0.1em" }}>RS-PH-7K2X</strong> sent to {br.student.name.split(" ")[0]}</div>
          </div>
        )}
        {status === "accepted" && !isConv && <div style={{ marginTop: 8, fontSize: 12, color: colors.verify }}>Accepted — student added to batch</div>}
        {status === "rejected" && <div style={{ marginTop: 8, fontSize: 12, color: colors.muted }}>Declined</div>}
      </div>
    </div>
  );
}

export function EnrollmentInbox() {
  const [statuses, setStatuses] = useState<Record<string, ActionStatus>>({});
  const [slotPickerFor, setSlotPickerFor] = useState<string | null>(null);

  const setStatus = (id: string, s: ActionStatus) => setStatuses((p) => ({ ...p, [id]: s }));

  const pendingCount = [
    ...PENDING_REQUESTS.filter((r) => (statuses[r.id] ?? "pending") === "pending"),
    ...BATCH_REQUESTS.filter((b) => (statuses[b.id] ?? "pending") === "pending"),
  ].length;

  return (
    <div style={{ width: "100%", height: "100%", background: colors.paper, display: "flex", flexDirection: "column", fontFamily: font }}>
      {/* Header — display 28/500 + amber underline + count */}
      <div style={{ background: colors.paper, padding: "20px 16px 16px", flexShrink: 0, borderBottom: `1px solid ${colors.hairline}` }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 500, color: colors.text, display: "inline" }}>Enrollment inbox</div>
          <div style={{ height: 2, background: colors.amber, borderRadius: 1, marginTop: 6, width: 200 }} />
        </div>
        <div style={{ fontSize: 14, color: colors.verify, fontWeight: 500, marginTop: 8 }}>
          {pendingCount} pending request{pendingCount !== 1 ? "s" : ""}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 88px" }}>
        {/* 1-to-1 requests */}
        {PENDING_REQUESTS.length > 0 && (
          <div style={{ marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${colors.green}1A`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <User size={14} color={colors.green} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: colors.text }}>One-to-one enrollment</div>
                <div style={{ fontSize: 11, color: colors.muted, marginTop: 1 }}>A new student wants a private session</div>
              </div>
            </div>
            {PENDING_REQUESTS.map((req) => (
              <RequestCard
                key={req.id}
                req={req}
                status={statuses[req.id] ?? "pending"}
                onAccept={() => setSlotPickerFor(req.id)}
                onDecline={() => setStatus(req.id, "rejected")}
              />
            ))}
          </div>
        )}

        {/* Batch requests */}
        {BATCH_REQUESTS.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${colors.ai}1A`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Users2 size={14} color={colors.ai} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: colors.text }}>Batch requests</div>
                <div style={{ fontSize: 11, color: colors.muted, marginTop: 1 }}>Join & conversion requests for your batches</div>
              </div>
            </div>
            {BATCH_REQUESTS.map((br) => (
              <BatchCard
                key={br.id}
                br={br}
                status={statuses[br.id] ?? "pending"}
                onAccept={() => setStatus(br.id, "accepted")}
                onDecline={() => setStatus(br.id, "rejected")}
              />
            ))}
          </div>
        )}

        {PENDING_REQUESTS.length === 0 && BATCH_REQUESTS.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 60, gap: 10 }}>
            <div style={{ width: 56, height: 56, borderRadius: 999, background: colors.amberTint, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users2 size={26} color={colors.amber} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: colors.text }}>No pending requests</div>
            <div style={{ fontSize: 13, color: colors.muted, textAlign: "center" }}>New enrollment requests from students will appear here.</div>
          </div>
        )}
      </div>

      {/* Slot picker modal */}
      {slotPickerFor && (
        <SlotPickerModal
          studentName={PENDING_REQUESTS.find((r) => r.id === slotPickerFor)?.student.name ?? ""}
          onConfirm={(slot) => { setStatus(slotPickerFor, "accepted"); setSlotPickerFor(null); }}
          onCancel={() => setSlotPickerFor(null)}
        />
      )}

      <BottomNav role="tutor" />
    </div>
  );
}
