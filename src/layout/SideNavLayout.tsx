import React, { useEffect, useMemo, useState } from "react";
import { theme } from "../styles/theme";

import logo from "../assets/Logo1.png"; // or .png


type NavItem = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
};

type SideNavLayoutProps = {
  title?: string;
  items: NavItem[];
  activeKey?: string;
  user: { username: string };
  children: React.ReactNode;
  defaultCollapsed?: boolean;
};

export const SideNavLayout: React.FC<SideNavLayoutProps> = ({
  title = "ConveyorOS",
  items,
  activeKey,
  user,
  children,
  defaultCollapsed = false,
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  // persist collapsed state
  useEffect(() => {
    const saved = localStorage.getItem("sidenav_collapsed");
    if (saved !== null) setCollapsed(saved === "true");
  }, []);
  useEffect(() => {
    localStorage.setItem("sidenav_collapsed", String(collapsed));
  }, [collapsed]);

  // Cmd/Ctrl + B toggles
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed((c) => !c);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const navWidth = useMemo(() => (collapsed ? 72 : 260), [collapsed]);
  const avatarLetter = (user.username?.trim()?.[0] ?? "U").toUpperCase();

  return (
    <div style={styles.shell}>
      <aside style={{ ...styles.sidebar, width: navWidth }}>
        {/* Top brand + collapse */}
        <div style={styles.brandRow}>
          <div style={styles.brand}>
            <div style={styles.logoBox}>
              <img
                src={logo}
                alt="Company logo"
                style={styles.logoImg}
              />
            </div>
            {!collapsed && (
              <div style={styles.brandTextWrap}>
                <div style={styles.brandText}>{title}</div>
                <div style={styles.brandSub}>Operations Console</div>
              </div>
            )}
          </div>

          {/* <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand (Ctrl/Cmd+B)" : "Collapse (Ctrl/Cmd+B)"}
            style={styles.collapseBtn}
          >
            <span style={{ display: "block", transform: collapsed ? "rotate(0deg)" : "rotate(180deg)" }}>
              ❯
            </span>
          </button> */}
        </div>

        {/* Nav */}
        <nav style={styles.nav}>
          {items.map((item) => {
            const active = item.key === activeKey;

            return (
              <button
                key={item.key}
                type="button"
                onClick={item.onClick}
                title={collapsed ? item.label : undefined}
                style={{
                  ...styles.navItem,
                  ...(active ? styles.navItemActive : null),
                  paddingLeft: collapsed ? 0 : 12,
                  paddingRight: collapsed ? 0 : 12,
                  justifyContent: collapsed ? "center" : "flex-start",
                }}
              >
                <span style={{ ...styles.iconSlot, ...(active ? styles.iconSlotActive : null) }}>
                  {item.icon ?? "•"}
                </span>
                {!collapsed && <span style={styles.label}>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ ...styles.footer, justifyContent: collapsed ? "center" : "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={styles.avatar} aria-hidden>
              {avatarLetter}
            </div>
            {!collapsed && (
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
                <div style={styles.userName}>{user.username}</div>
                <div style={styles.userSub}>Signed in</div>
              </div>
            )}
          </div>

          {/* {!collapsed && (
            // <div style={styles.kbdHint} title="Toggle sidebar">
            //   Ctrl/Cmd + B
            // </div>
          )} */}
          {/* Logout Button  */}
          
        </div>
      </aside>

      {/* Main */}
      <main style={styles.main}>
        <div style={styles.contentCard}>{children}</div>
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  shell: {
    display: "flex",
    height: "100vh",
    width: "100vw",
    background: theme.colors.bg,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif',
  },

  sidebar: {
    display: "flex",
    flexDirection: "column",
    background: theme.colors.sidebar,
    borderRight: `1px solid ${theme.colors.border}`,
    transition: "width 180ms ease",
    padding: 10,
    gap: 10,
  },

  brandRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 10px",
    borderRadius: 16,
    background: theme.colors.panel,
    border: `1px solid ${theme.colors.border}`,
    boxShadow: theme.colors.shadow,
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },

  logoBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    background: theme.colors.primarySoft,
    color: theme.colors.primary,
    fontWeight: 800,
    flex: "0 0 auto",
  },

  brandTextWrap: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },

  brandText: {
    fontWeight: 800,
    color: theme.colors.text,
    letterSpacing: 0.2,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  brandSub: {
    marginTop: 2,
    fontSize: 12,
    color: theme.colors.textMuted,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  collapseBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    border: `1px solid ${theme.colors.border}`,
    background: "#fff",
    cursor: "pointer",
    color: theme.colors.textMuted,
    display: "grid",
    placeItems: "center",
  },

  nav: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: "4px 2px",
  },

  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    height: 44,
    borderRadius: 14,
    border: `1px solid transparent`,
    background: "transparent",
    cursor: "pointer",
    color: theme.colors.text,
    transition: "background 120ms ease, border 120ms ease, transform 80ms ease",
    outline: "none",
  },

  navItemActive: {
    background: theme.colors.sidebarActive,
    border: `1px solid ${theme.colors.primarySoft}`,
    color: theme.colors.primary,
    fontWeight: 700,
  },

  iconSlot: {
    width: 38,
    height: 38,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    color: "inherit",
    background: "rgba(0,0,0,0.03)",
    marginLeft: 4,
    flex: "0 0 auto",
  },

  iconSlotActive: {
    background: theme.colors.primarySoft,
    color: theme.colors.primary,
  },

  label: {
    minWidth: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  footer: {
    marginTop: "auto",
    padding: "12px 12px",
    borderRadius: 16,
    background: theme.colors.panel,
    border: `1px solid ${theme.colors.border}`,
    boxShadow: theme.colors.shadow,
    display: "flex",
    alignItems: "center",
    gap: 12,
  },

  avatar: {
    width: 38,
    height: 38,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    background: "rgba(0,0,0,0.06)",
    color: theme.colors.text,
    fontWeight: 800,
  },

  userName: {
    fontWeight: 800,
    color: theme.colors.text,
  },

  userSub: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.textMuted,
  },

  kbdHint: {
    marginLeft: "auto",
    fontSize: 12,
    color: theme.colors.textMuted,
    border: `1px solid ${theme.colors.border}`,
    padding: "6px 8px",
    borderRadius: 10,
    background: "rgba(255,255,255,0.6)",
    whiteSpace: "nowrap",
  },

  main: {
  flex: 1,
  padding: 16,
  overflow: "hidden",  // Changed from "auto"
  background: theme.colors.bg,
},

contentCard: {
  height: "100%",  // Changed from minHeight
  background: theme.colors.panel,
  borderRadius: 20,
  padding: 20,
  border: `1px solid ${theme.colors.border}`,
  boxShadow: theme.colors.shadow,
  overflow: "hidden",  // Added this
},

  logoImg: {
  width: "100%",
  height: "100%",
  objectFit: "contain",
},

};
