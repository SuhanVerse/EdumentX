import { useState } from "react";
import { Search } from "lucide-react";
import { ADMIN_USERS } from "../data/mockData";
import { BlueTick } from "../components/shared/BlueTick";
import { StatusBadge } from "../components/shared/StatusBadge";
import { StatusBar } from "../components/shared/StatusBar";
import { AdminNav } from "../components/shared/AdminNav";

type RoleFilter = "All" | "Student" | "Tutor";

export function UserManagement() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("All");
  const [userStatuses, setUserStatuses] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    ADMIN_USERS.forEach((u) => { init[u.id] = u.status; });
    return init;
  });

  const filtered = ADMIN_USERS.filter((u) => {
    const matchesRole = roleFilter === "All" || u.role === roleFilter;
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const toggleStatus = (id: string) => {
    setUserStatuses((p) => ({ ...p, [id]: p[id] === "active" ? "suspended" : "active" }));
  };

  return (
    <div style={{ width: "100%", height: "100%", background: "#FBF8F2", display: "flex", flexDirection: "column" }}>
      <StatusBar />

      {/* Header */}
      <div style={{ background: "#2F5D50", padding: "0 20px 16px", flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 500, color: "#FFFFFF" }}>User management</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>{ADMIN_USERS.length} registered users</div>
        <AdminNav />

        {/* Search */}
        <div style={{ background: "#FFFFFF", borderRadius: 10, height: 40, display: "flex", alignItems: "center", paddingLeft: 12, paddingRight: 12, gap: 8, marginTop: 12 }}>
          <Search size={16} style={{ color: "#9CA3AF" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." style={{ flex: 1, border: "none", outline: "none", fontSize: 13, color: "#0F172A", fontFamily: "Inter, sans-serif", background: "transparent" }} />
        </div>
      </div>

      {/* Role filter tabs */}
      <div style={{ background: "#FFFFFF", display: "flex", borderBottom: "1px solid #E7E1D3", flexShrink: 0 }}>
        {(["All", "Student", "Tutor"] as RoleFilter[]).map((role) => {
          const count = role === "All" ? ADMIN_USERS.length : ADMIN_USERS.filter((u) => u.role === role).length;
          return (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              style={{
                flex: 1,
                height: 42,
                background: "none",
                border: "none",
                borderBottom: roleFilter === role ? "2px solid #2F5D50" : "2px solid transparent",
                color: roleFilter === role ? "#2F5D50" : "#6B7280",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
              }}
            >
              {role}
              <span style={{ fontSize: 11, background: roleFilter === role ? "#E4EDE9" : "#F1ECE0", color: roleFilter === role ? "#2F5D50" : "#6B7280", padding: "1px 5px", borderRadius: 999 }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* User list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 32px" }}>
        {filtered.map((user) => {
          const currentStatus = userStatuses[user.id] ?? user.status;
          return (
            <div key={user.id} style={{ background: "#FFFFFF", borderRadius: 10, padding: "12px 14px", marginBottom: 8, border: "1px solid #E7E1D3", display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ position: "relative" }}>
                <img src={user.avatar} alt={user.name} style={{ width: 44, height: 44, borderRadius: 999, objectFit: "cover" }} />
                {user.verified && (
                  <div style={{ position: "absolute", bottom: -2, right: -2 }}>
                    <BlueTick size={14} />
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#0F172A", marginBottom: 2 }}>{user.name}</div>
                <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                  {user.role} · Joined {user.joined}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                <StatusBadge status={currentStatus as any} />
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    onClick={() => toggleStatus(user.id)}
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      padding: "3px 7px",
                      borderRadius: 5,
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "Inter, sans-serif",
                      background: currentStatus === "active" ? "#F7E4E0" : "#DCF0E4",
                      color: currentStatus === "active" ? "#C1503D" : "#3F8A5A",
                    }}
                  >
                    {currentStatus === "active" ? "Suspend" : "Reinstate"}
                  </button>
                  <button
                    style={{ fontSize: 10, fontWeight: 500, padding: "3px 7px", borderRadius: 5, border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif", background: "#F1ECE0", color: "#6B7280" }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
