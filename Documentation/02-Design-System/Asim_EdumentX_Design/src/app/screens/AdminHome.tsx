import { useNavigate } from "react-router";
import { Bell, ChevronRight, BarChart3, ShieldCheck, Users } from "lucide-react";
import { VERIFICATION_QUEUE, ADMIN_USERS } from "../data/mockData";
import { BottomNav } from "../components/shared/BottomNav";
import { colors, font } from "../theme/tokens";

const ADMIN_NAME = "Rajesh Admin";

export function AdminHome() {
  const navigate = useNavigate();

  const pendingVerifications = VERIFICATION_QUEUE.filter((q) => q.status === "pending").length;
  const totalUsers = ADMIN_USERS.length;
  const suspendedUsers = ADMIN_USERS.filter((u) => u.status === "suspended").length;
  const activeUsers = totalUsers - suspendedUsers;

  const CARDS = [
    {
      title: "Platform Statistics",
      subtitle: "App-wide metrics & trends",
      path: "/admin/stats",
      iconBg: colors.aiTint,
      iconColor: colors.ai,
      Icon: BarChart3,
      count: null,
    },
    {
      title: "Verification Queue",
      subtitle: "Review pending tutor verifications",
      path: "/admin/verification",
      iconBg: colors.verifyTint,
      iconColor: colors.verify,
      Icon: ShieldCheck,
      count: pendingVerifications,
      countLabel: `${pendingVerifications} pending`,
    },
    {
      title: "User Management",
      subtitle: "View & manage all registered users",
      path: "/admin/users",
      iconBg: colors.amberTint,
      iconColor: colors.amber,
      Icon: Users,
      count: totalUsers - suspendedUsers,
      countLabel: `${activeUsers} active · ${suspendedUsers} suspended`,
    },
  ];

  return (
    <div style={{ width: "100%", height: "100%", background: colors.paper, display: "flex", flexDirection: "column", fontFamily: font }}>
      {/* Dark slate hero */}
      <div style={{ background: colors.slate, padding: "24px 20px 24px", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>Dashboard</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: colors.inverse }}>{ADMIN_NAME}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>Manage platform, verifications & users</div>
          </div>
          <button
            onClick={() => navigate("/notifications")}
            style={{ width: 40, height: 40, borderRadius: 999, background: "rgba(255,255,255,0.15)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}
          >
            <Bell size={20} color={colors.inverse} />
            <div style={{ position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: 999, background: colors.amber, border: `1.5px solid ${colors.slate}` }} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px 88px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {CARDS.map(({ title, subtitle, path, iconBg, iconColor, Icon, count, countLabel }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={{
                width: "100%", background: colors.card, border: `1px solid ${colors.hairline}`,
                borderRadius: 14, padding: 16, cursor: "pointer", fontFamily: font, textAlign: "left",
                display: "flex", alignItems: "center", gap: 14,
              }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 999, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={24} color={iconColor} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: colors.text }}>{title}</div>
                  {count !== null && count > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 600, background: colors.amber, color: colors.inverse, padding: "2px 7px", borderRadius: 999 }}>
                      {count}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{subtitle}</div>
                {countLabel && (
                  <div style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>{countLabel}</div>
                )}
              </div>
              <ChevronRight size={18} color={colors.placeholder} />
            </button>
          ))}
        </div>
      </div>

      <BottomNav role="admin" />
    </div>
  );
}
