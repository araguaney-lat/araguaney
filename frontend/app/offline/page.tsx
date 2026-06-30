"use client"

export default function OfflinePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#FBF7EE",
        padding: "24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "#F3C033",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
          fontSize: 32,
        }}
      >
        📡
      </div>
      <h1
        style={{
          fontFamily: "var(--font-source-serif)",
          fontSize: 28,
          fontWeight: 600,
          color: "#2B2723",
          margin: "0 0 12px",
        }}
      >
        Sin conexión
      </h1>
      <p style={{ fontSize: 15, color: "#6E6557", margin: "0 0 32px", maxWidth: 320 }}>
        Verifica tu conexión a internet e intenta de nuevo.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          padding: "12px 28px",
          background: "#1F5E8C",
          color: "#fff",
          borderRadius: 10,
          border: "none",
          fontSize: 15,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Reintentar
      </button>
    </div>
  )
}
