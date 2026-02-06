import { useEffect, useState } from "react";
import { LayoutDashboard, ScanLine, Settings, Database, BarChart3 } from "lucide-react";

import { SideNavLayout } from "./layout/SideNavLayout";
import Login from "./pages/login/Login";
import Home from "./pages/Home";
import { LoginResult } from "./types/auth";
import PosSettings from "./pages/pos/PosSettings";
import GarmentScanningPage from "./pages/scan/GarmentScanning";
import RecallData from "./pages/scan/RecallData";
import CreateUser from "./pages/login/CreateUser";
import DataPage from "./pages/Data";
import OperatorData from "./pages/operators/OperatorData";
import { endUserSessionTauri, getExistingSession, sessionExistsTodayTauri, startUserSessionTauri } from "./lib/session_manager";

export default function App() {
  const [user, setUser] = useState<LoginResult | null>(null);
  const [active, setActive] = useState("dashboard");
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    if (!user) {
      setSessionId(null);
      return;
    }
    (async () => {
      try {
        const sessionExists = await sessionExistsTodayTauri(user.id);

        if (sessionExists) {
          const session = await getExistingSession(user.id);
          if (alive) setSessionId(session.id);
          return;
        }
        else
        {
          const session = await startUserSessionTauri(user.id);

        


        if (alive) setSessionId(session.id);
        }

        
      } catch (e) {
        console.error("Failed to start session", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const navItems = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard size={20} />,
      onClick: () => setActive("dashboard"),
    },
    {
      key: "data",
      label: "Customer Data",
      icon: <Database size={20} />,
      onClick: () => setActive("data"),
    },
    {
      key: "operator-data",
      label: "Operator Data",
      icon: <BarChart3 size={20} />,
      onClick: () => setActive("operator-data"),
    },
    {
      key: "scan",
      label: "Scan",
      icon: <ScanLine size={20} />,
      onClick: () => setActive("scan"),
    },
    {
      key: "settings",
      label: "Settings",
      icon: <Settings size={20} />,
      onClick: () => setActive("settings"),
    },
  ];

  // ---- AUTH GATE ----
  if (!user) {
    if (showCreateUser) {
      return <CreateUser />; // ✅ no props
    }

    return (
      <Login
        onSuccess={setUser}
        onNoUsers={() => setShowCreateUser(true)} // ✅ simple
      />
    );
  }

  // ---- MAIN APP ----
  return (
    <>
      <SideNavLayout
        title="Order Assembly System"
        items={navItems}
        activeKey={active}
        user={user}
        onLogout={() => setShowLogoutConfirm(true)}
      >
        {active === "dashboard" && <Home />}
        {active === "scan" && <GarmentScanningPage onOpenRecall={() => setActive("recall")} sessionId={sessionId} />}
        {active === "recall" && <RecallData />}
        {active === "data" && <DataPage />}
        {active === "operator-data" && <OperatorData />}
        {active === "settings" && <PosSettings />}
      </SideNavLayout>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl p-6">
            <div className="text-sm uppercase tracking-widest text-slate-500 font-bold">Session</div>
            <h3 className="text-2xl font-black text-slate-900 mt-2">
              Confirm sign out
            </h3>
            <p className="text-slate-600 mt-2">
              Your current session will end and you’ll return to the login screen.
            </p>

            {isLoggingOut && (
              <div className="mt-5 flex items-center gap-3 text-slate-700">
                <span className="h-5 w-5 rounded-full border-2 border-slate-300 border-t-slate-700 animate-spin" />
                <span className="font-semibold">Signing you out…</span>
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 font-bold disabled:opacity-50"
                disabled={isLoggingOut}
              >
                No, stay
              </button>
              <button
                onClick={() => {
                  if (isLoggingOut) return;
                  setIsLoggingOut(true);
                  setTimeout(async () => {
                    try {
                      if (sessionId) await endUserSessionTauri(sessionId);
                    } catch (e) {
                      console.error("Failed to end session", e);
                    } finally {
                      setIsLoggingOut(false);
                      setShowLogoutConfirm(false);
                      setUser(null);
                      setSessionId(null);
                      setActive("dashboard");
                    }
                  }, 2000);
                }}
                className="py-3 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold disabled:opacity-50"
                disabled={isLoggingOut}
              >
                Yes, sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
