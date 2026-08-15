import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, Upload, CheckCircle, Video, FileText, CreditCard } from "lucide-react";
import { StatusBar } from "../components/shared/StatusBar";

interface UploadItem {
  key: string;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}

const UPLOAD_ITEMS: UploadItem[] = [
  { key: "citizenship", label: "Citizenship ID", sublabel: "Front and back photo", icon: CreditCard, color: "#2F5D50", bg: "#E4EDE9" },
  { key: "academic", label: "Academic certificates", sublabel: "Degree, transcripts, diplomas", icon: FileText, color: "#3F8A5A", bg: "#DCF0E4" },
  { key: "demo", label: "Demo teaching video", sublabel: "Max 60 seconds · MP4 / MOV", icon: Video, color: "#4A7FA5", bg: "#E3EDF4" },
];

export function DocumentUpload() {
  const navigate = useNavigate();
  const [uploads, setUploads] = useState<Record<string, "idle" | "uploading" | "done">>({
    citizenship: "done",
    academic: "uploading",
    demo: "idle",
  });
  const [progress, setProgress] = useState({ academic: 65 });

  const handleUpload = (key: string) => {
    if (uploads[key] !== "idle") return;
    setUploads((p) => ({ ...p, [key]: "uploading" }));
    let prog = 0;
    const interval = setInterval(() => {
      prog += 10;
      setProgress((p) => ({ ...p, [key]: prog }));
      if (prog >= 100) {
        clearInterval(interval);
        setUploads((p) => ({ ...p, [key]: "done" }));
      }
    }, 200);
  };

  const allDone = Object.values(uploads).every((v) => v === "done");

  return (
    <div style={{ width: "100%", height: "100%", background: "#FBF8F2", display: "flex", flexDirection: "column" }}>
      <StatusBar />

      {/* Header */}
      <div style={{ background: "#FFFFFF", borderBottom: "1px solid #E7E1D3", display: "flex", alignItems: "center", paddingLeft: 4, paddingRight: 16, height: 56, flexShrink: 0 }}>
        <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", cursor: "pointer", padding: 8 }}>
          <ChevronLeft size={24} style={{ color: "#2F5D50" }} />
        </button>
        <div style={{ fontSize: 17, fontWeight: 500, color: "#0F172A", paddingLeft: 4 }}>Document verification</div>
      </div>

      {/* Amber banner */}
      <div style={{ background: "#FBEFD9", padding: "12px 20px", flexShrink: 0, borderBottom: "1px solid #FDE68A" }}>
        <div style={{ fontSize: 13, color: "#92400E", lineHeight: 1.5 }}>
          ⏳ <strong>Verification pending</strong> — Admin will review your documents within 48 hours. You'll be notified by SMS once approved.
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 40px" }}>
        {/* Info */}
        <div style={{ background: "#E4EDE9", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#2F5D50", marginBottom: 4 }}>Why verify?</div>
          <div style={{ fontSize: 13, color: "#2F5D50", lineHeight: 1.6 }}>
            Verified tutors get a Blue Tick badge, appear higher in search results, and earn 40% more enrollments.
          </div>
        </div>

        {/* Upload zones */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
          {UPLOAD_ITEMS.map(({ key, label, sublabel, icon: Icon, color, bg }) => {
            const status = uploads[key];
            const prog = (progress as any)[key] ?? 100;

            return (
              <div
                key={key}
                onClick={() => handleUpload(key)}
                style={{
                  background: "#FFFFFF",
                  borderRadius: 12,
                  padding: "16px",
                  border: status === "done" ? `1px solid #3F8A5A` : status === "uploading" ? `1px solid #E7E1D3` : "1.5px dashed #E7E1D3",
                  cursor: status === "idle" ? "pointer" : "default",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: status === "done" ? "#DCF0E4" : bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {status === "done"
                      ? <CheckCircle size={22} style={{ color: "#3F8A5A" }} />
                      : <Icon size={22} style={{ color }} />
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "#0F172A" }}>{label}</div>
                      {status === "done" && (
                        <span style={{ fontSize: 11, color: "#3F8A5A", fontWeight: 500, background: "#DCF0E4", padding: "2px 8px", borderRadius: 6 }}>Uploaded</span>
                      )}
                      {status === "idle" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Upload size={14} style={{ color: "#9CA3AF" }} />
                          <span style={{ fontSize: 12, color: "#9CA3AF" }}>Tap to upload</span>
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{sublabel}</div>

                    {status === "uploading" && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ height: 4, background: "#F1ECE0", borderRadius: 999, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${prog}%`, background: "#2F5D50", borderRadius: 999, transition: "width 0.2s" }} />
                        </div>
                        <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 3 }}>Uploading... {prog}%</div>
                      </div>
                    )}

                    {status === "done" && key === "citizenship" && (
                      <div style={{ marginTop: 8, borderRadius: 8, overflow: "hidden", height: 48 }}>
                        <img src="https://images.unsplash.com/photo-1762330917056-e69b34329ddf?w=300&h=48&fit=crop" alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Checklist */}
        <div style={{ background: "#FFFFFF", borderRadius: 12, padding: "14px 16px", border: "1px solid #E7E1D3" }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#0F172A", marginBottom: 10 }}>Document requirements</div>
          {["Clear, readable photos", "Valid government-issued ID", "Original certificates (no photocopies)", "Demo video must show teaching"].map((req) => (
            <div key={req} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <div style={{ width: 4, height: 4, borderRadius: 999, background: "#6B7280", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#6B7280" }}>{req}</span>
            </div>
          ))}
        </div>

        {allDone && (
          <div style={{ marginTop: 16, background: "#DCF0E4", borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#3F8A5A" }}>✅ All documents uploaded</div>
            <div style={{ fontSize: 12, color: "#059669", marginTop: 4 }}>Our team will verify within 48 hours</div>
          </div>
        )}
      </div>
    </div>
  );
}
