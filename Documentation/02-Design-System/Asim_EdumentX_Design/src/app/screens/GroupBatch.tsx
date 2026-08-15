import { useState } from "react";
import { Plus, X, Users2, Check, Sparkles } from "lucide-react";
import { STUDENT_AVATAR_1, TUTOR_AVATAR_4, TUTOR_AVATAR_3, TUTORS, DAYS } from "../data/mockData";
import { BottomNav } from "../components/shared/BottomNav";
import { ScreenHeader } from "../components/shared/ScreenHeader";

const ENROLLED_STUDENTS = [
  { id: "s1", name: "Aarav Tamang", grade: "Grade 10", subject: "Mathematics", avatar: STUDENT_AVATAR_1 },
  { id: "s2", name: "Priya Maharjan", grade: "Grade 11", subject: "Physics", avatar: TUTOR_AVATAR_4 },
  { id: "s3", name: "Sanjay Pandey", grade: "Grade 10", subject: "Mathematics", avatar: TUTOR_AVATAR_3 },
  { id: "s4", name: "Anita Gurung", grade: "Grade 11", subject: "Physics", avatar: STUDENT_AVATAR_1 },
  { id: "s5", name: "Bikash Rai", grade: "Grade 10", subject: "Mathematics", avatar: TUTOR_AVATAR_3 },
];

const EXISTING_BATCHES = [
  {
    id: "1", name: "Grade 10 Maths Batch A", subject: "Mathematics",
    maxSeats: 6, enrolled: 4, rate: 2200,
    schedule: ["Mon", "Wed", "Fri"],
    students: [
      { name: "Aarav Tamang", avatar: STUDENT_AVATAR_1 },
      { name: "Sanjay Pandey", avatar: TUTOR_AVATAR_3 },
    ],
  },
];

export function GroupBatch() {
  const me = TUTORS[0];
  const oneToOne = me.rate;
  const minRate = me.minBatchRate ?? Math.round(me.rate * 0.5);
  const recRate = me.recommendedBatchRate ?? Math.round(me.rate * 0.7);

  const [step, setStep] = useState<0 | 1 | 2 | 3>(0); // 0 = closed
  const [picked, setPicked] = useState<string[]>([]);
  const [batchName, setBatchName] = useState("");
  const [subject, setSubject] = useState("Mathematics");
  const [rate, setRate] = useState(String(recRate));
  const [days, setDays] = useState<string[]>(["Mon", "Wed", "Fri"]);
  const [sent, setSent] = useState(false);

  const togglePick = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 6 ? [...p, id] : p));
  const toggleDay = (d: string) =>
    setDays((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d]));

  const rateNum = Number(rate) || 0;
  const rateValid = rateNum >= minRate && rateNum <= oneToOne;
  const canStep2 = picked.length >= 2;
  const canStep3 = batchName.trim().length >= 3 && rateValid && days.length > 0;

  const close = () => { setStep(0); setSent(false); setPicked([]); setBatchName(""); };

  return (
    <div style={{ width: "100%", height: "100%", background: "#FBF8F2", display: "flex", flexDirection: "column", fontFamily: "Inter, sans-serif", position: "relative" }}>
      <ScreenHeader title="Group batches" subtitle="Combine students into shared batches" />

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 88px" }}>
        <button
          onClick={() => setStep(1)}
          style={{ width: "100%", height: 48, background: "#2F5D50", color: "#FFFFFF", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }}
        >
          <Plus size={18} /> Create new batch
        </button>

        <div style={{ fontSize: 13, fontWeight: 500, color: "#0F172A", marginBottom: 10 }}>Active batches</div>
        {EXISTING_BATCHES.map((b) => (
          <div key={b.id} style={{ background: "#FFFFFF", border: "1px solid #E7E1D3", borderRadius: 14, padding: 16, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#0F172A" }}>{b.name}</div>
                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{b.subject} · Rs {b.rate.toLocaleString()}/student/mo</div>
              </div>
              <span style={{ fontSize: 11, background: "#DCF0E4", color: "#3F8A5A", padding: "3px 8px", borderRadius: 6, fontWeight: 500 }}>Active</span>
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: "#6B7280" }}>Seats filled</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: "#0F172A" }}>{b.enrolled}/{b.maxSeats}</span>
              </div>
              <div style={{ height: 6, background: "#F1ECE0", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(b.enrolled / b.maxSeats) * 100}%`, background: "#2F5D50", borderRadius: 999 }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
              {b.schedule.map((d) => (
                <span key={d} style={{ fontSize: 11, background: "#E4EDE9", color: "#2F5D50", padding: "3px 8px", borderRadius: 6, fontWeight: 500 }}>{d}</span>
              ))}
            </div>

            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {b.students.map((s, i) => (
                <img key={i} src={s.avatar} alt={s.name} style={{ width: 28, height: 28, borderRadius: 999, objectFit: "cover", border: "2px solid #FFFFFF", marginLeft: i === 0 ? 0 : -8 }} />
              ))}
              {b.enrolled > b.students.length && (
                <div style={{ width: 28, height: 28, borderRadius: 999, background: "#E4EDE9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: "#2F5D50", marginLeft: -8, border: "2px solid #FFFFFF" }}>
                  +{b.enrolled - b.students.length}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <BottomNav role="tutor" />

      {/* Bottom sheet */}
      {step !== 0 && (
        <div onClick={close} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", zIndex: 20 }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxHeight: "85%", background: "#FFFFFF", borderRadius: "20px 20px 0 0", display: "flex", flexDirection: "column", overflow: "hidden" }}
          >
            <div style={{ padding: "12px 20px 0", display: "flex", justifyContent: "center" }}>
              <div style={{ width: 40, height: 4, borderRadius: 999, background: "#E7E1D3" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid #E7E1D3" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 500, color: "#0F172A" }}>
                  {sent ? "Invitations sent" : step === 1 ? "Pick students" : step === 2 ? "Batch details" : "Review"}
                </div>
                {!sent && (
                  <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>Step {step} of 3</div>
                )}
              </div>
              <button onClick={close} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: "#6B7280", display: "flex" }}>
                <X size={20} />
              </button>
            </div>

            {sent ? (
              <div style={{ padding: 24, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 72, height: 72, borderRadius: 999, background: "#DCF0E4", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  <Check size={36} color="#3F8A5A" />
                </div>
                <div style={{ fontSize: 16, fontWeight: 500, color: "#0F172A", marginBottom: 6 }}>{picked.length} invitations sent</div>
                <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6, marginBottom: 18, maxWidth: 280 }}>
                  Batch activates when at least 2 students accept within 48 hours.
                </div>
                <button onClick={close} style={{ width: "100%", height: 48, background: "#2F5D50", color: "#FFFFFF", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                  Done
                </button>
              </div>
            ) : (
              <>
                <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
                  {step === 1 && (
                    <>
                      <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 12 }}>Select 2–6 enrolled students.</div>
                      {ENROLLED_STUDENTS.map((s) => {
                        const on = picked.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            onClick={() => togglePick(s.id)}
                            style={{
                              width: "100%", display: "flex", alignItems: "center", gap: 12,
                              padding: 12, borderRadius: 12, marginBottom: 8,
                              background: on ? "#E4EDE9" : "#FFFFFF",
                              border: on ? "1.5px solid #2F5D50" : "1px solid #E7E1D3",
                              cursor: "pointer", fontFamily: "Inter, sans-serif",
                            }}
                          >
                            <img src={s.avatar} alt={s.name} style={{ width: 40, height: 40, borderRadius: 999, objectFit: "cover" }} />
                            <div style={{ flex: 1, textAlign: "left" }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: "#0F172A" }}>{s.name}</div>
                              <div style={{ fontSize: 11, color: "#6B7280" }}>{s.grade} · {s.subject}</div>
                            </div>
                            <div style={{ width: 22, height: 22, borderRadius: 999, background: on ? "#2F5D50" : "transparent", border: on ? "none" : "1.5px solid #E7E1D3", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {on && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                            </div>
                          </button>
                        );
                      })}
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <Field label="Batch name">
                        <input
                          value={batchName}
                          onChange={(e) => setBatchName(e.target.value)}
                          placeholder="e.g. Grade 10 Maths Batch B"
                          style={inputStyle}
                        />
                      </Field>
                      <Field label="Subject">
                        <input value={subject} onChange={(e) => setSubject(e.target.value)} style={inputStyle} />
                      </Field>
                      <Field label={`Monthly rate per student · Min Rs ${minRate.toLocaleString()} · Max Rs ${oneToOne.toLocaleString()}`}>
                        <input
                          type="number"
                          value={rate}
                          onChange={(e) => setRate(e.target.value)}
                          style={{ ...inputStyle, borderColor: rate && !rateValid ? "#C1503D" : "#E7E1D3" }}
                        />
                        {rate && !rateValid && (
                          <div style={{ fontSize: 11, color: "#C1503D", marginTop: 4 }}>
                            Must be between Rs {minRate.toLocaleString()} and your 1-to-1 rate (Rs {oneToOne.toLocaleString()}).
                          </div>
                        )}
                        {rateValid && (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, padding: "3px 8px", borderRadius: 999, background: "#DCF0E4" }}>
                            <Sparkles size={11} color="#3F8A5A" />
                            <span style={{ fontSize: 11, color: "#3F8A5A", fontWeight: 500 }}>
                              Students save Rs {(oneToOne - rateNum).toLocaleString()}/mo
                            </span>
                          </div>
                        )}
                      </Field>
                      <Field label="Schedule">
                        <div style={{ display: "flex", gap: 4 }}>
                          {DAYS.map((d) => (
                            <button
                              key={d}
                              onClick={() => toggleDay(d)}
                              style={{
                                flex: 1, height: 36, borderRadius: 8, border: "none",
                                background: days.includes(d) ? "#2F5D50" : "#F1ECE0",
                                color: days.includes(d) ? "#FFFFFF" : "#6B7280",
                                fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif",
                              }}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      </Field>
                    </>
                  )}

                  {step === 3 && (
                    <>
                      <div style={{ background: "#FBF8F2", border: "1px solid #E7E1D3", borderRadius: 12, padding: 14, marginBottom: 12 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: "#0F172A", marginBottom: 8 }}>{batchName}</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                          <Stat label="Subject" value={subject} />
                          <Stat label="Rate" value={`Rs ${rateNum.toLocaleString()}`} />
                          <Stat label="Students" value={`${picked.length}`} />
                          <Stat label="Days" value={days.join(", ")} />
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 8 }}>Sending invitations to:</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {ENROLLED_STUDENTS.filter((s) => picked.includes(s.id)).map((s) => (
                          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#FFFFFF", border: "1px solid #E7E1D3", borderRadius: 10 }}>
                            <img src={s.avatar} alt="" style={{ width: 32, height: 32, borderRadius: 999, objectFit: "cover" }} />
                            <div style={{ flex: 1, fontSize: 13, color: "#0F172A" }}>{s.name}</div>
                            <Users2 size={14} color="#9CA3AF" />
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: 14, padding: 12, background: "#E3EDF4", border: "1px solid #B9D0E0", borderRadius: 10, fontSize: 12, color: "#4A7FA5", lineHeight: 1.6 }}>
                        Batch activates when at least 2 students accept within 48 hours. Otherwise the invitation expires automatically.
                      </div>
                    </>
                  )}
                </div>

                <div style={{ padding: "12px 20px 20px", borderTop: "1px solid #E7E1D3", display: "flex", gap: 8 }}>
                  {step > 1 && (
                    <button
                      onClick={() => setStep((s) => (s - 1) as any)}
                      style={{ flex: 1, height: 48, background: "#F1ECE0", color: "#6B7280", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}
                    >
                      Back
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (step === 1 && canStep2) setStep(2);
                      else if (step === 2 && canStep3) setStep(3);
                      else if (step === 3) setSent(true);
                    }}
                    disabled={(step === 1 && !canStep2) || (step === 2 && !canStep3)}
                    style={{
                      flex: 2, height: 48,
                      background: ((step === 1 && canStep2) || (step === 2 && canStep3) || step === 3) ? "#2F5D50" : "#E7E1D3",
                      color: ((step === 1 && canStep2) || (step === 2 && canStep3) || step === 3) ? "#FFFFFF" : "#9CA3AF",
                      border: "none", borderRadius: 12, fontSize: 14, fontWeight: 500,
                      cursor: "pointer", fontFamily: "Inter, sans-serif",
                    }}
                  >
                    {step === 3 ? "Send invitations" : "Continue"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", border: "1px solid #E7E1D3", borderRadius: 10,
  padding: "10px 12px", fontSize: 14, color: "#0F172A",
  fontFamily: "Inter, sans-serif", outline: "none", background: "#FBF8F2",
  boxSizing: "border-box",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: "#0F172A", marginTop: 2 }}>{value}</div>
    </div>
  );
}
