import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get, Note } from "../api";
import { useI18n } from "../i18n";

export default function Quotes() {
  const { t } = useI18n();
  const TYPE_CHIPS: [string, string][] = [
    ["quote", t("quotes.quotes")], ["note", t("quotes.notes")], ["summary", t("quotes.summaries")],
  ];
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [type, setType] = useState("quote");
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams({ type });
    if (q) params.set("q", q);
    const t = setTimeout(() => {
      get<Note[]>(`/notes?${params}`).then(setNotes).catch(() => setNotes([]));
    }, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [type, q]);

  return (
    <>
      <h2>{t("quotes.title")}</h2>
      <input className="search-input" placeholder={t("quotes.searchPh")} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="chips">
        {TYPE_CHIPS.map(([val, label]) => (
          <span key={val} className={"chip" + (type === val ? " on" : "")} onClick={() => setType(val)}>{label}</span>
        ))}
      </div>
      {!notes ? <div className="spin" /> : notes.length === 0 ? (
        <div className="empty"><div className="big">✍️</div>{t("quotes.empty")}</div>
      ) : (
        notes.map((n) => (
          <div key={n.id} className={"note" + (n.type === "quote" ? " quote" : "")}
            onClick={() => navigate(`/book/${n.book_id}`)} style={{ cursor: "pointer" }}>
            {n.title && <b style={{ display: "block", marginBottom: 6 }}>{n.title}</b>}
            <p>{n.type === "quote" ? `"${n.content}"` : n.content}</p>
            <div className="nfoot">
              <span>📖 {n.book_title} — {n.book_author}{n.page_no ? ` · s.${n.page_no}` : ""} · {n.author_name}</span>
            </div>
          </div>
        ))
      )}
    </>
  );
}
