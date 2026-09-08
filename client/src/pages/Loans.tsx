import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get, post } from "../api";
import { Cover } from "../components/Cover";
import { useAuth } from "../AuthContext";
import { useI18n } from "../i18n";

export default function Loans() {
  const [loans, setLoans] = useState<any[] | null>(null);
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  function load() { get("/loans").then(setLoans).catch(() => setLoans([])); }
  useEffect(load, []);

  async function ret(id: number) {
    await post(`/loans/${id}/return`);
    load();
  }

  if (!loans) return <div className="spin" />;
  const active = loans.filter((l) => !l.returned_at);
  const past = loans.filter((l) => l.returned_at);

  return (
    <>
      <h2>{t("loans.title")}</h2>
      {active.length === 0 && <div className="empty"><div className="big">🤝</div>{t("loans.empty")}</div>}
      {active.map((l) => (
        <div key={l.id} className="nowcard" style={{ marginBottom: 10 }}>
          <Cover title={l.book_title} path={l.cover_path} width={44} height={64} fontSize={8} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <b style={{ cursor: "pointer" }} onClick={() => navigate(`/book/${l.book_id}`)}>{l.book_title}</b>
            <br /><small className="muted">
              {l.owner_name} → {l.lent_to_member || l.lent_to_name} · {l.lent_at?.slice(0, 10)}
            </small>
          </div>
          {l.owner_id === user?.id && <button className="btn sm" onClick={() => ret(l.id)}>{t("loans.return")}</button>}
        </div>
      ))}
      {past.length > 0 && (
        <>
          <h2 style={{ marginTop: 26 }}>{t("loans.history")}</h2>
          {past.slice(0, 20).map((l) => (
            <div key={l.id} className="note" style={{ borderLeftColor: "var(--green)" }}>
              <p style={{ fontSize: 13.5 }}>
                <b>{l.book_title}</b> · {l.owner_name} → {l.lent_to_member || l.lent_to_name}
              </p>
              <div className="nfoot"><span>{l.lent_at?.slice(0, 10)} → {l.returned_at?.slice(0, 10)} {t("loans.returned")}</span></div>
            </div>
          ))}
        </>
      )}
    </>
  );
}
