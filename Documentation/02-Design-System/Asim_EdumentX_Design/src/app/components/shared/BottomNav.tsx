import { useNavigate, useLocation } from "react-router";
import {
  Home, Map, Sparkles, Calendar, User,
  LayoutGrid, MessageSquareText, Users2,
  ShieldCheck, ChartBar, Settings, UserCog,
} from "lucide-react";

type NavRole = "student" | "tutor" | "admin";

interface BottomNavProps {
  role: NavRole;
}

interface Tab {
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  label: string;
  path: string;
  /** Permanent color override regardless of active state — used for AI Chat (always purple). */
  permanentColor?: string;
  badge?: number;
}

const STUDENT_TABS: Tab[] = [
  { icon: Home, label: "Home", path: "/student/home" },
  { icon: Map, label: "Map", path: "/student/map" },
  { icon: Sparkles, label: "AI Chat", path: "/student/chat", permanentColor: "#4A7FA5" },
  { icon: Calendar, label: "Enrollments", path: "/student/enrollments", badge: 1 },
  { icon: User, label: "Profile", path: "/student/profile" },
];

const TUTOR_TABS: Tab[] = [
  { icon: LayoutGrid, label: "Dashboard", path: "/tutor/dashboard" },
  { icon: MessageSquareText, label: "Inbox", path: "/tutor/inbox", badge: 3 },
  { icon: Users2, label: "Batches", path: "/tutor/batch" },
  { icon: User, label: "Profile", path: "/tutor/profile" },
];

const ADMIN_TABS: Tab[] = [
  { icon: ShieldCheck, label: "Queue", path: "/admin/verification", badge: 8 },
  { icon: UserCog, label: "Users", path: "/admin/users" },
  { icon: ChartBar, label: "Stats", path: "/admin/stats" },
  { icon: Settings, label: "Settings", path: "/admin/settings" },
];

export function BottomNav({ role }: BottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const items =
    role === "student" ? STUDENT_TABS : role === "tutor" ? TUTOR_TABS : ADMIN_TABS;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 72,
        background: "#FFFFFF",
        borderTop: "1px solid #E7E1D3",
        display: "flex",
        alignItems: "stretch",
        paddingBottom: 8,
      }}
    >
      {items.map(({ icon: Icon, label, path, permanentColor, badge }) => {
        const isActive =
          location.pathname === path || location.pathname.startsWith(path + "/");
        const color = permanentColor ?? (isActive ? "#2F5D50" : "#6B7280");
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-start",
              gap: 4,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px 4px 0",
              position: "relative",
            }}
          >
            {isActive && !permanentColor && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "20%",
                  right: "20%",
                  height: 2,
                  background: "#2F5D50",
                  borderRadius: 999,
                }}
              />
            )}
            <div style={{ position: "relative", marginTop: 6 }}>
              <Icon
                size={26}
                color={color}
                strokeWidth={isActive || permanentColor ? 2.2 : 1.8}
              />
              {badge !== undefined && badge > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -8,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 999,
                    background: "#C1503D",
                    color: "#FFFFFF",
                    fontSize: 10,
                    fontWeight: 500,
                    padding: "0 5px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1.5px solid #FFFFFF",
                  }}
                >
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </div>
            {(isActive || permanentColor) && (
              <span style={{ fontSize: 11, fontWeight: 500, color }}>{label}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
