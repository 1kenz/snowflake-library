import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get, User } from "../api";
import { Cover } from "../components/Cover";
import { useI18n } from "../i18n";
import { useAuth } from "../AuthContext";

interface DashData {
  my: { total: number; finished: number; reading: number; to_read: number };
  finishedThisYear: number;
  goal: number;
  year: number;
  monthly: { month: number; count: number }[];
  family: { total_books: number; active_loans: number; total_notes: number; finished_this_month: number };
  reading: any[];
  genres: { name: string; color: string; c: number }[];
}

export default function Dashboard() {
  const [d, setD] = useState<DashData | null>(null);
  const [err, setErr] = useState("");
  const [members, setMembers] = useState<User[]>([]);
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuth();
  const [readingOwner, setReadingOwner] = useState<number | null>(null);
  const ownerId = readingOwner ?? user?.id ?? 0;
  const months = t("months").split(",");

  useEffect(() => {
    get<DashData>("/stats/dashboard").then(setD).catch((e) => setErr(e.message));
    get<User[]>("/users").then(setMembers).catch(() => {});
  }, []);

  if (err) return <div className="err">{err}</div>;
  if (!d) return <div className="spin" />;

  const pct = Math.min(100, Math.round((d.finishedThisYear / Math.max(1, d.goal)) * 100));
  const deg = Math.round((pct / 100) * 360);
  const maxMonthly = Math.max(1, ...d.monthly.map((m) => m.count));

  return (
    <>
      <div className="panel">
        <div className="card">
          <h4>{t("dash.goal", { year: d.year })}</h4>
          <div className="ring" style={{ background: `conic-gradient(var(--accent) ${deg}deg, var(--card2) 0)` }}>
            <i>{d.finishedThisYear}/{d.goal}</i>
          </div>
          <div className="ring-label">
            {t("dash.goalPct", { pct })} {pct >= 100 ? t("dash.goalOver") : pct >= 50 ? t("dash.goalGood") : ""}
          </div>
        </div>
        <div className="card">
          <h4>{t("dash.monthly")}</h4>
          <div className="bars">
            {d.monthly.map((m, i) => (
              <div key={i} title={`${months[m.month]}: ${m.count}`} style={{ height: `${Math.max(4, (m.count / maxMonthly) * 100)}%` }} />
            ))}
          </div>
          <div className="bars-x">{d.monthly.map((m, i) => <span key={i}>{months[m.month]}</span>)}</div>
        </div>
        <div className="card">
          <h4>{t("dash.famSummary")}</h4>
          <div className="kv">
            <div><span>{t("dash.totalBooks")}</span><b>{d.family.total_books}</b></div>
            <div><span>{t("dash.finishedMonth")}</span><b>{d.family.finished_this_month}</b></div>
            <div><span>{t("dash.activeLoans")}</span><b>{d.family.active_loans}</b></div>
            <div><span>{t("dash.totalNotes")}</span><b>{d.family.total_notes}</b></div>
          </div>
        </div>
      </div>

      <h2>{t("dash.reading")}</h2>
      <div className="chips" style={{ marginTop: 0 }}>
        <span className={"chip" + (ownerId === user?.id ? " on" : "")} onClick={() => setReadingOwner(user?.id ?? null)}>
          {t("dash.me")}
        </span>
        {members.filter((m) => m.is_active !== false && m.id !== user?.id).map((m) => (
          <span key={m.id} className={"chip" + (ownerId === m.id ? " on" : "")} onClick={() => setReadingOwner(m.id)}>
            {m.name}
          </span>
        ))}
      </div>
      {d.reading.filter((b) => b.owner_id === ownerId).length === 0 ? (
        <div className="empty"><div className="big">📖</div>{t("dash.noReading")}</div>
      ) : (
        <div className="now">
          {d.reading.filter((b) => b.owner_id === ownerId).map((b) => {
            const p = b.page_count ? Math.min(100, Math.round((b.current_page / b.page_count) * 100)) : 0;
            return (
              <div className="nowcard" key={b.id} onClick={() => navigate(`/book/${b.id}`)}>
                <Cover title={b.title} path={b.cover_path} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ fontSize: 14.5, display: "block" }}>{b.title}</b>
                  <small className="muted">{b.author} · {b.owner_name}</small>
                  <div className="prog"><i style={{ width: `${p}%` }} /></div>
                  <div className="pct">
                    <span>s. {b.current_page} / {b.page_count || "?"}</span><span>%{p}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <h2>{t("dash.myLib")}</h2>
      <div className="panel" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="card">
          <h4>{t("dash.statusCard")}</h4>
          <div className="kv">
            <div><span>{t("dash.total")}</span><b>{d.my.total}</b></div>
            <div><span>{t("dash.finished")}</span><b>{d.my.finished || 0}</b></div>
            <div><span>{t("dash.readingN")}</span><b>{d.my.reading || 0}</b></div>
            <div><span>{t("dash.toRead")}</span><b>{d.my.to_read || 0}</b></div>
          </div>
        </div>
        <div className="card">
          <h4>{t("dash.categories")}</h4>
          {d.genres.length === 0 ? (
            <span className="muted" style={{ fontSize: 13 }}>{t("dash.noTags")}</span>
          ) : (
            <div className="chips" style={{ margin: 0 }}>
              {d.genres.map((g) => (
                <span key={g.name} className="chip" style={{ borderColor: g.color, color: g.color }}>
                  {g.name} · {g.c}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="topbtns" style={{ marginTop: 20 }}>
        <button className="btn" onClick={() => navigate("/add")}>{t("dash.addBook")}</button>
        <button className="btn gh" onClick={() => navigate("/library")}>{t("dash.toLibrary")}</button>
      </div>
    </>
  );
}
// ref: 0ab9dc819134204c4f089a0502634385⁠​‍⁠​​‍‍‍⁠‍‌⁠‌⁠​‍​​‌‍‌​‌​⁠‌​​‍​​‌​⁠​‌​⁠⁠​​‍​‍‌‍‍​​‌‌​​​‍‌‍​⁠‌​​⁠‍​‌‌
