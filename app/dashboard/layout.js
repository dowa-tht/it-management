"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push("/");
      else setUser(session.user);
    });
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    // Step 1: ดึงข้อมูล User ปัจจุบัน
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Step 2: บันทึก Logout Log ก่อน Sign Out
    if (user) {
      try {
        await supabase.from("login_logs").insert([
          {
            user_id: user.id,
            user_email: user.email,
            action: "logout",
            ip_address: null,
            user_agent: navigator.userAgent.slice(0, 200),
          },
        ]);
      } catch (logError) {
        console.warn("Logout log error:", logError);
      }
    }

    // Step 3: Sign Out
    await supabase.auth.signOut();
    router.push("/");
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: "▦" },
    { href: "/dashboard/incidents", label: "Incident", icon: "⚠" },
    { href: "/dashboard/backup", label: "Backup Log", icon: "☁" },
    { href: "/dashboard/checklist", label: "Infra Checklist", icon: "✓" },
    { href: "/dashboard/tasks", label: "Daily Task", icon: "◷" },
    {
      href: "/dashboard/settings/no-series",
      label: "No. Series",
      icon: "⚙",
      section: "settings",
    },
    {
      href: "/dashboard/settings/users",
      label: "Users",
      icon: "👤",
      section: "settings",
    },
    {
      href: "/dashboard/settings/change-password",
      label: "Change Password",
      icon: "🔑",
      section: "settings",
    },
  ];

  const SidebarContent = () => (
    <>
      <div
        style={{
          padding: "20px 16px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: 0.3,
          }}
        >
          DOWA IT
        </div>
        <div
          style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}
        >
          Management System
        </div>
      </div>

      <nav style={{ padding: "12px 0", flex: 1, overflowY: "auto" }}>
        <div
          style={{
            fontSize: 9,
            color: "rgba(255,255,255,0.3)",
            letterSpacing: 1,
            padding: "4px 16px 8px",
            textTransform: "uppercase",
          }}
        >
          Operations
        </div>
        {navItems
          .filter((i) => !i.section)
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${pathname === item.href ? "active" : ""}`}
            >
              <span style={{ fontSize: 14, width: 18, textAlign: "center" }}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        <div
          style={{
            fontSize: 9,
            color: "rgba(255,255,255,0.3)",
            letterSpacing: 1,
            padding: "12px 16px 8px",
            textTransform: "uppercase",
          }}
        >
          Settings
        </div>
        {navItems
          .filter((i) => i.section === "settings")
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${pathname === item.href ? "active" : ""}`}
            >
              <span style={{ fontSize: 14, width: 18, textAlign: "center" }}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
      </nav>

      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.35)",
            marginBottom: 8,
            wordBreak: "break-all",
          }}
        >
          {user?.email}
        </div>
        <button
          onClick={handleLogout}
          style={{
            width: "100%",
            padding: "7px",
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.6)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 6,
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          ออกจากระบบ
        </button>
      </div>
    </>
  );

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Desktop Sidebar */}
      <div
        className="sidebar"
        style={{ display: "flex", flexDirection: "column", height: "100vh" }}
      >
        <SidebarContent />
      </div>

      {/* Mobile Overlay */}
      <div
        className={`mobile-overlay ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Mobile Sidebar */}
      <div
        className={`sidebar open`}
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          position: "fixed",
          zIndex: 50,
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s ease",
        }}
      >
        <SidebarContent />
      </div>

      {/* Main */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          background: "#f0f2f5",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Mobile Topbar */}
        <div
          style={{
            display: "none",
            background: "#0f1923",
            padding: "12px 16px",
            alignItems: "center",
            gap: 12,
            flexShrink: 0,
          }}
          className="mobile-topbar"
        >
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              fontSize: 20,
              cursor: "pointer",
              padding: 0,
              lineHeight: 1,
            }}
          >
            ☰
          </button>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>
            DOWA IT System
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto" }}>{children}</div>
      </div>
    </div>
  );
}
