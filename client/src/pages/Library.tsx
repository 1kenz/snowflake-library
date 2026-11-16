import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get, Book, STATUS_PILL, stars } from "../api";
import { Cover } from "../components/Cover";
import { useI18n } from "../i18n";

export default function Library({ scope, wishlist = false }: { scope: "mine" | "family"; wishlist?: boolean }) {
  const { t } = useI18n();
  const STATUS_CHIPS: [string, string][] = [
    ["", t("lib.all")], ["reading", t("status.reading")], ["to_read", t("status.to_read")],
    ["finished", t("status.finished")], ["abandoned", t("lib.half")],
  ];
  const [books, setBooks] = useState<Book[] | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("created");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams({ scope, sort });
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    if (wishlist) params.set("wishlist", "1");
    const t = setTimeout(() => {
      get<Book[]>(`/books?${params}`).then(setBooks).catch((e) => setErr(e.message));
    }, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [scope, q, status, sort, wishlist]);

  return (
    <>
      <div className="hdr" style={{ paddingTop: 0 }}>
        <h2 style={{ margin: 0 }}>
          {wishlist ? t("lib.wishlist") : scope === "family" ? t("lib.family") : t("lib.mine")}
          {books && <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}> · {t("lib.bookCount", { n: books.length })}</span>}
        </h2>
        <div className="topbtns">
          <button className="btn gh sm" onClick={() => setView(view === "grid" ? "list" : "grid")}>
            {view === "grid" ? t("lib.list") : t("lib.grid")}
          </button>
          <select style={{ width: "auto" }} value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="created">{t("lib.sortCreated")}</option>
            <option value="title">{t("lib.sortTitle")}</option>
            <option value="author">{t("lib.sortAuthor")}</option>
            <option value="rating">{t("lib.sortRating")}</option>
            <option value="year">{t("lib.sortYear")}</option>
          </select>
          <button className="btn sm" onClick={() => navigate("/add")}>{t("common.add")}</button>
        </div>
      </div>

      <input className="search-input" placeholder={t("lib.searchPh")}
        value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="chips">
        {STATUS_CHIPS.map(([val, label]) => (
          <span key={val} className={"chip" + (status === val ? " on" : "")} onClick={() => setStatus(val)}>{label}</span>
        ))}
        {!wishlist && scope === "mine" && (
          <span className="chip" onClick={() => navigate("/wishlist")}>{t("lib.wishChip")}</span>
        )}
      </div>

      {err && <div className="err">{err}</div>}
      {!books ? (
        <div className="spin" />
      ) : books.length === 0 ? (
        <div className="empty">
          <div className="big">📚</div>
          {q ? t("lib.emptySearch") : t("lib.empty")}
        </div>
      ) : view === "grid" ? (
        <div className="grid">
          {books.map((b) => (
            <div className="bookcard" key={b.id} onClick={() => navigate(`/book/${b.id}`)}>
              <Cover title={b.title} path={b.cover_path} width="100%" height="auto" fontSize={13} />
              <div className="meta">
                <b>{b.title}</b>
                <small>{b.author || "—"}{scope === "family" ? ` · ${b.owner_name}` : ""}</small>
                <div className="row">
                  <span className="st">{stars(b.rating)}</span>
                  <span className={`pill ${b.active_loan ? "p-r" : STATUS_PILL[b.status]}`}>
                    {b.active_loan ? t("lib.onloan") : t(`status.${b.status}`)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <table>
          <thead>
            <tr><th>{t("lib.book")}</th>{scope === "family" && <th>{t("lib.owner")}</th>}<th>{t("lib.ratingCol")}</th><th>{t("lib.statusCol")}</th></tr>
          </thead>
          <tbody>
            {books.map((b) => (
              <tr key={b.id} onClick={() => navigate(`/book/${b.id}`)}>
                <td><b>{b.title}</b><br /><small className="muted">{b.author}</small></td>
                {scope === "family" && <td>{b.owner_name}</td>}
                <td className="st">{stars(b.rating)}</td>
                <td>
                  <span className={`pill ${b.active_loan ? "p-r" : STATUS_PILL[b.status]}`}>
                    {b.active_loan ? `${t("lib.onloan")} · ${b.active_loan.to}` : t(`status.${b.status}`)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
// ref: 2d6fb13fdc7289b43bf4a3d1aae0936e⁠​‍⁠​‍⁠‌‌‍⁠⁠‍⁠​‌​⁠⁠⁠⁠‌⁠​‌⁠​‍‍​‍‌‍⁠‌​​⁠‍⁠⁠⁠‌​‍‍​⁠⁠‌​‌‍‍‍‍⁠‍​​‍‌​⁠‌‍⁠‍
