import { useState } from "react";
import { useNavigate } from "react-router";
import { Copy, Check, Share2, Users2, Sparkles, MessageSquare } from "lucide-react";
import { ScreenHeader } from "../components/shared/ScreenHeader";

const CODE = "RS-PH-7K2X";

export function SessionCode() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try { await navigator.clipboard.writeText(CODE); } catch { /* noop */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const onShare = async () => {
    const text = `Join my private batch with Ram Sharma on EdumentX. Session code: ${CODE}`;
    try {
      if ((navigator as any).share) await (navigator as any).share({ title: "Session code", text });
      else await navigator.clipboard.writeText(text);
    } catch { /* noop */ }
  };

  return (
    <div style={{ width: "100%", height: "100%", background: "#FBF8F2", display: "flex", flexDirection: "column", fontFamily: "Inter, sans-serif" }}>
      <ScreenHeader title="Session code" subtitle="Share with your friends" backPath={-1 as any} />

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 16px 24px" }}>
        {/* Hero */}
        <div style={{ background: "linear-gradient(135deg, #4A7FA5 0%, #2F5D50 100%)", borderRadius: 18, padding: "22px 18px", color: "#FFFFFF", marginBottom: 16, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: 999, background: "rgba(255,255,255,0.08)" }} />
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, background: "rgba(255,255,255,0.18)", marginBottom: 14 }}>
            <Sparkles size={12} color="#FFFFFF" />
            <span style={{ fontSize: 11, fontWeight: 500 }}>Private batch unlocked</span>
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", marginBottom: 4 }}>Your session code</div>
          <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: "0.18em", marginBottom: 14, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{CODE}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onCopy}
              style={{ flex: 1, height: 44, background: "#FFFFFF", color: "#2F5D50", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              {copied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy code</>}
            </button>
            <button
              onClick={onShare}
              style={{ flex: 1, height: 44, background: "rgba(255,255,255,0.15)", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              <Share2 size={15} /> Share
            </button>
          </div>
        </div>

        {/* Capacity */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E7E1D3", borderRadius: 14, padding: 16, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Users2 size={16} color="#2F5D50" />
            <div style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "#0F172A" }}>Batch capacity</div>
            <div style={{ fontSize: 13, color: "#3F8A5A", fontWeight: 500 }}>1 of 5</div>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: "#F1ECE0", overflow: "hidden", marginBottom: 8 }}>
            <div style={{ width: "20%", height: "100%", background: "#3F8A5A", borderRadius: 999 }} />
          </div>
          <div style={{ fontSize: 12, color: "#6B7280" }}>4 spots remaining. Once full, no further join requests are accepted.</div>
        </div>

        {/* How it works */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E7E1D3", borderRadius: 14, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#0F172A", marginBottom: 12 }}>How sharing works</div>
          {[
            "Send this code to a friend you trust.",
            "Your friend opens EdumentX, taps Enroll, and enters the code.",
            "The tutor reviews each join request individually.",
            "Once 5 students total are in the batch, no more requests are accepted.",
          ].map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 22, height: 22, borderRadius: 999, background: "#E4EDE9", color: "#2F5D50", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {i + 1}
              </div>
              <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.6, paddingTop: 2 }}>{step}</div>
            </div>
          ))}
        </div>

        <button
          onClick={onShare}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: 14, background: "#FFFFFF", border: "1px solid #E7E1D3", borderRadius: 14, cursor: "pointer", fontFamily: "Inter, sans-serif", textAlign: "left" }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#DCF0E4", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MessageSquare size={16} color="#3F8A5A" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#0F172A" }}>Share via WhatsApp / SMS</div>
            <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>Sends a pre-filled message with the code</div>
          </div>
        </button>

        <button
          onClick={() => navigate("/student/enrollments")}
          style={{ marginTop: 16, width: "100%", height: 48, background: "transparent", color: "#2F5D50", border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}
        >
          Back to my enrollments
        </button>
      </div>
    </div>
  );
}
