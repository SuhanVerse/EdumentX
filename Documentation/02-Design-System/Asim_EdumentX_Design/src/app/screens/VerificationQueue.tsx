import { useState } from "react";
import { CheckCircle, XCircle, Info, ChevronDown, ChevronUp, Play, Image } from "lucide-react";
import { VERIFICATION_QUEUE } from "../data/mockData";
import { BlueTick } from "../components/shared/BlueTick";
import { AdminNav } from "../components/shared/AdminNav";
import { colors, type as typo, font } from "../theme/tokens";

type QueueStatus = "pending" | "approved" | "rejected" | "more_info";

// Additional tutor details (augmenting sparse mockData)
const DETAILS: Record<string, { subjects: string; level: string; rate: string; experience: string; degree: string; institution: string; bio?: string }> = {
  "1": { subjects: "English, Social Studies", level: "Grade 8–10", rate: "Rs 2,200/mo", experience: "2 years", degree: "B.A. English", institution: "Tribhuvan University", bio: "Passionate English tutor focused on helping students improve communication skills and reading comprehension for board exams." },
  "2": { subjects: "Mathematics, Physics", level: "Grade 9–12", rate: "Rs 3,500/mo", experience: "5 years", degree: "M.Sc. Mathematics", institution: "Tribhuvan University" },
  "3": { subjects: "Science, Biology", level: "Grade 9–11", rate: "Rs 2,800/mo", experience: "3 years", degree: "B.Sc. Biology", institution: "Tribhuvan University", bio: "Uses visual learning methods and diagrams to make complex science topics accessible." },
  "4": { subjects: "Mathematics, Physics", level: "Grade 9–12, +2", rate: "Rs 3,500/mo", experience: "5 years", degree: "M.Sc. Mathematics", institution: "Tribhuvan University" },
  "5": { subjects: "Physics, Chemistry, Mathematics", level: "+2, Entrance", rate: "Rs 4,000/mo", experience: "8 years", degree: "M.Sc. Physics", institution: "Kathmandu University" },
};

function RejectDialog({ name, onConfirm, onCancel }: { name: string; onConfirm: (reason: string) => void; onCancel: () => void }) {
  const [reason, setReason] = useState("");
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 360, background: colors.paper, borderRadius: 24, padding: 20 }}>
        <div style={{ width: 48, height: 48, borderRadius: 999, background: colors.dangerTint, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
          <XCircle size={24} color={colors.danger} />
        </div>
        <div style={{ fontSize: 17, fontWeight: 600, color: colors.text, textAlign: "center", marginBottom: 6 }}>Reject {name}?</div>
        <div style={{ fontSize: 13, color: colors.muted, textAlign: "center", marginBottom: 16, lineHeight: 1.5 }}>
          Tell the tutor why. They'll see this on their dashboard.
        </div>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Documents are unclear. Please re-upload a clearer citizenship scan."
          rows={4}
          style={{ width: "100%", background: colors.sand, borderRadius: 14, padding: 12, border: "none", resize: "none", fontSize: 13, color: colors.text, fontFamily: font, outline: "none", boxSizing: "border-box", minHeight: 96 }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, height: 48, background: colors.sand, border: "none", borderRadius: 14, fontSize: 14, fontWeight: 500, color: colors.muted, cursor: "pointer", fontFamily: font }}
          >
            Cancel
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason)}
            disabled={!reason.trim()}
            style={{ flex: 2, height: 48, background: reason.trim() ? colors.danger : colors.dangerTint, border: "none", borderRadius: 14, fontSize: 14, fontWeight: 600, color: colors.inverse, cursor: reason.trim() ? "pointer" : "default", fontFamily: font }}
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

function DocThumbnail({ label }: { label: string }) {
  const isVideo = label.toLowerCase().includes("video");
  return (
    <div style={{ flexShrink: 0, width: 100, background: colors.sand, border: `1px solid ${colors.hairline}`, borderRadius: 8, overflow: "hidden" }}>
      <div style={{ height: 64, background: isVideo ? colors.amberTint : colors.aiTint, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {isVideo ? <Play size={24} color={colors.amber} /> : <Image size={24} color={colors.ai} />}
      </div>
      <div style={{ padding: "6px 8px" }}>
        <div style={{ fontSize: 10, fontWeight: 500, color: colors.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
        <div style={{ fontSize: 9, color: colors.muted, marginTop: 2 }}>Tap to view</div>
      </div>
    </div>
  );
}

function VerificationCard({
  item,
  status,
  onApprove,
  onReject,
  onInfo,
}: {
  item: typeof VERIFICATION_QUEUE[number];
  status: QueueStatus;
  onApprove: () => void;
  onReject: () => void;
  onInfo: () => void;
}) {
  const detail = DETAILS[item.id] ?? DETAILS["1"];
  const isPending = status === "pending" || status === "more_info";

  const statusPill = {
    pending:   { bg: colors.amberTint,  color: colors.amber,  label: "Pending Review" },
    more_info: { bg: colors.aiTint,     color: colors.ai,     label: "Info Requested" },
    approved:  { bg: colors.verifyTint, color: colors.verify, label: "Approved" },
    rejected:  { bg: colors.dangerTint, color: colors.danger, label: "Rejected" },
  }[status];

  return (
    <div style={{ background: colors.card, border: `1px solid ${colors.hairline}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
      {/* Header */}
      <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        <div style={{ position: "relative" }}>
          <img src={item.avatar} alt={item.name} style={{ width: 48, height: 48, borderRadius: 999, objectFit: "cover" }} />
          {status === "approved" && <div style={{ position: "absolute", bottom: -2, right: -2 }}><BlueTick size={16} /></div>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: colors.text }}>{item.name}</div>
          <div style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>Submitted {item.submitted}</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 500, padding: "4px 8px", borderRadius: 8, background: statusPill.bg, color: statusPill.color, flexShrink: 0, height: "fit-content" }}>
          {statusPill.label}
        </span>
      </div>

      {/* Details grid */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {[
          { label: "Subjects", value: detail.subjects },
          { label: "Level", value: detail.level },
          { label: "Rate", value: detail.rate },
          { label: "Experience", value: detail.experience },
          { label: "Degree", value: detail.degree },
          { label: "Institution", value: detail.institution },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: colors.sand, borderRadius: 8, padding: "8px 12px", flex: "1 1 40%", minWidth: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 500, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: colors.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Bio */}
      {detail.bio && (
        <div style={{ background: colors.sand, borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 500, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Bio</div>
          <div style={{ fontSize: 12, color: colors.muted, lineHeight: 1.5 }}>{detail.bio}</div>
        </div>
      )}

      {/* Documents */}
      <div style={{ marginBottom: isPending ? 14 : 0 }}>
        <div style={{ fontSize: 9, fontWeight: 500, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Documents</div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
          {item.docs.map((doc) => <DocThumbnail key={doc} label={doc} />)}
        </div>
      </div>

      {/* Actions */}
      {isPending && (
        <div style={{ display: "flex", gap: 6, borderTop: `1px solid ${colors.hairline}`, paddingTop: 14 }}>
          <button
            onClick={onApprove}
            style={{ flex: 1, height: 40, background: colors.verify, color: colors.inverse, border: "none", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
          >
            <CheckCircle size={14} /> Approve
          </button>
          <button
            onClick={onReject}
            style={{ flex: 1, height: 40, background: colors.danger, color: colors.inverse, border: "none", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
          >
            <XCircle size={14} /> Reject
          </button>
          {status !== "more_info" && (
            <button
              onClick={onInfo}
              style={{ flex: 1, height: 40, background: colors.ai, color: colors.inverse, border: "none", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
            >
              <Info size={14} /> Info
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function VerificationQueue() {
  const [statuses, setStatuses] = useState<Record<string, QueueStatus>>(() => {
    const init: Record<string, QueueStatus> = {};
    VERIFICATION_QUEUE.forEach((q) => { init[q.id] = q.status as QueueStatus; });
    return init;
  });
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [decidedExpanded, setDecidedExpanded] = useState(false);

  const setStatus = (id: string, s: QueueStatus) => setStatuses((p) => ({ ...p, [id]: s }));

  const pending = VERIFICATION_QUEUE.filter((q) => statuses[q.id] === "pending" || statuses[q.id] === "more_info");
  const decided = VERIFICATION_QUEUE.filter((q) => statuses[q.id] === "approved" || statuses[q.id] === "rejected");

  return (
    <div style={{ width: "100%", height: "100%", background: colors.paper, display: "flex", flexDirection: "column", fontFamily: font }}>
      {/* Dark slate hero */}
      <div style={{ background: colors.slate, padding: "24px 20px 0", flexShrink: 0 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>Moderation</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 22, fontWeight: 500, color: colors.inverse }}>Verification Queue</div>
            <div style={{ width: 6, height: 6, borderRadius: 999, background: colors.amber }} />
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>
            <strong style={{ color: "rgba(255,255,255,0.9)" }}>{pending.length} open</strong> · {decided.length} decided
          </div>
        </div>
        <AdminNav />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px 32px" }}>
        {/* Pending section */}
        {pending.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: colors.text }}>Pending Review</div>
              <span style={{ fontSize: 10, fontWeight: 600, background: colors.amberTint, color: colors.amber, padding: "2px 7px", borderRadius: 999 }}>{pending.length}</span>
              <div style={{ flex: 1, fontSize: 12, color: colors.muted }}>Awaiting your decision</div>
            </div>
            {pending.map((item) => (
              <VerificationCard
                key={item.id}
                item={item}
                status={statuses[item.id]}
                onApprove={() => setStatus(item.id, "approved")}
                onReject={() => setRejectTarget(item.id)}
                onInfo={() => setStatus(item.id, "more_info")}
              />
            ))}
          </div>
        )}

        {pending.length === 0 && decided.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 60, gap: 10 }}>
            <div style={{ width: 56, height: 56, borderRadius: 999, background: colors.amberTint, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle size={26} color={colors.amber} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: colors.text }}>Queue is clear</div>
            <div style={{ fontSize: 13, color: colors.muted, textAlign: "center" }}>New tutor verifications and edit requests will appear here.</div>
          </div>
        )}

        {/* Decided section — collapsible */}
        {decided.length > 0 && (
          <div>
            <button
              onClick={() => setDecidedExpanded((e) => !e)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", fontFamily: font, padding: "8px 0", marginBottom: 8 }}
            >
              {decidedExpanded ? <ChevronUp size={16} color={colors.muted} /> : <ChevronDown size={16} color={colors.muted} />}
              <div style={{ fontSize: 15, fontWeight: 500, color: colors.text }}>Decided</div>
              <span style={{ fontSize: 12, color: colors.muted }}>({decided.length})</span>
            </button>
            {decidedExpanded && decided.map((item) => {
              const status = statuses[item.id];
              return (
                <div key={item.id} style={{ background: colors.card, border: `1px solid ${colors.hairline}`, borderRadius: 14, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10, opacity: 0.8 }}>
                  <div style={{ position: "relative" }}>
                    <img src={item.avatar} alt={item.name} style={{ width: 40, height: 40, borderRadius: 999, objectFit: "cover" }} />
                    {status === "approved" && <div style={{ position: "absolute", bottom: -2, right: -2 }}><BlueTick size={14} /></div>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: colors.text }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: colors.muted, marginTop: 1 }}>Submitted {item.submitted}</div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 500, padding: "3px 8px", borderRadius: 6,
                    background: status === "approved" ? colors.verifyTint : colors.dangerTint,
                    color: status === "approved" ? colors.verify : colors.danger,
                  }}>
                    {status === "approved" ? "Approved" : "Rejected"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reject dialog */}
      {rejectTarget && (
        <RejectDialog
          name={VERIFICATION_QUEUE.find((q) => q.id === rejectTarget)?.name ?? ""}
          onConfirm={(reason) => { setStatus(rejectTarget, "rejected"); setRejectTarget(null); }}
          onCancel={() => setRejectTarget(null)}
        />
      )}
    </div>
  );
}
