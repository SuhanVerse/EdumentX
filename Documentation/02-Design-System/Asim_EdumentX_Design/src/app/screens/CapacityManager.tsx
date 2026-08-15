import { useState } from "react";
import { Users2, Info } from "lucide-react";
import { TUTORS, TIME_SLOTS, DAYS, SAMPLE_AVAILABILITY } from "../data/mockData";
import { ScreenHeader } from "../components/shared/ScreenHeader";
import { BottomNav } from "../components/shared/BottomNav";

type SlotState = "available" | "booked" | "off";

const STATE_STYLE: Record<SlotState, { bg: string; color: string; border: string; label: string }> = {
  available: { bg: "#DCF0E4", color: "#3F8A5A", border: "#3F8A5A", label: "Available" },
  booked:    { bg: "#E4EDE9", color: "#0F172A", border: "#2F5D50", label: "Booked" },
  off:       { bg: "#F1ECE0", color: "#9CA3AF", border: "#E7E1D3", label: "Off" },
};

const NEXT: Record<SlotState, SlotState> = { off: "available", available: "booked", booked: "off" };

export function CapacityManager() {
  const me = TUTORS[0];
  const tier = me.tier ?? "pro";
  const maxAllowed = tier === "pro" ? 20 : 10;

  const [capacity, setCapacity] = useState(me.capacity ?? 8);
  const [grid, setGrid] = useState<Record<string, Record<string, SlotState>>>(
    () => JSON.parse(JSON.stringify(SAMPLE_AVAILABILITY))
  );

  const occupied = me.currentStudents ?? 5;
  const pct = Math.min(100, (occupied / capacity) * 100);
  const atCap = occupied >= capacity;

  const cycle = (day: string, slot: string) =>
    setGrid((g) => ({ ...g, [day]: { ...g[day], [slot]: NEXT[g[day][slot]] } }));

  const totals = (Object.values(grid) as Record<string, SlotState>[]).reduce(
    (acc, day) => {
      Object.values(day).forEach((s) => {
        acc[s]++;
      });
      return acc;
    },
    { available: 0, booked: 0, off: 0 } as Record<SlotState, number>
  );

  return (
    <div style={{ width: "100%", height: "100%", background: "#FBF8F2", display: "flex", flexDirection: "column", fontFamily: "Inter, sans-serif" }}>
      <ScreenHeader title="Capacity & schedule" backPath="/tutor/dashboard" />

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 88px" }}>
        {/* Capacity card */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E7E1D3", borderRadius: 14, padding: 16, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Users2 size={16} color="#2F5D50" />
            <div style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "#0F172A" }}>Student capacity</div>
            <div style={{ fontSize: 13, color: atCap ? "#C1503D" : "#3F8A5A", fontWeight: 500 }}>{occupied} / {capacity}</div>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: "#F1ECE0", overflow: "hidden", marginBottom: 12 }}>
            <div style={{ width: `${pct}%`, height: "100%", background: atCap ? "#C1503D" : pct > 80 ? "#E5A03B" : "#3F8A5A", borderRadius: 999 }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid #E7E1D3" }}>
            <div>
              <div style={{ fontSize: 13, color: "#0F172A" }}>Max students</div>
              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                {tier === "pro" ? "Pro tutor: 2–20" : "Student tutor: 2–10"}
              </div>
            </div>
            <input
              type="range"
              min={Math.max(2, occupied)}
              max={maxAllowed}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              style={{ width: 140, accentColor: "#2F5D50" }}
            />
          </div>
        </div>

        {/* Weekly grid */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E7E1D3", borderRadius: 14, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#0F172A", marginBottom: 4 }}>Weekly availability</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 12 }}>Tap a slot to cycle: Off → Available → Booked.</div>

          <div style={{ overflowX: "auto", margin: "0 -16px", padding: "0 16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "92px repeat(7, 44px)", gap: 4, minWidth: 400 }}>
              <div />
              {DAYS.map((d) => (
                <div key={d} style={{ fontSize: 11, fontWeight: 500, color: "#6B7280", textAlign: "center", padding: "4px 0" }}>{d}</div>
              ))}
              {TIME_SLOTS.map((slot) => (
                <div key={slot.id} style={{ display: "contents" }}>
                  <div style={{ fontSize: 10, color: "#6B7280", display: "flex", alignItems: "center", paddingRight: 4, lineHeight: 1.2 }}>
                    {slot.label}
                  </div>
                  {DAYS.map((d) => {
                    const state = grid[d][slot.id];
                    const s = STATE_STYLE[state];
                    return (
                      <button
                        key={d + slot.id}
                        onClick={() => cycle(d, slot.id)}
                        style={{
                          height: 36,
                          borderRadius: 8,
                          background: s.bg,
                          border: `1px solid ${s.border}`,
                          cursor: "pointer",
                          padding: 0,
                        }}
                        aria-label={`${d} ${slot.label} ${s.label}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: 14, marginTop: 14, flexWrap: "wrap" }}>
            {(Object.entries(STATE_STYLE) as [SlotState, typeof STATE_STYLE[SlotState]][]).map(([k, s]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 14, height: 14, borderRadius: 4, background: s.bg, border: `1px solid ${s.border}` }} />
                <span style={{ fontSize: 11, color: "#6B7280" }}>{s.label} · {totals[k]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Help */}
        <div style={{ background: "#E3EDF4", border: "1px solid #B9D0E0", borderRadius: 12, padding: 12, display: "flex", gap: 10 }}>
          <Info size={16} color="#4A7FA5" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12, color: "#4A7FA5", lineHeight: 1.6 }}>
            One student per 1-to-1 slot. Group batches occupy a full slot for all members. Students can request only your <b>Available</b> slots — conflicts are blocked automatically.
          </div>
        </div>
      </div>

      <BottomNav role="tutor" />
    </div>
  );
}
