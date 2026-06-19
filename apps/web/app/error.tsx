"use client";

import { useEffect } from "react";

// Global error boundary for the App Router. Any uncaught error thrown while rendering
// a route segment is caught here instead of crashing the whole app to a blank screen.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error for diagnostics; replace with a real error-reporting service later.
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 24,
        textAlign: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h2 style={{ fontSize: 22, fontWeight: 700 }}>Что-то пошло не так</h2>
      <p style={{ color: "#6b7280", maxWidth: 420 }}>
        Произошла непредвиденная ошибка. Попробуйте обновить страницу или повторить действие.
      </p>
      <button
        onClick={reset}
        style={{
          padding: "10px 20px",
          borderRadius: 8,
          border: "none",
          background: "#2e2780",
          color: "#fff",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Попробовать снова
      </button>
    </div>
  );
}
