import { useLocation, useNavigate } from "react-router";
import { LayoutDashboard, ShieldCheck, Users, BarChart3 } from "lucide-react";

const TABS = [
  { label: "Home",         path: "/admin/home",         Icon: LayoutDashboard },
  { label: "Stats",        path: "/admin/stats",        Icon: BarChart3 },
  { label: "Verification", path: "/admin/verification", Icon: ShieldCheck },
  { label: "Users",        path: "/admin/users",        Icon: Users },
] as const;

export function AdminNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div style={{ display: "flex", gap: 4, marginTop: 0 }}>
      {TABS.map(({ label, path, Icon }) => {
        const active = pathname === path || pathname.startsWith(path + "/");
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              flex: 1,
              height: 36,
              background: active ? "#FFFFFF" : "rgba(255,255,255,0.12)",
              color: active ? "#2F5D50" : "rgba(255,255,255,0.8)",
              border: "none",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              position: "relative",
            }}
          >
            <Icon size={13} />
            {label}
            {active && (
              <div style={{ position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%)", width: 32, height: 2, background: "#E5A03B", borderRadius: 1 }} />
            )}
          </button>
        );
      })}
    </div>
  );
}
