import { useState } from "react";
import {
  LayoutDashboard,
  ScanLine,
  Users,
  Settings,
} from "lucide-react";

import { SideNavLayout } from "./layout/SideNavLayout";
import Login from "./pages/login/Login";
import Home from "./pages/Home";
import { LoginResult } from "./types/auth";
import PosSettings from "./pages/pos/PosSettings";
import GarmentScanningPage from "./pages/scan/GarmentScanning";
import CreateUser from "./pages/login/CreateUser";
import DataPage from "./pages/Data";
import { Database } from "lucide-react";

export default function App() {
  const [user, setUser] = useState<LoginResult | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [active, setActive] = useState("dashboard");

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

  if (!isAuthenticated) {
    return <Login onSuccess={() => setIsAuthenticated(true)} />;
  }

  if (!user) {
    return <Login onSuccess={setUser} />;
  }

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
      {active === "customers" && <div>Customers</div>}
      {active === "settings" && <PosSettings />}
    </SideNavLayout>
  );
}
