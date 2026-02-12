import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import Logo1 from "../../assets/Logo1.png";

export interface LoginResult {
  id: number;
  username: string;
}

type LoginProps = {
  onSuccess: (user: LoginResult) => void;
  onNoUsers: () => void; 
};

const Login: React.FC<LoginProps> = ({ onSuccess, onNoUsers }) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [goToRegister] = useState(false);

  const press = async (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);

      if (newPin.length === 4) {
        await submit(newPin);
      }
    }
  };

  const submit = async (p: string) => {
    setError("");
    setSuccess("");

    try {
      const result = await invoke<LoginResult>("auth_login_user_tauri", {
        pinInput: p, 
      });

      console.log("Logged in as", result.username);
      setSuccess("Login successful");   
      setPin("");
      
      setTimeout(() => { onSuccess(result) }, 500);
    } catch (e: any) {
  const msg = String(e);

  if (msg.includes("NO_USERS")) {
    setError("No users found. Please set up an account.");
    setPin("");
    onNoUsers(); 
    return;
  }

  setError(msg);
  setPin("");
}

  };

  const clear = () => setPin("");
  const del = () => setPin((prev) => prev.slice(0, -1));

  return (
    <div className="min-h-screen w-full bg-[#16355b] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white/95 text-slate-900 rounded-[2.5rem] shadow-2xl p-8 md:p-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-slate-500 font-bold">Secure Access</div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">Operator Login</h1>
            </div>
            <img src={Logo1} alt="ConveyorOS" className="h-12 w-12 object-contain" />
          </div>

          <div className="bg-slate-100 rounded-2xl px-6 py-4 mb-6 flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.3em] text-slate-500 font-bold">PIN</span>
            <div className="flex items-center gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-3 w-3 rounded-full border-2 ${pin[i] ? "border-slate-900 bg-slate-900" : "border-slate-300 bg-transparent"}`}
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
              {success}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <button
                key={d}
                onClick={() => press(d)}
                className="h-16 rounded-2xl text-2xl font-black transition-all active:scale-95 bg-slate-800 text-white hover:bg-black shadow-md"
              >
                {d}
              </button>
            ))}

            <button
              onClick={clear}
              className="h-16 rounded-2xl text-sm font-black uppercase tracking-widest transition-all active:scale-95 bg-slate-200 text-slate-700 hover:bg-slate-300 shadow-md"
            >
              Clear
            </button>
            <button
              onClick={() => press("0")}
              className="h-16 rounded-2xl text-2xl font-black transition-all active:scale-95 bg-slate-800 text-white hover:bg-black shadow-md"
            >
              0
            </button>
            <button
              onClick={del}
              className="h-16 rounded-2xl text-sm font-black uppercase tracking-widest transition-all active:scale-95 bg-slate-200 text-slate-700 hover:bg-slate-300 shadow-md"
            >
              Del
            </button>
          </div>

          {goToRegister && (
            <div className="mt-6">
              <button
                className="text-sm font-semibold text-slate-600 hover:text-slate-900 underline underline-offset-4"
                onClick={() => window.location.replace("/create-user")}
              >
                Set up first user
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-xs text-slate-300">
          Use the keypad to enter your 4-digit PIN.
        </div>
      </div>
    </div>
  );
};

export default Login;
