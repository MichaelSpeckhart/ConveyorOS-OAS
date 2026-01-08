import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface LoginResult {
  id: number;
  username: string;
}

type LoginProps = {
  onSuccess: (user: LoginResult) => void;
  onNoUsers: () => void; // ✅ add
};

const Login: React.FC<LoginProps> = ({ onSuccess, onNoUsers }) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [goToRegister, setGoToRegister] = useState(false);

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
        pinInput: p, // 👈 must match Rust param name
      });

      console.log("Logged in as", result.username);
      setSuccess("Login successful");   // 👈 green text
      setPin("");
      // Set a little delay
      setTimeout(() => { onSuccess(result) }, 500);
    } catch (e: any) {
  const msg = String(e);

  if (msg.includes("NO_USERS")) {
    setError("No users found. Please set up an account.");
    setPin("");
    onNoUsers(); // ✅ switches App to <CreateUser />
    return;
  }

  setError(msg);
  setPin("");
}

  };

  const clear = () => setPin("");
  const del = () => setPin((prev) => prev.slice(0, -1));

  return (
    <div style={wrap}>
      <h2>Enter PIN</h2>

      {/* PIN circles */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              border: "2px solid white",
              background: pin[i] ? "white" : "transparent",
            }}
          />
        ))}
      </div>

      {error && (
        <div style={{ color: "red", marginBottom: "1rem" }}>{error}</div>
      )}

      {success && (
        <div style={{ color: "limegreen", marginBottom: "1rem" }}>
          {success}
        </div>
      )}

      {/* Keypad */}
      <div style={grid}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} style={btn} onClick={() => press(d)}>
            {d}
          </button>
        ))}

        <button style={smallBtn} onClick={clear}>
          Clear
        </button>
        <button style={btn} onClick={() => press("0")}>
          0
        </button>
        <button style={smallBtn} onClick={del}>
          Del
        </button>
      </div>

      {goToRegister && (
        <div style={{ marginTop: "2rem" }}>
          <button
            style={{
              ...smallBtn,
              background: "transparent",
              border: "none",
              color: "#ffa35e",
              textDecoration: "underline",
              cursor: "pointer",
            }}
            onClick={() => window.location.replace("/create-user")}
          >
            Set up first user
          </button>
        </div>
      )}
    </div>
  );
};

const wrap: React.CSSProperties = {
  height: "100vh",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  background: "#3f6dd0ff",
  fontFamily: "sans-serif",
  color: "white",
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 4rem)",
  gap: "0.75rem",
};

const btn: React.CSSProperties = {
  fontSize: "1.75rem",
  padding: "0.75rem 0",
  borderRadius: "0.75rem",
  border: "1px solid #4b5563",
  cursor: "pointer",
  background: "#95b4e5",
  color: "white",
};

const smallBtn: React.CSSProperties = {
  ...btn,
  fontSize: "1rem",
  color: "#ffa35e",
};

export default Login;
