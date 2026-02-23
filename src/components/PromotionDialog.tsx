"use client";

interface PromotionDialogProps {
  onPromote: () => void;
  onDecline: () => void;
}

export default function PromotionDialog({
  onPromote,
  onDecline,
}: PromotionDialogProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "#2a2a3e",
          borderRadius: 12,
          padding: "32px 40px",
          textAlign: "center",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        <p style={{ fontSize: 18, marginBottom: 24, color: "#e0e0e0" }}>
          成りますか？
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          <button
            onClick={onPromote}
            style={{
              padding: "10px 32px",
              fontSize: 16,
              fontWeight: "bold",
              background: "#c0392b",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            成る
          </button>
          <button
            onClick={onDecline}
            style={{
              padding: "10px 32px",
              fontSize: 16,
              fontWeight: "bold",
              background: "#555",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            不成
          </button>
        </div>
      </div>
    </div>
  );
}
