import { useLocation, useNavigate } from "react-router";
import { ShieldCheck, Users, BarChart3 } from "lucide-react";

const TABS = [
  { label: "Stats", path: "/admin/stats", Icon: BarChart3 },
  { label: "Verification", path: "/admin/verification", Icon: ShieldCheck },
  { label: "Users", path: "/admin/users", Icon: Users },
] as const;

export function AdminNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
      {TABS.map(({ label, path, Icon }) => {
        const active = pathname.startsWith(path);
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              flex: 1,
              height: 36,
              background: active ? "#FFFFFF" : "rgba(255,255,255,0.15)",
              color: active ? "#2F5D50" : "#FFFFFF",
              border: "none",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
            }}
          >
            <Icon size={13} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
