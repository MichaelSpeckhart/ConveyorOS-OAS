import React, { useEffect, useMemo, useState } from "react";
import { theme } from "../styles/theme";

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
  user: {
    username: string;
  }
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

  // Optional: persist collapsed state locally (works in Tauri too)
  useEffect(() => {
    const saved = localStorage.getItem("sidenav_collapsed");
    if (saved !== null) setCollapsed(saved === "true");
  }, []);
  useEffect(() => {
    localStorage.setItem("sidenav_collapsed", String(collapsed));
  }, [collapsed]);

  // Optional: keyboard shortcut (Cmd/Ctrl + B)
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

  const navWidth = useMemo(() => (collapsed ? 64 : 240), [collapsed]);

  return (
    <div style={styles.shell}>
      <aside style={{ ...styles.sidebar, width: navWidth }}>
        <div style={styles.brandRow}>
          <div style={styles.brand}>
            {/* Simple "logo" */}
            <div style={styles.logoBox}>⛓️</div>
            {!collapsed && <span style={styles.brandText}>{title}</span>}
          </div>

          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand (Ctrl/Cmd+B)" : "Collapse (Ctrl/Cmd+B)"}
            style={styles.collapseBtn}
          >
            {collapsed ? "›" : "‹"}
          </button>
        </div>

        <nav style={styles.nav}>
          {items.map((item) => {
            const active = item.key === activeKey;
            return (
              <button
                key={item.key}
                type="button"
                onClick={item.onClick}
                style={{
                  ...styles.navItem,
                  ...(active ? styles.navItemActive : null),
                  justifyContent: collapsed ? "center" : "flex-start",
                }}
                title={collapsed ? item.label : undefined}
              >
                <span style={styles.iconSlot}>{item.icon ?? "•"}</span>
                {!collapsed && <span style={styles.label}>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div style={styles.footer}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontWeight: 600 }}>
              👤 {user.username}
            </div>
          </div>
        </div>
      </aside>

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
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif',
  },

  sidebar: {
    display: "flex",
    flexDirection: "column",
    background: theme.colors.sidebar,
    borderRight: `1px solid ${theme.colors.border}`,
    transition: "width 180ms ease",
  },

  brandRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 12px",
    borderBottom: `1px solid ${theme.colors.border}`,
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  logoBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    background: theme.colors.primarySoft,
    color: theme.colors.primary,
    fontWeight: 700,
  },

  brandText: {
    fontWeight: 700,
    color: theme.colors.text,
    letterSpacing: 0.2,
  },

  collapseBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: `1px solid ${theme.colors.border}`,
    background: "#fff",
    cursor: "pointer",
    color: theme.colors.textMuted,
  },

  nav: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: 8,
  },

  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid transparent",
    background: "transparent",
    cursor: "pointer",
    color: theme.colors.text,
    transition: "background 120ms ease, color 120ms ease",
  },

  navItemActive: {
    background: theme.colors.sidebarActive,
    border: `1px solid ${theme.colors.primarySoft}`,
    color: theme.colors.primary,
    fontWeight: 600,
  },

  iconSlot: {
    width: 22,
    display: "flex",
    justifyContent: "center",
    color: "inherit",
  },

  label: {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  footer: {
    marginTop: "auto",
    padding: 12,
    borderTop: `1px solid ${theme.colors.border}`,
    color: theme.colors.textMuted,
  },

  main: {
    flex: 1,
    background: theme.colors.bg,
    padding: 16,
    overflow: "auto",
  },

  contentCard: {
    minHeight: "calc(100vh - 32px)",
    background: theme.colors.panel,
    borderRadius: 16,
    padding: 20,
    border: `1px solid ${theme.colors.border}`,
    boxShadow: theme.colors.shadow,
  },
};