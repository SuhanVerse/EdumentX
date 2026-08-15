import { useState } from "react";
import { useNavigate } from "react-router";
import { Camera, Navigation, Upload, Check, FileText, Video, IdCard, AlertCircle } from "lucide-react";

const QUALIFICATIONS = [
  "+2",
  "Bachelor ongoing",
  "Bachelor passout",
  "Masters ongoing",
  "Masters passout",
];

const SPECIALTIES = [
  "Mathematics",
  "Science",
  "English",
  "Social Studies",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "Economics",
  "Accountancy",
];

const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];

const TEACHING_MODES = [
  { id: "in-person", label: "In-person" },
  { id: "online", label: "Online" },
  { id: "both", label: "Both" },
];

const LANGUAGES = ["Nepali", "English", "Hindi", "Newari"];

type DocKey = "citizenship" | "qualification" | "demo";

type DocState = { uploaded: boolean; fileName?: string };

const DOCS: { key: DocKey; label: string; sub: string; Icon: typeof IdCard }[] = [
  { key: "citizenship", label: "Citizenship / National ID", sub: "Front side, clear image", Icon: IdCard },
  { key: "qualification", label: "Qualification certificate", sub: "Degree, transcript or marksheet", Icon: FileText },
  { key: "demo", label: "Demo teaching video", sub: "1–3 min, optional but boosts trust", Icon: Video },
];

export function TutorProfileSetup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [qualification, setQualification] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [experience, setExperience] = useState("");
  const [rate, setRate] = useState("");
  const [bio, setBio] = useState("");
  const [mode, setMode] = useState("in-person");
  const [languages, setLanguages] = useState<string[]>(["Nepali", "English"]);
  const [locationDetected, setLocationDetected] = useState(false);
  const [docs, setDocs] = useState<Record<DocKey, DocState>>({
    citizenship: { uploaded: false },
    qualification: { uploaded: false },
    demo: { uploaded: false },
  });

  const toggleArray = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const uploadDoc = (key: DocKey) => {
    setDocs((p) => ({ ...p, [key]: { uploaded: true, fileName: `${key}.jpg` } }));
  };

  const requiredFilled =
    name.trim() &&
    age.trim() &&
    gender &&
    qualification &&
    specialties.length > 0 &&
    rate.trim() &&
    docs.citizenship.uploaded &&
    docs.qualification.uploaded;

  return (
    <div style={{ width: "100%", height: "100%", background: "#FBF8F2", display: "flex", flexDirection: "column", fontFamily: "Inter, sans-serif", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: "#3F8A5A", paddingTop: 52, paddingBottom: 20, paddingLeft: 24, paddingRight: 24, flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
          Tutor profile · final step
        </div>
        <div style={{ fontSize: 22, fontWeight: 500, color: "#FFFFFF", marginBottom: 4 }}>Set up your tutor profile</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>
          Students see this. Documents are reviewed before you go live.
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 110px" }}>
        {/* Avatar */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <div style={{ position: "relative" }}>
            <div style={{ width: 86, height: 86, borderRadius: 999, background: "#DCF0E4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>
              👩‍🏫
            </div>
            <div style={{ position: "absolute", bottom: 0, right: 0, width: 30, height: 30, borderRadius: 999, background: "#3F8A5A", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "2px solid #FBF8F2" }}>
              <Camera size={14} color="#FFFFFF" />
            </div>
          </div>
        </div>

        {/* Name */}
        <FieldCard label="Full name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ram Sharma"
            style={inputStyle}
          />
        </FieldCard>

        {/* Age + Gender */}
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <FieldCard label="Age">
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 28"
                style={inputStyle}
              />
            </FieldCard>
          </div>
        </div>

        <FieldCard label="Gender">
          <div style={chipRow}>
            {GENDERS.map((g) => (
              <Chip key={g} active={gender === g} onClick={() => setGender(g)} accent="teal">{g}</Chip>
            ))}
          </div>
        </FieldCard>

        {/* Qualification */}
        <FieldCard label="Highest qualification">
          <div style={chipRow}>
            {QUALIFICATIONS.map((q) => (
              <Chip key={q} active={qualification === q} onClick={() => setQualification(q)} accent="teal">{q}</Chip>
            ))}
          </div>
        </FieldCard>

        {/* Specialty */}
        <FieldCard label="Specialty subjects" hint="Select all you teach">
          <div style={chipRow}>
            {SPECIALTIES.map((s) => (
              <Chip key={s} active={specialties.includes(s)} onClick={() => setSpecialties((p) => toggleArray(p, s))} accent="teal">
                {s}
              </Chip>
            ))}
          </div>
        </FieldCard>

        {/* Experience + Rate */}
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <FieldCard label="Experience">
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <input
                  type="number"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  placeholder="0"
                  style={{ ...inputStyle, width: 56 }}
                />
                <span style={{ fontSize: 13, color: "#6B7280" }}>years</span>
              </div>
            </FieldCard>
          </div>
          <div style={{ flex: 1 }}>
            <FieldCard label="Hourly rate">
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 13, color: "#6B7280" }}>NPR</span>
                <input
                  type="number"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="3000"
                  style={{ ...inputStyle, width: 80 }}
                />
                <span style={{ fontSize: 12, color: "#9CA3AF" }}>/ month</span>
              </div>
            </FieldCard>
          </div>
        </div>

        {/* Teaching mode */}
        <FieldCard label="Teaching mode">
          <div style={chipRow}>
            {TEACHING_MODES.map((m) => (
              <Chip key={m.id} active={mode === m.id} onClick={() => setMode(m.id)} accent="teal">{m.label}</Chip>
            ))}
          </div>
        </FieldCard>

        {/* Languages */}
        <FieldCard label="Teaching languages">
          <div style={chipRow}>
            {LANGUAGES.map((l) => (
              <Chip key={l} active={languages.includes(l)} onClick={() => setLanguages((p) => toggleArray(p, l))} accent="teal">{l}</Chip>
            ))}
          </div>
        </FieldCard>

        {/* Bio */}
        <FieldCard label="Short bio" hint="2–3 sentences students will see on your profile">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Experienced math and physics tutor focused on board-exam preparation…"
            rows={3}
            style={{ ...inputStyle, resize: "none", paddingTop: 8, lineHeight: 1.5 }}
          />
        </FieldCard>

        {/* Location */}
        <FieldCard label="Your location">
          <button
            onClick={() => setLocationDetected(true)}
            style={{
              width: "100%",
              height: 44,
              borderRadius: 10,
              border: `1px solid ${locationDetected ? "#3F8A5A" : "#E7E1D3"}`,
              background: locationDetected ? "#DCF0E4" : "#FBF8F2",
              display: "flex",
              alignItems: "center",
              gap: 10,
              paddingLeft: 12,
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
            }}
          >
            <Navigation size={16} color={locationDetected ? "#3F8A5A" : "#9CA3AF"} />
            <span style={{ fontSize: 13, color: locationDetected ? "#3F8A5A" : "#6B7280", fontWeight: locationDetected ? 500 : 400 }}>
              {locationDetected ? "📍 Lazimpat, Kathmandu" : "Auto-detect my location"}
            </span>
          </button>
        </FieldCard>

        {/* Documents */}
        <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 16, marginBottom: 12, border: "1px solid #E7E1D3" }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
            Verification documents
          </div>
          <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 12, lineHeight: 1.5 }}>
            Citizenship + qualification proof are required to publish your profile. Reviewed within 24 hours.
          </div>

          {DOCS.map(({ key, label, sub, Icon }) => {
            const state = docs[key];
            const required = key !== "demo";
            return (
              <button
                key={key}
                onClick={() => uploadDoc(key)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                  marginBottom: 8,
                  background: state.uploaded ? "#DCF0E4" : "#FBF8F2",
                  border: `1px dashed ${state.uploaded ? "#3F8A5A" : "#E7E1D3"}`,
                  borderRadius: 10,
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                  textAlign: "left",
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 8, background: state.uploaded ? "#3F8A5A" : "#FFFFFF", border: state.uploaded ? "none" : "1px solid #E7E1D3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {state.uploaded ? <Check size={16} color="#FFFFFF" /> : <Icon size={16} color="#6B7280" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#0F172A" }}>{label}</span>
                    {required && <span style={{ fontSize: 10, color: "#B45309", background: "#FBEFD9", padding: "1px 6px", borderRadius: 4, fontWeight: 500 }}>Required</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                    {state.uploaded ? `Uploaded · ${state.fileName}` : sub}
                  </div>
                </div>
                {!state.uploaded && <Upload size={16} color="#9CA3AF" />}
              </button>
            );
          })}
        </div>

        {/* Privacy note */}
        <div style={{ display: "flex", gap: 8, padding: "10px 12px", background: "#EFF6FF", borderRadius: 10, marginBottom: 12 }}>
          <AlertCircle size={14} color="#1E40AF" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 11, color: "#1E40AF", lineHeight: 1.6 }}>
            Documents are visible to EdumentX admins only. Students see a verified badge once approved.
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 20px 32px", background: "#FBF8F2", borderTop: "1px solid #E7E1D3" }}>
        <button
          onClick={() => requiredFilled && navigate("/tutor/dashboard")}
          disabled={!requiredFilled}
          style={{
            width: "100%",
            height: 52,
            background: requiredFilled ? "#3F8A5A" : "#E7E1D3",
            color: requiredFilled ? "#FFFFFF" : "#9CA3AF",
            border: "none",
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 500,
            cursor: requiredFilled ? "pointer" : "not-allowed",
            fontFamily: "Inter, sans-serif",
          }}
        >
          Submit for verification
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  border: "none",
  outline: "none",
  fontSize: 15,
  color: "#0F172A",
  paddingTop: 8,
  fontFamily: "Inter, sans-serif",
  background: "transparent",
  boxSizing: "border-box",
};

const chipRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

function FieldCard({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 16, marginBottom: 12, border: "1px solid #E7E1D3" }}>
      <label style={{ fontSize: 11, fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: hint ? 2 : 8 }}>
        {label}
      </label>
      {hint && <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 10 }}>{hint}</div>}
      {children}
    </div>
  );
}

function Chip({ active, onClick, children, accent }: { active: boolean; onClick: () => void; children: React.ReactNode; accent: "blue" | "teal" }) {
  const activeBg = accent === "teal" ? "#3F8A5A" : "#2F5D50";
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 13px",
        borderRadius: 999,
        border: "none",
        background: active ? activeBg : "#F1ECE0",
        color: active ? "#FFFFFF" : "#6B7280",
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {children}
    </button>
  );
}
