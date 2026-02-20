import { useState } from "react";
import { testDatabaseConnection, saveSettings, type AppSettings } from "../lib/settings";
import { Database, Server, CheckCircle } from "lucide-react";

interface SetupWizardProps {
  onComplete: () => void;
}

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [settings, setSettings] = useState<AppSettings>({
    posCsvDir: "",
    conveyorCsvOutputDir: "",
    dbHost: "localhost",
    dbPort: 5432,
    dbName: "conveyor-app",
    dbUser: "postgres",
    dbPassword: "",
    opcServerUrl: "opc.tcp://localhost:4840",
  });
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);

    try {
      const result = await testDatabaseConnection(
        settings.dbHost,
        settings.dbPort,
        settings.dbName,
        settings.dbUser,
        settings.dbPassword
      );
      setConnectionResult(result);
    } catch (e) {
      console.error("Test connection failed:", e);
      setConnectionResult({ success: false, message: String(e) });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveAndComplete = async () => {
    setSaving(true);
    try {
      await saveSettings(settings);
      setTimeout(() => {
        onComplete();
      }, 500);
    } catch (e) {
      console.error("Failed to save settings:", e);
      setConnectionResult({ success: false, message: `Failed to save: ${e}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center">
              <div
                className={`h-2 w-16 rounded-full transition-all ${
                  i <= step ? "bg-white" : "bg-white/20"
                }`}
              />
              {i < 3 && <div className="w-2" />}
            </div>
          ))}
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 text-white mb-2">
                  <Server size={32} />
                </div>
                <div className="text-xs uppercase tracking-[0.3em] text-slate-500 font-bold">Welcome</div>
                <h2 className="text-3xl font-black text-slate-900">First-Time Setup</h2>
                <p className="text-slate-600 max-w-md mx-auto">
                  Let's configure your Order Assembly System. We'll need to set up your database
                  connection and other essential settings.
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 space-y-3">
                <h3 className="font-bold text-slate-900">What you'll need:</h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="text-slate-400">•</span>
                    <span>PostgreSQL database server (installed and running)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-slate-400">•</span>
                    <span>Database name, username, and password</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-slate-400">•</span>
                    <span>OPC server URL (optional)</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black tracking-tight shadow-md hover:bg-black transition-colors"
              >
                Get Started
              </button>
            </div>
          )}

          {/* Step 2: Database Configuration */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 text-white mb-2">
                  <Database size={28} />
                </div>
                <div className="text-xs uppercase tracking-[0.3em] text-slate-500 font-bold">Step 1 of 2</div>
                <h2 className="text-2xl font-black text-slate-900">Database Connection</h2>
                <p className="text-slate-600 text-sm">
                  Configure your PostgreSQL database connection
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Host</div>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    value={settings.dbHost}
                    onChange={(e) => setSettings({ ...settings, dbHost: e.target.value })}
                    placeholder="localhost"
                  />
                </label>

                <label className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Port</div>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    type="number"
                    value={settings.dbPort}
                    onChange={(e) => setSettings({ ...settings, dbPort: Number(e.target.value) })}
                  />
                </label>

                <label className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Database Name</div>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    value={settings.dbName}
                    onChange={(e) => setSettings({ ...settings, dbName: e.target.value })}
                    placeholder="conveyor-app"
                  />
                </label>

                <label className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Username</div>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    value={settings.dbUser}
                    onChange={(e) => setSettings({ ...settings, dbUser: e.target.value })}
                    placeholder="postgres"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Password</div>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    type="password"
                    value={settings.dbPassword}
                    onChange={(e) => setSettings({ ...settings, dbPassword: e.target.value })}
                    placeholder="Enter database password"
                  />
                </label>
              </div>

              {/* Test Connection */}
              <div className="space-y-3">
                <button
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="w-full py-3 rounded-2xl bg-blue-600 text-white font-bold tracking-tight shadow hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testingConnection ? "Testing Connection..." : "Test Connection"}
                </button>

                {connectionResult && (
                  <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                    connectionResult.success
                      ? "border-green-500/40 bg-green-500/10 text-green-700"
                      : "border-red-500/40 bg-red-500/10 text-red-700"
                  }`}>
                    {connectionResult.message}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 font-bold hover:bg-slate-100"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!connectionResult?.success}
                  className="flex-1 py-3 rounded-2xl bg-slate-900 text-white font-bold hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: OPC & Final */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 text-white mb-2">
                  <CheckCircle size={28} />
                </div>
                <div className="text-xs uppercase tracking-[0.3em] text-slate-500 font-bold">Step 2 of 2</div>
                <h2 className="text-2xl font-black text-slate-900">OPC Server (Optional)</h2>
                <p className="text-slate-600 text-sm">
                  Configure your OPC server connection
                </p>
              </div>

              <label className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500">OPC Server URL</div>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  value={settings.opcServerUrl || ""}
                  onChange={(e) => setSettings({ ...settings, opcServerUrl: e.target.value })}
                  placeholder="opc.tcp://localhost:4840"
                />
              </label>

              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-green-800 font-bold">
                  <CheckCircle size={20} />
                  <span>Database connection verified</span>
                </div>
                <p className="text-sm text-green-700">
                  Your settings are ready to be saved. The database tables will be created automatically on the next launch.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  disabled={saving}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleSaveAndComplete}
                  disabled={saving}
                  className="flex-1 py-3 rounded-2xl bg-green-600 text-white font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {saving ? "Saving..." : "Complete Setup"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 text-center text-xs text-white/60">
          White Conveyors Order Assembly System
        </div>
      </div>
    </div>
  );
}
