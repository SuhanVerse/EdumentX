import { useState } from "react";
import { useNavigate } from "react-router";
import { Calendar, GraduationCap } from "lucide-react";
import { ENROLLMENTS } from "../data/mockData";
import { StatusBadge } from "../components/shared/StatusBadge";
import { SubjectChip } from "../components/shared/SubjectChip";
import { BottomNav } from "../components/shared/BottomNav";
import { StatusBar } from "../components/shared/StatusBar";
import { colors, radius, font } from "../theme/tokens";

type Tab = "active" | "pending" | "past";

const TABS: Tab[] = ["active", "pending", "past"];

export function MyEnrollments() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("active");

  const activeIndex = TABS.indexOf(tab);
  const filtered = ENROLLMENTS.filter((e) => e.status === tab);

  const stripeColor = (status: Tab) =>
    status === "active" ? colors.verify : status === "pending" ? colors.amber : colors.hairline;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: colors.paper,
        display: "flex",
        flexDirection: "column",
        fontFamily: font,
        position: "relative",
      }}
    >
      <StatusBar />

      {/* Header */}
      <div style={{ padding: "8px 24px 16px", flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 500, color: colors.text }}>My enrollments</div>
        <div
          style={{
            height: 2,
            width: "58%",
            background: colors.amber,
            borderRadius: 1,
            marginTop: 6,
          }}
        />

        {/* Segmented tabs */}
        <div
          style={{
            position: "relative",
            display: "flex",
            background: colors.sand,
            borderRadius: 12,
            padding: 4,
            marginTop: 16,
          }}
        >
          {/* Sliding green pill */}
          <div
            style={{
              position: "absolute",
              top: 4,
              left: `calc(${(activeIndex * 100) / 3}% + 4px)`,
              width: `calc(${100 / 3}% - 8px)`,
              height: 36,
              background: colors.green,
              borderRadius: 9,
              transition: "left 0.22s",
            }}
          />
          {TABS.map((t) => {
            const isActive = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  position: "relative",
                  zIndex: 1,
                  flex: 1,
                  height: 36,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: font,
                  fontSize: 14,
                  fontWeight: 500,
                  textTransform: "capitalize",
                  color: isActive ? colors.inverse : colors.muted,
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: "auto", padding: "0 24px", paddingBottom: 88 }}>
        {filtered.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              paddingTop: 72,
              gap: 12,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                background: colors.amberTint,
                borderRadius: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <GraduationCap size={28} color={colors.amber} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, color: colors.text }}>No enrollments yet</div>
            <div style={{ fontSize: 13, color: colors.muted, maxWidth: 260 }}>
              When you enroll with a tutor, your sessions will appear here.
            </div>
            <button
              onClick={() => navigate("/student/home")}
              style={{
                marginTop: 8,
                height: 44,
                padding: "0 20px",
                background: colors.green,
                color: colors.inverse,
                border: "none",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: font,
              }}
            >
              Find a tutor
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 16 }}>
            {filtered.map((e) => (
              <div
                key={e.id}
                onClick={() => navigate(`/student/enrollment/${e.id}`)}
                style={{
                  background: colors.card,
                  border: `1px solid ${colors.hairline}`,
                  borderLeft: `4px solid ${stripeColor(e.status)}`,
                  borderRadius: radius.card,
                  padding: 16,
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <img
                    src={e.tutor.avatar}
                    alt={e.tutor.name}
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 999,
                      objectFit: "cover",
                      border: `1px solid ${colors.hairline}`,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      <div style={{ fontSize: 15, fontWeight: 500, color: colors.text }}>
                        {e.tutor.name}
                      </div>
                      <StatusBadge status={e.status} />
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                      {e.subjects.map((s) => (
                        <SubjectChip key={s} label={s} small />
                      ))}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 12,
                        color: colors.muted,
                      }}
                    >
                      <Calendar size={12} />
                      <span>
                        {e.startDate} → {e.endDate}
                      </span>
                    </div>
                  </div>
                </div>

                {e.status === "active" && (
                  <div
                    style={{
                      marginTop: 16,
                      paddingTop: 16,
                      borderTop: `1px solid ${colors.hairline}`,
                      display: "flex",
                      gap: 8,
                    }}
                  >
                    <button
                      onClick={(ev) => {
                        ev.stopPropagation();
                        navigate("/student/review");
                      }}
                      style={{
                        flex: 1,
                        height: 40,
                        background: colors.amberTint,
                        color: "#9A6B1E",
                        border: "none",
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: "pointer",
                        fontFamily: font,
                      }}
                    >
                      Rate & Review
                    </button>
                    <button
                      onClick={(ev) => ev.stopPropagation()}
                      style={{
                        flex: 1,
                        height: 40,
                        background: colors.sand,
                        color: colors.text,
                        border: "none",
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: "pointer",
                        fontFamily: font,
                      }}
                    >
                      Message tutor
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav role="student" />
    </div>
  );
}
