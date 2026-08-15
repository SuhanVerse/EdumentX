import { useState } from "react";
import { CheckCircle, XCircle, MessageSquare } from "lucide-react";
import { VERIFICATION_QUEUE } from "../data/mockData";
import { BlueTick } from "../components/shared/BlueTick";
import { StatusBar } from "../components/shared/StatusBar";
import { AdminNav } from "../components/shared/AdminNav";

type QueueStatus = "pending" | "approved" | "rejected" | "more_info";

export function VerificationQueue() {
  const [statuses, setStatuses] = useState<Record<string, QueueStatus>>(() => {
    const init: Record<string, QueueStatus> = {};
    VERIFICATION_QUEUE.forEach((q) => { init[q.id] = q.status as QueueStatus; });
    return init;
  });

  const pending = VERIFICATION_QUEUE.filter((q) => (statuses[q.id] ?? q.status) === "pending");
  const done = VERIFICATION_QUEUE.filter((q) => (statuses[q.id] ?? q.status) !== "pending");

  return (
    <div style={{ width: "100%", height: "100%", background: "#FBF8F2", display: "flex", flexDirection: "column" }}>
      <StatusBar />

      {/* Header */}
      <div style={{ background: "#2F5D50", padding: "0 20px 16px", flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 500, color: "#FFFFFF" }}>Verification queue</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
          {pending.length} pending · {done.length} reviewed
        </div>
        <AdminNav />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 32px" }}>
        {/* Pending */}
        {pending.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Pending review</div>
            {pending.map((item) => (
              <div key={item.id} style={{ background: "#FFFFFF", borderRadius: 12, padding: "14px 16px", marginBottom: 10, border: "1px solid #E7E1D3" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
                  <img src={item.avatar} alt={item.name} style={{ width: 44, height: 44, borderRadius: 999, objectFit: "cover" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: "#0F172A" }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: "#9CA3AF" }}>Submitted {item.submitted}</div>
                  </div>
                  <span style={{ background: "#FBEFD9", color: "#D97706", fontSize: 11, fontWeight: 500, padding: "3px 8px", borderRadius: 6 }}>Pending</span>
                </div>

                {/* Document thumbnails */}
                <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto" }}>
                  {item.docs.map((doc, i) => (
                    <div key={doc} style={{ flexShrink: 0, width: 72, height: 52, borderRadius: 8, overflow: "hidden", position: "relative", border: "1px solid #E7E1D3" }}>
                      <img src="https://images.unsplash.com/photo-1762330917056-e69b34329ddf?w=72&h=52&fit=crop" alt={doc} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.5 }} />
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 8, color: "#6B7280", fontWeight: 500, textAlign: "center", background: "rgba(255,255,255,0.8)", padding: "2px 4px", borderRadius: 3 }}>
                          {doc}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setStatuses((p) => ({ ...p, [item.id]: "approved" }))}
                    style={{ flex: 1, height: 38, background: "#3F8A5A", color: "#FFFFFF", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                  >
                    <CheckCircle size={13} /> Approve
                  </button>
                  <button
                    onClick={() => setStatuses((p) => ({ ...p, [item.id]: "rejected" }))}
                    style={{ flex: 1, height: 38, background: "#F7E4E0", color: "#C1503D", border: "1px solid #F0D0C9", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                  >
                    <XCircle size={13} /> Reject
                  </button>
                  <button
                    onClick={() => setStatuses((p) => ({ ...p, [item.id]: "more_info" }))}
                    style={{ flex: 1, height: 38, background: "#E4EDE9", color: "#2F5D50", border: "1px solid #C3E0D0", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                  >
                    <MessageSquare size={12} /> More info
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reviewed */}
        {done.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Reviewed</div>
            {done.map((item) => {
              const status = statuses[item.id] ?? item.status;
              return (
                <div key={item.id} style={{ background: "#FFFFFF", borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: "1px solid #E7E1D3", display: "flex", alignItems: "center", gap: 10, opacity: 0.8 }}>
                  <img src={item.avatar} alt={item.name} style={{ width: 40, height: 40, borderRadius: 999, objectFit: "cover" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: "#0F172A" }}>{item.name}</span>
                      {status === "approved" && <BlueTick size={16} />}
                    </div>
                    <div style={{ fontSize: 11, color: "#9CA3AF" }}>Submitted {item.submitted}</div>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      padding: "3px 8px",
                      borderRadius: 6,
                      background: status === "approved" ? "#DCF0E4" : status === "rejected" ? "#F7E4E0" : "#E4EDE9",
                      color: status === "approved" ? "#3F8A5A" : status === "rejected" ? "#C1503D" : "#2F5D50",
                    }}
                  >
                    {status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Info requested"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
