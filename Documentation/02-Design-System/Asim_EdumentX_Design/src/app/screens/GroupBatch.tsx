import { useState } from "react";
import { Plus, X, Users2, Check } from "lucide-react";
import { STUDENT_AVATAR_1, TUTOR_AVATAR_4, TUTOR_AVATAR_3, TUTORS, DAYS } from "../data/mockData";
import { BottomNav } from "../components/shared/BottomNav";
import { ScreenHeader } from "../components/shared/ScreenHeader";
import { colors, font } from "../theme/tokens";

const ENROLLED_STUDENTS = [
  { id: "s1", name: "Aarav Tamang", grade: "Grade 10", subject: "Mathematics · Mon · 5–7 PM", avatar: STUDENT_AVATAR_1 },
  { id: "s2", name: "Priya Maharjan", grade: "Grade 11", subject: "Physics · Tue · 5–7 PM", avatar: TUTOR_AVATAR_4 },
  { id: "s3", name: "Sanjay Pandey", grade: "Grade 10", subject: "Mathematics · Mon · 5–7 PM", avatar: TUTOR_AVATAR_3 },
  { id: "s4", name: "Anita Gurung", grade: "Grade 11", subject: "Physics · Wed · 5–7 PM", avatar: STUDENT_AVATAR_1 },
  { id: "s5", name: "Bikash Rai", grade: "Grade 10", subject: "Mathematics · Fri · 5–7 PM", avatar: TUTOR_AVATAR_3 },
];

const SUBJECTS = ["Mathematics", "Physics", "Chemistry", "Biology", "English", "Computer Sc."];

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

  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [batchName, setBatchName] = useState("");
  const [subject, setSubject] = useState("Mathematics");
  const [customSubject, setCustomSubject] = useState("");
  const [rate, setRate] = useState(String(recRate));
  const [days, setDays] = useState<string[]>(["Mon", "Wed", "Fri"]);
  const [saved, setSaved] = useState(false);

  const togglePick = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 6 ? [...p, id] : p));
  const toggleDay = (d: string) =>
    setDays((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d]));

  const rateNum = Number(rate) || 0;
  const rateValid = rateNum > 0;
  const effectiveSubject = subject === "Other…" ? customSubject : subject;
  const canStep2 = picked.length >= 2;
  const canStep3 = batchName.trim().length >= 2 && effectiveSubject.trim().length >= 2 && rateValid && days.length > 0;

  const close = () => { setStep(0); setSaved(false); setPicked([]); setBatchName(""); };

  const STEP_LABELS = ["Pick students", "Batch details", "Review & create"];

  return (
    <div style={{ width: "100%", height: "100%", background: colors.paper, display: "flex", flexDirection: "column", fontFamily: font, position: "relative" }}>
      <ScreenHeader title="Group Batches" subtitle="Combine students into shared batches" />

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 88px" }}>
        {/* Create New Batch CTA — AI blue */}
        <button
          onClick={() => setStep(1)}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "16px 24px", background: colors.ai, borderRadius: 14, border: "none",
            cursor: "pointer", fontFamily: font, marginBottom: 20,
          }}
        >
          <Plus size={20} color={colors.inverse} strokeWidth={3} />
          <span style={{ fontSize: 15, fontWeight: 600, color: colors.inverse }}>Create New Batch</span>
        </button>

        <div style={{ fontSize: 17, fontWeight: 700, color: colors.text, marginBottom: 12 }}>Active Batches</div>

        {EXISTING_BATCHES.map((b) => {
          const pct = (b.enrolled / b.maxSeats) * 100;
          return (
            <div key={b.id} style={{ background: colors.card, border: `1px solid ${colors.hairline}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: colors.text }}>{b.name}</div>
                  <div style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>{b.subject} · Rs {b.rate.toLocaleString()}/student/mo</div>
                </div>
                <span style={{ fontSize: 11, background: "#DCF5E8", color: colors.verify, padding: "3px 8px", borderRadius: 6, fontWeight: 500 }}>Active</span>
              </div>

              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>Students</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: colors.text }}>{b.enrolled} in batch</span>
                </div>
                <div style={{ height: 6, background: colors.hairline, borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: colors.ai, borderRadius: 999 }} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
                {b.schedule.map((d) => (
                  <span key={d} style={{ fontSize: 11, background: colors.paper, color: colors.muted, padding: "4px 8px", borderRadius: 6, border: `1px solid ${colors.hairline}`, fontWeight: 500 }}>{d} · 5–7 PM</span>
                ))}
              </div>

              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {b.students.slice(0, 3).map((s, i) => (
                  <img key={i} src={s.avatar} alt={s.name} style={{ width: 32, height: 32, borderRadius: 999, objectFit: "cover", border: `2px solid ${colors.card}`, marginLeft: i === 0 ? 0 : -8 }} />
                ))}
                {b.enrolled > b.students.length && (
                  <div style={{ width: 32, height: 32, borderRadius: 999, background: `${colors.ai}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: colors.ai, marginLeft: -8, border: `2px solid ${colors.card}` }}>
                    +{b.enrolled - b.students.length}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <BottomNav role="tutor" />

      {/* Creation Wizard Bottom Sheet */}
      {step !== 0 && (
        <div onClick={close} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "flex-end", zIndex: 20 }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", height: "85%", background: colors.card, borderRadius: "24px 24px 0 0", display: "flex", flexDirection: "column", overflow: "hidden" }}
          >
            {/* Drag handle */}
            <div style={{ padding: "12px 0 0", display: "flex", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ width: 40, height: 4, borderRadius: 999, background: colors.hairline }} />
            </div>

            {/* Sheet header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 600, color: colors.text }}>
                  {saved ? "Batch created!" : STEP_LABELS[step - 1]}
                </div>
                {!saved && <div style={{ fontSize: 12, color: colors.ai, marginTop: 2 }}>Cancel</div>}
              </div>
              <button onClick={close} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: colors.ai, display: "flex", fontSize: 14, fontWeight: 500, fontFamily: font }}>
                Cancel
              </button>
            </div>

            {/* Step indicator — amber fill */}
            {!saved && (
              <div style={{ display: "flex", gap: 4, padding: "0 24px 16px", flexShrink: 0 }}>
                {[1, 2, 3].map((s) => (
                  <div key={s} style={{ flex: 1, height: 4, borderRadius: 999, background: s <= step ? colors.amber : colors.hairline }} />
                ))}
              </div>
            )}

            {saved ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
                <div style={{ width: 72, height: 72, borderRadius: 999, background: colors.verifyTint, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <Check size={36} color={colors.verify} />
                </div>
                <div style={{ fontSize: 18, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Batch saved!</div>
                <div style={{ fontSize: 13, color: colors.muted, lineHeight: 1.6, marginBottom: 24, maxWidth: 280 }}>
                  "{batchName}" has been created with {picked.length} students.
                </div>
                <button onClick={close} style={{ width: "100%", maxWidth: 320, height: 52, background: colors.verify, color: colors.inverse, border: "none", borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: font }}>
                  Done
                </button>
              </div>
            ) : (
              <>
                <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 16px" }}>

                  {/* Step 1 — Pick students */}
                  {step === 1 && (
                    <>
                      <div style={{ fontSize: 12, color: colors.muted, marginBottom: 4 }}>Step 1 of 3 — select 2–6 enrolled students.</div>
                      <div style={{ fontSize: 12, color: colors.muted, marginBottom: 14 }}>{picked.length}/6 selected</div>
                      {ENROLLED_STUDENTS.map((s) => {
                        const on = picked.includes(s.id);
                        const capped = picked.length >= 6 && !on;
                        return (
                          <button
                            key={s.id}
                            onClick={() => !capped && togglePick(s.id)}
                            style={{
                              width: "100%", display: "flex", alignItems: "center", gap: 12,
                              padding: 12, borderRadius: 14, marginBottom: 8,
                              background: on ? colors.amberTint : colors.paper,
                              border: on ? `1.5px solid ${colors.amber}` : `1px solid ${colors.hairline}`,
                              cursor: capped ? "default" : "pointer", fontFamily: font,
                              opacity: capped ? 0.5 : 1,
                            }}
                          >
                            <div style={{ width: 36, height: 36, borderRadius: 999, background: on ? colors.amber : `${colors.ai}33`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                              <img src={s.avatar} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>
                            <div style={{ flex: 1, textAlign: "left" }}>
                              <div style={{ fontSize: 14, fontWeight: 500, color: colors.text }}>{s.name}</div>
                              <div style={{ fontSize: 11, color: colors.muted, marginTop: 1 }}>{s.grade} · {s.subject}</div>
                            </div>
                            <div style={{
                              width: 24, height: 24, borderRadius: 999,
                              background: on ? colors.amber : "transparent",
                              border: on ? "none" : `2px solid ${colors.hairline}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              flexShrink: 0,
                            }}>
                              {on && <Check size={14} color={colors.inverse} strokeWidth={3} />}
                            </div>
                          </button>
                        );
                      })}
                    </>
                  )}

                  {/* Step 2 — Batch details */}
                  {step === 2 && (
                    <>
                      <div style={{ fontSize: 12, color: colors.muted, marginBottom: 16 }}>Step 2 of 3 — name, subject, fee & schedule.</div>

                      <Field label="Batch name">
                        <input
                          value={batchName}
                          onChange={(e) => setBatchName(e.target.value)}
                          placeholder="e.g. Grade 10 Maths Batch A"
                          style={inputStyle}
                        />
                      </Field>

                      <Field label="Subject">
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: subject === "Other…" ? 8 : 0 }}>
                          {[...SUBJECTS, "Other…"].map((s) => (
                            <button
                              key={s}
                              onClick={() => setSubject(s)}
                              style={{
                                padding: "6px 12px", borderRadius: 999,
                                border: subject === s ? "none" : `1px solid ${colors.hairline}`,
                                background: subject === s ? colors.amber : colors.paper,
                                color: subject === s ? colors.inverse : colors.muted,
                                fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: font,
                              } as React.CSSProperties}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                        {subject === "Other…" && (
                          <input
                            value={customSubject}
                            onChange={(e) => setCustomSubject(e.target.value)}
                            placeholder="Enter subject name"
                            style={{ ...inputStyle, marginTop: 6 }}
                          />
                        )}
                      </Field>

                      <Field label="Monthly fee (NPR / student)">
                        <input
                          type="number"
                          value={rate}
                          onChange={(e) => setRate(e.target.value)}
                          placeholder="e.g. 2200"
                          style={{ ...inputStyle, borderColor: rate && !rateValid ? colors.danger : colors.hairline }}
                        />
                      </Field>

                      <Field label="Schedule (days)">
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {DAYS.map((d) => (
                            <button
                              key={d}
                              onClick={() => toggleDay(d)}
                              style={{
                                padding: "6px 10px", borderRadius: 8, border: "none",
                                background: days.includes(d) ? colors.amber : colors.sand,
                                color: days.includes(d) ? colors.inverse : colors.muted,
                                fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: font,
                              }}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                        {days.length > 0 && (
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
                            {days.map((d) => (
                              <span key={d} style={{ fontSize: 11, background: `${colors.ai}1A`, color: colors.ai, padding: "3px 8px", borderRadius: 6, fontWeight: 500 }}>{d} · 5–7 PM</span>
                            ))}
                          </div>
                        )}
                      </Field>
                    </>
                  )}

                  {/* Step 3 — Review & create */}
                  {step === 3 && (
                    <>
                      <div style={{ fontSize: 12, color: colors.muted, marginBottom: 16 }}>Step 3 of 3 — review your batch before saving.</div>
                      <div style={{ background: colors.paper, border: `1px solid ${colors.hairline}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
                        <div style={{ fontSize: 16, fontWeight: 600, color: colors.text, marginBottom: 6 }}>{batchName}</div>
                        <div style={{ fontSize: 13, color: colors.muted, marginBottom: 12 }}>{effectiveSubject} · Rs {rateNum.toLocaleString()}/student/mo</div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
                          {days.map((d) => (
                            <span key={d} style={{ fontSize: 11, background: colors.card, border: `1px solid ${colors.hairline}`, color: colors.muted, padding: "3px 8px", borderRadius: 6, fontWeight: 500 }}>{d} · 5–7 PM</span>
                          ))}
                        </div>
                        <div style={{ fontSize: 11, color: colors.muted }}>
                          {picked.length} students: {ENROLLED_STUDENTS.filter((s) => picked.includes(s.id)).map((s) => s.name.split(" ")[0]).join(", ")}
                        </div>
                      </div>
                      <button
                        onClick={() => setStep(2)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: colors.ai, fontSize: 13, fontWeight: 500, fontFamily: font, display: "block", margin: "0 auto 16px", textDecoration: "none" }}
                      >
                        ← Edit details
                      </button>
                    </>
                  )}
                </div>

                {/* Footer */}
                <div style={{ padding: "12px 24px 24px", borderTop: `1px solid ${colors.hairline}`, flexShrink: 0, display: "flex", gap: 8 }}>
                  {step > 1 && (
                    <button
                      onClick={() => setStep((s) => (s - 1) as any)}
                      style={{ flex: 1, height: 52, background: colors.paper, color: colors.muted, border: `1px solid ${colors.hairline}`, borderRadius: 14, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: font }}
                    >
                      Back
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (step === 1 && canStep2) setStep(2);
                      else if (step === 2 && canStep3) setStep(3);
                      else if (step === 3) setSaved(true);
                    }}
                    disabled={(step === 1 && !canStep2) || (step === 2 && !canStep3)}
                    style={{
                      flex: 2, height: 52, borderRadius: 14, border: "none", fontFamily: font, fontSize: 15, fontWeight: 600, cursor: "pointer",
                      background: step === 3 ? colors.amber : ((step === 1 && canStep2) || (step === 2 && canStep3)) ? colors.ai : `${colors.muted}33`,
                      color: ((step === 1 && canStep2) || (step === 2 && canStep3) || step === 3) ? colors.inverse : colors.muted,
                    }}
                  >
                    {step === 3 ? "Save Batch" : `Continue (${step === 1 ? picked.length : ""})`}
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
  width: "100%", border: `1px solid ${colors.hairline}`, borderRadius: 14,
  padding: "12px 16px", fontSize: 14, color: colors.text,
  fontFamily: font, outline: "none", background: colors.paper,
  boxSizing: "border-box",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}
