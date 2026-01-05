import { useState } from "react";
import { SideNavLayout } from "./layout/SideNavLayout";
import Login from "./pages/login/Login";
import Home from "./pages/Home";
import { LoginResult } from "./types/auth";
import PosSettings from "./pages/pos/PosSettings";
import GarmentScanningPage from "./pages/scan/GarmentScanning";
import CreateUser from "./pages/login/CreateUser";

export default function App() {
  const [user, setUser] = useState<LoginResult | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [active, setActive] = useState("dashboard");

  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: "", onClick: () => setActive("dashboard") },
    { key: "scan", label: "Scan", icon: "📦", onClick: () => setActive("scan") },
    { key: "customers", label: "Customers", icon: "👤", onClick: () => setActive("customers") },
    { key: "settings", label: "Settings", icon: "⚙️", onClick: () => setActive("settings") },
  ];

  if (!isAuthenticated) {
    return <Login onSuccess={() => setIsAuthenticated(true)} />;
  }
  if (!user) {
    return <Login onSuccess={setUser  } />;
  }


  return (
    <SideNavLayout title="Order Assembly System" items={navItems} activeKey={active} user={user}>
      {active === "dashboard" && <Home />}
      {active === "scan" && <GarmentScanningPage/>}
      {active === "customers" && <div>Customers</div>}
      {active === "settings" && <CreateUser/>}
    </SideNavLayout>
  );
}
