import { useState } from "react";

export default function ReadFilePage() {
  const [path, setPath] = useState("");
  const [lines, setLines] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRead() {
    setError(null);
    setLoading(true);
    console.log("Reading file at path:", path);
    try {
      setLines([]);

      //

    } catch (err: any) {
      setError(err.toString());
      setLines([]);
    }

    setLoading(false);
  }

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Read File</h1>

      <div style={{ marginBottom: "12px" }}>
        <label>File Path:</label>
        <input
          type="text"
          placeholder="/Users/michael/test.txt"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          style={{
            width: "100%",
            padding: "8px",
            marginTop: "6px",
            borderRadius: "6px",
            border: "1px solid #ccc",
          }}
        />
      </div>

      <button
        onClick={handleRead}
        disabled={loading}
        style={{
          padding: "8px 14px",
          borderRadius: "6px",
          background: "#4a90e2",
          color: "white",
          border: "none",
          cursor: "pointer",
        }}
      >
        {loading ? "Reading..." : "Read File"}
      </button>

      {error && (
        <div
          style={{
            marginTop: "16px",
            color: "red",
            fontWeight: "bold",
          }}
        >
          Error: {error}
        </div>
      )}

      {lines.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h2>Contents:</h2>
          <pre
            style={{
              background: "#ffffffff",
              padding: "12px",
              borderRadius: "6px",
              maxHeight: "400px",
              overflowY: "auto",
            }}
          >
            {lines.join("\n")}
          </pre>
        </div>
      )}
    </div>
  );
}
