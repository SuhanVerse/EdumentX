import { useState } from "react";
import { Search, X, CheckCircle } from "lucide-react";
import { ADMIN_USERS } from "../data/mockData";
import { BlueTick } from "../components/shared/BlueTick";
import { AdminNav } from "../components/shared/AdminNav";
import { colors, font } from "../theme/tokens";

type StatusFilter = "All" | "Active" | "Suspended" | "Deleted";
type RoleFilter = "All roles" | "Students" | "Tutors" | "Admins";

const ROLE_CHIP: Record<string, { bg: string; color: string }> = {
  Admin:   { bg: colors.aiTint,     color: colors.ai },
  Tutor:   { bg: colors.verifyTint, color: colors.verify },
  Student: { bg: colors.amberTint,  color: colors.amber },
};

const STATUS_CHIP: Record<string, { bg: string; color: string; label: string }> = {
  active:    { bg: "#DCF5E8",       color: colors.verify, label: "Active" },
  suspended: { bg: colors.amberTint, color: colors.amber, label: "Suspended" },
  deleted:   { bg: colors.dangerTint, color: colors.danger, label: "Deleted" },
};

// Confirm dialog
function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel, destructive }: {
  title: string; message: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void; destructive?: boolean;
}) {
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 360, background: colors.paper, borderRadius: 24, padding: 20 }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: colors.text, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13, color: colors.muted, lineHeight: 1.5, marginBottom: 20 }}>{message}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onCancel} style={{ flex: 1, height: 48, background: colors.sand, border: "none", borderRadius: 14, fontSize: 14, fontWeight: 500, color: colors.muted, cursor: "pointer", fontFamily: font }}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{ flex: 2, height: 48, background: destructive ? colors.danger : colors.verify, border: "none", borderRadius: 14, fontSize: 14, fontWeight: 600, color: colors.inverse, cursor: "pointer", fontFamily: font }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function UserManagement() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("All roles");
  const [userStatuses, setUserStatuses] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    ADMIN_USERS.forEach((u) => { init[u.id] = u.status; });
    return init;
  });
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: "suspend" | "restore" | "delete" } | null>(null);

  const totalUsers = ADMIN_USERS.length;
  const deletedCount = Object.values(userStatuses).filter((s) => s === "deleted").length;

  const filtered = ADMIN_USERS.filter((u) => {
    const currentStatus = userStatuses[u.id] ?? u.status;
    const matchesStatus = statusFilter === "All" || currentStatus === statusFilter.toLowerCase();
    const matchesRole = roleFilter === "All roles" || u.role + "s" === roleFilter;
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesRole && matchesSearch;
  });

  const doAction = () => {
    if (!confirmAction) return;
    const { id, action } = confirmAction;
    setUserStatuses((p) => ({
      ...p,
      [id]: action === "suspend" ? "suspended" : action === "restore" ? "active" : "deleted",
    }));
    setConfirmAction(null);
  };

  const confirmTarget = confirmAction ? ADMIN_USERS.find((u) => u.id === confirmAction.id) : null;

  return (
    <div style={{ width: "100%", height: "100%", background: colors.paper, display: "flex", flexDirection: "column", fontFamily: font }}>
      {/* Dark slate hero with search bar */}
      <div style={{ background: colors.slate, padding: "24px 20px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>Management</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: colors.inverse }}>User Management</div>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", textAlign: "right", marginTop: 4 }}>
            <strong style={{ color: "rgba(255,255,255,0.9)" }}>{totalUsers} users</strong> · {deletedCount} deleted
          </div>
        </div>

        {/* Search bar */}
        <div style={{ background: colors.card, borderRadius: 12, height: 44, display: "flex", alignItems: "center", paddingLeft: 12, paddingRight: 12, gap: 8, marginBottom: 16 }}>
          <Search size={18} color={colors.muted} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users…"
            style={{ flex: 1, border: "none", outline: "none", fontSize: 14, color: colors.text, fontFamily: font, background: "transparent" }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex" }}>
              <X size={16} color={colors.muted} />
            </button>
          )}
        </div>

        <AdminNav />
      </div>

      {/* Filter pills */}
      <div style={{ background: colors.paper, borderBottom: `1px solid ${colors.hairline}`, padding: "10px 16px", display: "flex", gap: 6, overflowX: "auto", flexShrink: 0 }}>
        {(["All", "Active", "Suspended", "Deleted"] as StatusFilter[]).map((s) => {
          const on = statusFilter === s;
          const count = s === "All" ? ADMIN_USERS.length : ADMIN_USERS.filter((u) => (userStatuses[u.id] ?? u.status) === s.toLowerCase()).length;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{ flexShrink: 0, height: 32, padding: "0 12px", borderRadius: 999, border: "none", background: on ? colors.ai : colors.sand, color: on ? colors.inverse : colors.muted, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", gap: 5 }}
            >
              {s}
              <span style={{ fontSize: 10, background: on ? "rgba(255,255,255,0.2)" : colors.card, color: on ? colors.inverse : colors.muted, padding: "1px 5px", borderRadius: 999 }}>{count}</span>
            </button>
          );
        })}
        <div style={{ width: 1, height: 24, background: colors.hairline, flexShrink: 0, alignSelf: "center", margin: "0 4px" }} />
        {(["All roles", "Students", "Tutors", "Admins"] as RoleFilter[]).map((r) => {
          const on = roleFilter === r;
          return (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              style={{ flexShrink: 0, height: 32, padding: "0 12px", borderRadius: 999, border: "none", background: on ? colors.ai : colors.sand, color: on ? colors.inverse : colors.muted, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: font }}
            >
              {r}
            </button>
          );
        })}
      </div>

      {/* User list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 32px" }}>
        {filtered.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 60, gap: 10 }}>
            <div style={{ width: 56, height: 56, borderRadius: 999, background: colors.amberTint, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Search size={26} color={colors.amber} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: colors.text }}>No matching users</div>
            <div style={{ fontSize: 13, color: colors.muted }}>Try adjusting your filters or search</div>
          </div>
        )}

        {filtered.map((user) => {
          const currentStatus = userStatuses[user.id] ?? user.status;
          const roleChip = ROLE_CHIP[user.role] ?? ROLE_CHIP["Student"];
          const statusChip = STATUS_CHIP[currentStatus] ?? STATUS_CHIP["active"];

          return (
            <div key={user.id} style={{ background: colors.card, borderRadius: 14, padding: 16, marginBottom: 10, border: `1px solid ${colors.hairline}` }}>
              {/* Top row */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 999, background: colors.sand, overflow: "hidden" }}>
                    <img src={user.avatar} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  {user.verified && (
                    <div style={{ position: "absolute", bottom: -2, right: -2 }}><BlueTick size={16} /></div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: colors.text }}>{user.name}</div>
                    <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 7px", borderRadius: 999, background: roleChip.bg, color: roleChip.color }}>{user.role}</span>
                  </div>
                  <div style={{ fontSize: 12, color: colors.muted, marginTop: 3 }}>Joined {user.joined}</div>
                </div>
              </div>

              {/* Bottom row */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, borderTop: `1px solid ${colors.hairline}`, paddingTop: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 500, padding: "3px 8px", borderRadius: 999, background: statusChip.bg, color: statusChip.color }}>
                  {statusChip.label}
                </span>
                <div style={{ flex: 1 }} />
                {currentStatus === "active" && (
                  <>
                    <button
                      onClick={() => setConfirmAction({ id: user.id, action: "suspend" })}
                      style={{ fontSize: 11, fontWeight: 500, padding: "4px 10px", borderRadius: 999, background: `${colors.danger}1A`, color: colors.danger, border: "none", cursor: "pointer", fontFamily: font }}
                    >
                      Suspend
                    </button>
                    <button
                      onClick={() => setConfirmAction({ id: user.id, action: "delete" })}
                      style={{ fontSize: 11, fontWeight: 500, padding: "4px 10px", borderRadius: 999, background: `${colors.danger}1A`, color: colors.danger, border: "none", cursor: "pointer", fontFamily: font }}
                    >
                      Delete
                    </button>
                  </>
                )}
                {(currentStatus === "suspended" || currentStatus === "deleted") && (
                  <button
                    onClick={() => setConfirmAction({ id: user.id, action: "restore" })}
                    style={{ fontSize: 11, fontWeight: 500, padding: "4px 10px", borderRadius: 999, background: `${colors.verify}1A`, color: colors.verify, border: "none", cursor: "pointer", fontFamily: font }}
                  >
                    Restore
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {confirmAction && confirmTarget && (
        <ConfirmDialog
          title={confirmAction.action === "suspend" ? `Suspend ${confirmTarget.name}?` : confirmAction.action === "restore" ? `Restore ${confirmTarget.name}?` : `Delete ${confirmTarget.name}?`}
          message={confirmAction.action === "suspend" ? "This user will be hidden from searches and unable to log in." : confirmAction.action === "restore" ? "This user will be restored to active status." : `${confirmTarget.name} will be marked as deleted. User data is retained but hidden.`}
          confirmLabel={confirmAction.action === "suspend" ? "Suspend" : confirmAction.action === "restore" ? "Restore" : "Delete"}
          destructive={confirmAction.action === "suspend" || confirmAction.action === "delete"}
          onConfirm={doAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
