import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { ChevronDown, ChevronRight, Smartphone } from "lucide-react";

interface NavItem {
  label: string;
  path: string;
}
interface NavGroup {
  category: string;
  color: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    category: "Onboarding & Auth",
    color: "#1A56DB",
    items: [
      { label: "S-01 · Splash", path: "/" },
      { label: "S-02 · Onboarding carousel", path: "/onboarding" },
      { label: "S-03 · Phone entry (dual)", path: "/phone-entry" },
      { label: "S-04 · OTP verification", path: "/otp" },
      { label: "S-05 · Create password", path: "/create-password" },
      { label: "S-06 · Role selection", path: "/role-select" },
      { label: "S-07 · Profile setup", path: "/profile-setup" },
    ],
  },
  {
    category: "Student / Parent",
    color: "#1A56DB",
    items: [
      { label: "S-08 · Home feed", path: "/student/home" },
      { label: "S-09 · Map search", path: "/student/map" },
      { label: "S-10 · Filters sheet", path: "/student/filters" },
      { label: "S-11 · Tutor profile", path: "/student/tutor/1" },
      { label: "S-12 · Enrollment form", path: "/student/enroll" },
      { label: "S-13 · AI Chatbot", path: "/student/chat" },
      { label: "S-14 · My enrollments", path: "/student/enrollments" },
      { label: "S-15 · Rate & review", path: "/student/review" },
      { label: "S-25 · Browse batches", path: "/student/batches" },
    ],
  },
  {
    category: "Tutor",
    color: "#0D9E75",
    items: [
      { label: "S-16 · Dashboard", path: "/tutor/dashboard" },
      { label: "S-17 · Inbox · request", path: "/tutor/inbox" },
      { label: "S-18 · Batches · create", path: "/tutor/batch" },
      { label: "S-19 · Edit profile", path: "/tutor/profile" },
      { label: "S-20 · Verification docs", path: "/tutor/documents" },
      { label: "S-21 · Availability", path: "/tutor/capacity" },
    ],
  },
  {
    category: "Admin Panel",
    color: "#312E81",
    items: [
      { label: "S-22 · Verification queue", path: "/admin/verification" },
      { label: "S-23 · User management", path: "/admin/users" },
      { label: "S-24 · Platform stats", path: "/admin/stats" },
    ],
  },
  {
    category: "Shared",
    color: "#4F46E5",
    items: [
      { label: "S-26 · Notifications", path: "/notifications" },
    ],
  },
];

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(["Onboarding", "Student / Parent", "Tutor", "Admin Panel"]));

  const toggleGroup = (cat: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F9FAFB",
        display: "flex",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: 272,
          background: "#FFFFFF",
          borderRight: "0.5px solid #E5E7EB",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          overflowY: "auto",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: "20px 16px 16px",
            borderBottom: "1px solid rgba(0,0,0,0.07)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#0C3A7A", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 18, fontWeight: 500, color: "#FFFFFF", fontFamily: "Inter, sans-serif", lineHeight: 1 }}>E</span>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500, color: "#111827" }}>EdumentX</div>
              <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 1 }}>v2 · 28 screens · 3 roles</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, background: "#F9FAFB", border: "0.5px solid #E5E7EB", borderRadius: 8, padding: "6px 10px" }}>
            <Smartphone size={12} style={{ color: "#9CA3AF" }} />
            <span style={{ fontSize: 11, color: "#4B5563" }}>iPhone 14 · 390×844 px</span>
          </div>
        </div>

        {/* Nav */}
        <div style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
          {NAV_GROUPS.map((group) => {
            const isOpen = openGroups.has(group.category);
            return (
              <div key={group.category}>
                <button
                  onClick={() => toggleGroup(group.category)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 16px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  <div style={{ width: 6, height: 6, borderRadius: 999, background: group.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: "#6B6B6B", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left" }}>
                    {group.category}
                  </span>
                  {isOpen
                    ? <ChevronDown size={12} style={{ color: "#9CA3AF" }} />
                    : <ChevronRight size={12} style={{ color: "#9CA3AF" }} />
                  }
                </button>

                {isOpen && (
                  <div style={{ paddingBottom: 4 }}>
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
                      return (
                        <button
                          key={item.path}
                          onClick={() => navigate(item.path)}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            padding: "7px 16px 7px 28px",
                            background: isActive ? `${group.color}12` : "none",
                            border: "none",
                            borderLeft: isActive ? `2px solid ${group.color}` : "2px solid transparent",
                            cursor: "pointer",
                            fontFamily: "Inter, sans-serif",
                            textAlign: "left",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              color: isActive ? group.color : "#4B4B4B",
                              fontWeight: isActive ? 500 : 400,
                              lineHeight: 1.4,
                            }}
                          >
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(0,0,0,0.07)", fontSize: 10, color: "#9CA3AF", lineHeight: 1.6 }}>
          EdumentX · Kathmandu Valley, Nepal
          <br />Minor project UI prototype
        </div>
      </aside>

      {/* Phone preview area */}
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 24px",
          minHeight: "100vh",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          {/* Phone frame */}
          <div
            style={{
              position: "relative",
              width: 390,
              height: 844,
              borderRadius: 44,
              background: "#F5F5F3",
              overflow: "hidden",
              boxShadow: "0 32px 80px rgba(0,0,0,0.25), 0 0 0 12px #1A1A1A, 0 0 0 14px #333, inset 0 0 0 1px rgba(255,255,255,0.05)",
              flexShrink: 0,
            }}
          >
            {/* Notch */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: 120,
                height: 34,
                background: "#1A1A1A",
                borderRadius: "0 0 20px 20px",
                zIndex: 100,
              }}
            />
            {/* Screen content */}
            <div style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative" }}>
              <Outlet />
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#9CA3AF", textAlign: "center" }}>
            iPhone 14 frame · 390 × 844 px · Tap screens to navigate
          </div>
        </div>
      </main>
    </div>
  );
}
