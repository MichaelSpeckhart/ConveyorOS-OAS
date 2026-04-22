import React, { useEffect, useMemo, useState } from "react";
import logo from "../assets/Logo1.png";

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
  onLogout?: () => void;
};

export const SideNavLayout: React.FC<SideNavLayoutProps> = ({
  title = "ConveyorOS",
  items,
  activeKey,
  user,
  children,
  defaultCollapsed = false,
  onLogout,
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  useEffect(() => {
    const saved = localStorage.getItem("sidenav_collapsed");
    if (saved !== null) setCollapsed(saved === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem("sidenav_collapsed", String(collapsed));
  }, [collapsed]);

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
    <div className="flex h-screen w-screen bg-navy">
      {/* Sidebar */}
      <aside
        className="flex flex-col bg-navy border-r border-white/15 p-2.5 gap-2.5 overflow-hidden flex-none"
        style={{ width: navWidth, transition: "width 180ms ease" }}
      >
        {/* Brand row */}
        <div className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-2xl bg-navy border border-white/15 shadow-sm">
          <div className="w-10 h-10 rounded-[14px] grid place-items-center bg-blue-100 flex-none">
            <img src={logo} alt="Company logo" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-white tracking-wide whitespace-nowrap overflow-hidden text-ellipsis text-sm">
                {title}
              </span>
              <span className="mt-0.5 text-xs text-navy-muted whitespace-nowrap overflow-hidden text-ellipsis">
                Operations Console
              </span>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex flex-col gap-1.5 py-1 px-0.5 flex-1">
          {items.map((item) => {
            const active = item.key === activeKey;
            return (
              <button
                key={item.key}
                type="button"
                onClick={item.onClick}
                title={collapsed ? item.label : undefined}
                className={`flex items-center h-11 rounded-[14px] border outline-none cursor-pointer text-white transition-all duration-[120ms]
                  ${collapsed ? "justify-center px-0" : "justify-start gap-3 px-3"}
                  ${active ? "bg-white/15 border-white/15 font-bold" : "bg-transparent border-transparent hover:bg-white/[0.08]"}`}
              >
                <span
                  className={`w-[38px] h-[38px] rounded-xl grid place-items-center flex-none ml-1
                    ${active ? "bg-white/20" : "bg-white/[0.08]"}`}
                >
                  {item.icon ?? "•"}
                </span>
                {!collapsed && (
                  <span className="min-w-0 whitespace-nowrap overflow-hidden text-ellipsis text-sm">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          className={`flex items-center gap-2.5 px-3 py-3 rounded-2xl bg-navy border border-white/15 shadow-sm
            ${collapsed ? "justify-center" : "justify-between"}`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-[38px] h-[38px] rounded-[14px] grid place-items-center bg-white/[0.12] text-white font-extrabold flex-none">
              {avatarLetter}
            </div>
            {!collapsed && (
              <div className="flex flex-col leading-tight">
                <span className="font-extrabold text-white text-sm">{user.username}</span>
                <span className="mt-1 text-xs text-navy-muted">Signed in</span>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              type="button"
              onClick={onLogout}
              disabled={!onLogout}
              className="px-3 py-2 rounded-[10px] border border-white/15 bg-white/[0.08] text-navy-muted font-bold text-sm cursor-pointer hover:bg-white/15 transition-colors disabled:opacity-50"
            >
              Log out
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden bg-surface">
        {children}
      </main>
    </div>
  );
};
