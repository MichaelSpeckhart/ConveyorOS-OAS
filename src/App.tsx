import { useState } from "react";
import { LayoutDashboard, ScanLine, Settings, Database } from "lucide-react";

import { SideNavLayout } from "./layout/SideNavLayout";
import Login from "./pages/login/Login";
import Home from "./pages/Home";
import { LoginResult } from "./types/auth";
import PosSettings from "./pages/pos/PosSettings";
import GarmentScanningPage from "./pages/scan/GarmentScanning";
import CreateUser from "./pages/login/CreateUser";
import DataPage from "./pages/Data";

export default function App() {
  const [user, setUser] = useState<LoginResult | null>(null);
  const [active, setActive] = useState("dashboard");
  const [showCreateUser, setShowCreateUser] = useState(false);

  const navItems = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard size={20} />,
      onClick: () => setActive("dashboard"),
    },
    {
      key: "data",
      label: "Data",
      icon: <Database size={20} />,
      onClick: () => setActive("data"),
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
    <SideNavLayout
      title="Order Assembly System"
      items={navItems}
      activeKey={active}
      user={user}
    >
      {active === "dashboard" && <Home />}
      {active === "scan" && <GarmentScanningPage />}
      {active === "data" && <DataPage />}
      {active === "settings" && <PosSettings />}
    </SideNavLayout>
  );
}
