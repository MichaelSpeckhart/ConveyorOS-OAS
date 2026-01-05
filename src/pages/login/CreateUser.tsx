// src/pages/CreateUser.tsx
import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface CreateUserResult {
  id: number;
  username: string;
}

const CreateUser: React.FC = () => {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!username.trim()) {
      setError("Username is required.");
      return;
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError("PIN must be exactly 4 digits.");
      return;
    }

    if (pin !== confirmPin) {
      setError("PINs do not match.");
      return;
    }

    setLoading(true);
    try {
      const result = await invoke<CreateUserResult>("auth_create_user_tauri", {
        usernameInput: username,
        pinInput: pin,
      });

      setSuccess(`User "${result.username}" created. Redirecting to login...`);
      setUsername("");
      setPin("");
      setConfirmPin("");

      // ✅ simple "redirect" for your state-driven App: reload and show Login
      setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch (err: any) {
      console.error(err);
      setError(typeof err === "string" ? err : "Failed to create user.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#e5e7eb",
        color: "#e5e7eb",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "360px",
          padding: "2rem",
          borderRadius: "1rem",
          background: "#1f2937",
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
        }}
      >
        <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
          Create First User
        </h2>
        <p style={{ fontSize: "0.9rem", color: "#9ca3af", marginBottom: "1.5rem" }}>
          Set up an operator account with a 4-digit PIN.
        </p>

        {error && (
          <div
            style={{
              marginBottom: "0.75rem",
              padding: "0.5rem 0.75rem",
              borderRadius: "0.5rem",
              backgroundColor: "#7f1d1d",
              color: "#fee2e2",
              fontSize: "0.85rem",
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              marginBottom: "0.75rem",
              padding: "0.5rem 0.75rem",
              borderRadius: "0.5rem",
              backgroundColor: "#14532d",
              color: "#bbf7d0",
              fontSize: "0.85rem",
            }}
          >
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          <div>
            <label
              style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.9rem" }}
            >
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={inputStyle}
              autoComplete="off"
              disabled={loading}
            />
          </div>

          <div>
            <label
              style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.9rem" }}
            >
              PIN (4 digits)
            </label>
            <input
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => {
                const v = e.target.value;
                if (/^\d{0,4}$/.test(v)) setPin(v);
              }}
              style={inputStyle}
              inputMode="numeric"
              disabled={loading}
            />
          </div>

          <div>
            <label
              style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.9rem" }}
            >
              Confirm PIN
            </label>
            <input
              type="password"
              maxLength={4}
              value={confirmPin}
              onChange={(e) => {
                const v = e.target.value;
                if (/^\d{0,4}$/.test(v)) setConfirmPin(v);
              }}
              style={inputStyle}
              inputMode="numeric"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "0.75rem",
              padding: "0.7rem 0",
              fontSize: "1rem",
              fontWeight: 600,
              borderRadius: "0.75rem",
              border: "none",
              backgroundColor: loading ? "#4b5563" : "#22c55e",
              color: "#052e16",
              cursor: loading ? "default" : "pointer",
            }}
          >
            {loading ? "Creating..." : "Create User"}
          </button>
        </form>
      </div>
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.6rem",
  borderRadius: "0.5rem",
  border: "1px solid #374151",
  backgroundColor: "#111827",
  color: "#e5e7eb",
  fontSize: "0.95rem",
  outline: "none",
};

export default CreateUser;
