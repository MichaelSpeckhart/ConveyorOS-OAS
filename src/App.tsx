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
import SetupWizard from "./components/SetupWizard";
import { checkSetupRequired } from "./lib/settings";

export default function App() {
  const [user, setUser] = useState<LoginResult | null>(null);
  const [active, setActive] = useState("dashboard");
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);

  // Check if initial setup is required
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const required = await checkSetupRequired();
        if (alive) setSetupRequired(required);
      } catch (e) {
        console.error("Failed to check setup required:", e);
        if (alive) setSetupRequired(true); // Default to showing setup on error
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    if (!user) {
      setSessionId(null);
      return;
    }
    (async () => {
      try {
        
          const session = await startUserSessionTauri(user.id);

        if (alive) setSessionId(session.id);
        

        
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

  // ---- SETUP WIZARD GATE ----
  if (setupRequired === null) {
    // Still checking if setup is required
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 mx-auto rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin" />
          <p className="text-slate-600 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  if (setupRequired) {
    return <SetupWizard onComplete={() => setSetupRequired(false)} />;
  }

  // ---- AUTH GATE ----
  if (!user) {
    if (showCreateUser) {
      return <CreateUser onUserCreated={() => setShowCreateUser(false)} />;
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
