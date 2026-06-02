const CONTACT_WHATSAPP = "77000000000";
const CONTACT_EMAIL = "support@aqyl.kz";

export function PremiumModal({ onClose, t }: { onClose: () => void; t: Record<string, string> }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ textAlign: "center", padding: "8px 0 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h3 style={{ marginBottom: 12 }}>Premium</h3>
          <p style={{ color: "var(--muted)", marginBottom: 24, lineHeight: 1.6 }}>
            {t.premium_message ?? "Эта функция доступна в Premium версии. Свяжитесь с нами для подключения."}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href={`https://wa.me/${CONTACT_WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              💬 WhatsApp
            </a>
            <a href={`mailto:${CONTACT_EMAIL}`} className="btn btn-outline">
              ✉️ Email
            </a>
            <button className="btn btn-ghost" onClick={onClose}>{t.cancel}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
