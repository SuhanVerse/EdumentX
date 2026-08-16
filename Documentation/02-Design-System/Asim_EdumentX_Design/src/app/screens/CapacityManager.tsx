import { useState, useMemo } from "react";
import { Users2, Info, Check } from "lucide-react";
import { TUTORS, TIME_SLOTS, DAYS, SAMPLE_AVAILABILITY } from "../data/mockData";
import { BottomNav } from "../components/shared/BottomNav";
import { colors, font } from "../theme/tokens";

type SlotState = "available" | "booked" | "off";

const CELL_STYLE: Record<SlotState, { bg: string; borderColor: string }> = {
  available: { bg: colors.verifyTint,  borderColor: colors.verify },
  booked:    { bg: colors.aiTint,      borderColor: colors.ai },
  off:       { bg: colors.sand,        borderColor: "transparent" },
};

export function CapacityManager() {
  const me = TUTORS[0];
  const capacity = me.capacity ?? 8;
  const occupied = me.currentStudents ?? 5;

  const [original] = useState<Record<string, Record<string, SlotState>>>(
    () => JSON.parse(JSON.stringify(SAMPLE_AVAILABILITY))
  );
  const [grid, setGrid] = useState<Record<string, Record<string, SlotState>>>(
    () => JSON.parse(JSON.stringify(SAMPLE_AVAILABILITY))
  );
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const isDirty = useMemo(() => {
    for (const day of DAYS) {
      for (const slot of TIME_SLOTS) {
        if (grid[day][slot.id] !== original[day][slot.id]) return true;
      }
    }
    return false;
  }, [grid, original]);

  const changedCount = useMemo(() => {
    let n = 0;
    for (const day of DAYS) {
      for (const slot of TIME_SLOTS) {
        if (grid[day][slot.id] !== original[day][slot.id]) n++;
      }
    }
    return n;
  }, [grid]);

  const toggle = (day: string, slotId: string) => {
    if (grid[day][slotId] === "booked") return;
    setGrid((g) => ({
      ...g,
      [day]: { ...g[day], [slotId]: g[day][slotId] === "off" ? "available" : "off" },
    }));
  };

  const discard = () => setGrid(JSON.parse(JSON.stringify(original)));

  const save = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2200);
    }, 1000);
  };

  const pct = Math.min(100, (occupied / capacity) * 100);
  const capColor = pct >= 100 ? colors.danger : pct >= 80 ? colors.amber : colors.verify;

  const totalAvail = DAYS.reduce((a, d) => a + TIME_SLOTS.filter((s) => grid[d][s.id] === "available").length, 0);
  const totalBooked = DAYS.reduce((a, d) => a + TIME_SLOTS.filter((s) => grid[d][s.id] === "booked").length, 0);

  return (
    <div style={{ width: "100%", height: "100%", background: colors.paper, display: "flex", flexDirection: "column", fontFamily: font }}>
      {/* Header */}
      <div style={{ background: colors.paper, padding: "20px 16px 16px", flexShrink: 0, borderBottom: `1px solid ${colors.hairline}` }}>
        <div style={{ fontSize: 14, color: colors.muted, marginBottom: 4 }}>Manage your</div>
        <div>
          <div style={{ fontSize: 28, fontWeight: 500, color: colors.text, lineHeight: 1.2 }}>Capacity & schedule</div>
          <div style={{ height: 2, background: colors.amber, borderRadius: 1, marginTop: 6, alignSelf: "flex-start", width: 220 }} />
        </div>
        <div style={{ fontSize: 13, color: colors.muted, marginTop: 8 }}>
          <strong style={{ color: colors.text }}>{occupied} / {capacity} filled</strong> · {capacity - occupied} slots available
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px", paddingBottom: (isDirty || savedFlash) ? 140 : 88 }}>
        {/* Capacity progress card */}
        <div style={{ background: colors.card, border: `1px solid ${colors.hairline}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Users2 size={16} color={colors.green} />
            <div style={{ flex: 1, fontSize: 14, fontWeight: 500, color: colors.text }}>Student capacity</div>
            <div style={{ fontSize: 13, color: capColor, fontWeight: 500 }}>{occupied} / {capacity} filled</div>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: colors.paper, border: `1px solid ${colors.hairline}`, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: capColor, borderRadius: 999 }} />
          </div>
        </div>

        {/* Weekly availability grid */}
        <div style={{ background: colors.card, border: `1px solid ${colors.hairline}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: colors.text, marginBottom: 4 }}>Weekly availability</div>
          <div style={{ fontSize: 12, color: colors.muted, marginBottom: 12 }}>Tap slots to edit, then save your changes.</div>

          {/* Time header row */}
          <div style={{ display: "flex", gap: 4, marginBottom: 6, marginLeft: 56 }}>
            {TIME_SLOTS.map((slot) => (
              <div key={slot.id} style={{ flex: 1, fontSize: 9, fontWeight: 500, color: colors.muted, textTransform: "uppercase", textAlign: "center", lineHeight: 1.2 }}>
                {slot.label.split(" · ")[1] ?? slot.label}
              </div>
            ))}
          </div>

          {/* 7 day rows × 6 slots */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 460, overflowY: "auto" }}>
            {DAYS.map((day) => (
              <div key={day} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 52, fontSize: 11, fontWeight: 500, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0 }}>{day}</div>
                {TIME_SLOTS.map((slot) => {
                  const state = grid[day][slot.id];
                  const s = CELL_STYLE[state];
                  const isBooked = state === "booked";
                  return (
                    <button
                      key={slot.id}
                      onClick={() => toggle(day, slot.id)}
                      disabled={isBooked}
                      style={{
                        flex: 1, height: 40, borderRadius: 8,
                        background: s.bg, border: `1px solid ${s.borderColor}`,
                        cursor: isBooked ? "default" : "pointer", padding: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                      aria-label={`${day} ${slot.label} — ${state}`}
                    >
                      {state === "available" && <Check size={12} color={colors.verify} strokeWidth={2.5} />}
                      {state === "booked" && <Users2 size={12} color={colors.ai} />}
                      {state === "off" && <span style={{ fontSize: 10, color: colors.placeholder, opacity: 0.7 }}>·</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: 14, marginTop: 14, flexWrap: "wrap" }}>
            {[
              { state: "available" as SlotState, label: `Available · ${totalAvail}` },
              { state: "booked" as SlotState, label: `Booked · ${totalBooked}` },
              { state: "off" as SlotState, label: "Off" },
            ].map(({ state, label }) => (
              <div key={state} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: CELL_STYLE[state].bg, border: `1px solid ${CELL_STYLE[state].borderColor || colors.hairline}` }} />
                <span style={{ fontSize: 11, color: colors.muted }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Info banner — AI blue */}
        <div style={{ background: colors.aiTint, border: `1px solid #B9D0E0`, borderRadius: 14, padding: 14, display: "flex", gap: 10 }}>
          <Info size={18} color={colors.ai} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12, color: colors.ai, lineHeight: 1.6 }}>
            One student per 1-to-1 slot. Group batches occupy a full slot for all members. Students can request only your <strong>Available</strong> slots — conflicts are blocked automatically.
          </div>
        </div>
      </div>

      {/* Sticky save bar — only while dirty or flashing saved */}
      {(isDirty || savedFlash) && (
        <div style={{
          position: "absolute", left: 0, right: 0, bottom: 72,
          padding: "12px 16px 8px",
          borderTop: `1px solid ${colors.hairline}`,
          background: colors.paper,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <div style={{ flex: 1 }}>
            {savedFlash ? (
              <div style={{ fontSize: 13, fontWeight: 500, color: colors.verify }}>Availability saved</div>
            ) : (
              <>
                <div style={{ fontSize: 13, fontWeight: 500, color: colors.text }}>Unsaved changes</div>
                <div style={{ fontSize: 11, color: colors.muted, marginTop: 1 }}>{changedCount} slot{changedCount !== 1 ? "s" : ""} changed</div>
              </>
            )}
          </div>
          {!savedFlash && (
            <>
              <button
                onClick={discard}
                style={{ height: 44, padding: "0 14px", background: "none", border: "none", color: colors.muted, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: font }}
              >
                Discard
              </button>
              <button
                onClick={save}
                disabled={saving}
                style={{
                  height: 44, padding: "0 18px", borderRadius: 14, border: "none",
                  background: saving ? colors.sand : colors.amber,
                  color: saving ? colors.muted : colors.inverse,
                  fontSize: 13, fontWeight: 600, cursor: saving ? "default" : "pointer", fontFamily: font,
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                {saving ? "Saving…" : `Save changes (${changedCount})`}
              </button>
            </>
          )}
        </div>
      )}

      <BottomNav role="tutor" />
    </div>
  );
}

