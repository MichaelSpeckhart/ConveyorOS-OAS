import React, { useState } from "react";
import { readDelCsvFile, readFile } from "../lib/file";

export default function ReadFilePage() {
  const [path, setPath] = useState("");
  const [lines, setLines] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteCount, setDeleteCount] = useState<number | null>(null);

  async function handleRead() {
    setError(null);
    setLoading(true);

    try {
      const result: string[] = await readFile(path);
      setLines(result);

      setDeleteCount(await readDelCsvFile(result));

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
              background: "#000000ff",
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

      {deleteCount !== null && (
        <div style={{ marginTop: "20px" }}>
          <h2>Delete Count:</h2>
          <p>{deleteCount}</p>
        </div>
      )}
    </div>
  );
}
