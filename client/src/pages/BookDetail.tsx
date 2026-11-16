import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, post, put, del, Book, Note, User, STATUS_PILL } from "../api";
import { Cover } from "../components/Cover";
import { useAuth } from "../AuthContext";
import { useI18n } from "../i18n";

export default function BookDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tab, setTab] = useState<"summary" | "note" | "quote">("summary");
  const [err, setErr] = useState("");
  const [noteText, setNoteText] = useState("");
  const [notePage, setNotePage] = useState("");
  const [pageInput, setPageInput] = useState("");
  const [loanOpen, setLoanOpen] = useState(false);
  const [members, setMembers] = useState<User[]>([]);
  const [loanTo, setLoanTo] = useState("");
  const [loanName, setLoanName] = useState("");

  const isOwner = book && user && book.user_id === user.id;

  async function load() {
    try {
      const b = await get<Book>(`/books/${id}`);
      setBook(b);
      setPageInput(String(b.current_page || ""));
      setNotes(await get<Note[]>(`/notes/book/${id}`));
    } catch (e: any) {
      setErr(e.message);
    }
  }
  useEffect(() => { load(); }, [id]);

  if (err) return <div className="err">{err}</div>;
  if (!book) return <div className="spin" />;

  const summaries = notes.filter((n) => n.type === "summary");
  const shown = notes.filter((n) => n.type === tab);
  const progress = book.page_count ? Math.min(100, Math.round((book.current_page / book.page_count) * 100)) : 0;

  async function setStatus(status: Book["status"]) {
    const body: any = { status };
    if (status === "reading" && !book!.started_at) body.started_at = new Date().toISOString().slice(0, 10);
    if (status === "finished") {
      body.finished_at = new Date().toISOString().slice(0, 10);
      if (book!.page_count) body.current_page = book!.page_count;
    }
    await put(`/books/${id}`, body);
    load();
  }

  async function saveRating(r: number) {
    await put(`/books/${id}`, { rating: r });
    load();
  }

  async function savePage() {
    await put(`/books/${id}`, { current_page: Number(pageInput) || 0 });
    load();
  }

  async function addNote() {
    if (!noteText.trim()) return;
    await post("/notes", { book_id: book!.id, type: tab, content: noteText.trim(), page_no: notePage ? Number(notePage) : null });
    setNoteText(""); setNotePage("");
    load();
  }

  async function removeNote(nid: number) {
    if (!confirm(t("book.noteDelConfirm"))) return;
    await del(`/notes/${nid}`);
    load();
  }

  async function removeBook() {
    if (!confirm(t("book.delConfirm", { title: book!.title }))) return;
    await del(`/books/${id}`);
    navigate("/library");
  }

  async function openLoan() {
    setMembers(await get<User[]>("/users"));
    setLoanOpen(true);
  }

  async function lend() {
    try {
      await post("/loans", {
        book_id: book!.id,
        lent_to_user_id: loanTo && loanTo !== "other" ? loanTo : undefined,
        lent_to_name: loanTo === "other" ? loanName : undefined,
      });
      setLoanOpen(false);
      load();
    } catch (e: any) { alert(e.message); }
  }

  return (
    <>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <Cover title={book.title} path={book.cover_path} width={140} height={205} fontSize={14} />
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 style={{ fontSize: 22 }}>{book.title}</h1>
          <p className="muted" style={{ margin: "4px 0 10px" }}>
            {book.author}{book.publisher && ` · ${book.publisher}`}{book.publish_year && ` · ${book.publish_year}`}
            {book.page_count && ` · ${book.page_count} ${t("book.page").toLowerCase()}`}
          </p>
          <div className="row" style={{ justifyContent: "flex-start", gap: 8, flexWrap: "wrap" }}>
            <span className={`pill ${STATUS_PILL[book.status]}`}>{t(`status.${book.status}`)}</span>
            {book.active_loan && <span className="pill p-r">{t("lib.onloan")} · {book.active_loan.to}</span>}
            {book.is_private ? <span className="pill p-m">{t("book.private")}</span> : null}
            <span className="pill p-m">{book.owner_name}</span>
            {book.tags.map((t) => (
              <span key={t.id} className="pill" style={{ background: t.color + "26", color: t.color }}>{t.name}</span>
            ))}
          </div>

          {book.genre && <p style={{ fontSize: 13.5, marginTop: 10 }}><b>{t("book.genre")}</b> {book.genre}</p>}
          {book.audience && <p style={{ fontSize: 13.5, marginTop: 4 }}><b>{t("book.audience")}</b> {book.audience}</p>}

          {isOwner && (
            <>
              <div style={{ marginTop: 14 }}>
                <span className="muted" style={{ fontSize: 12 }}>{t("book.rating")} </span>
                {[1, 2, 3, 4, 5].map((r) => (
                  <span key={r} className="st" style={{ cursor: "pointer", fontSize: 20 }}
                    onClick={() => saveRating(r === book.rating ? 0 : r)}>
                    {book.rating >= r ? "★" : "☆"}
                  </span>
                ))}
                <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>{book.rating || "—"}</span>
              </div>
              <div className="topbtns" style={{ marginTop: 12 }}>
                {(["to_read", "reading", "finished", "abandoned"] as const).map((s) =>
                  s !== book.status ? (
                    <button key={s} className="btn gh sm" onClick={() => setStatus(s)}>{t(`statusAct.${s}`)}</button>
                  ) : null
                )}
                {!book.active_loan && <button className="btn gh sm" onClick={openLoan}>{t("book.lend")}</button>}
                <button className="btn gh sm" onClick={() => navigate(`/edit/${book.id}`)}>{t("common.edit")}</button>
                <button className="btn danger sm" onClick={removeBook}>{t("book.del")}</button>
              </div>
            </>
          )}

          {book.status === "reading" && isOwner && (
            <div style={{ marginTop: 14, maxWidth: 340 }}>
              <div className="prog"><i style={{ width: `${progress}%` }} /></div>
              <div className="row" style={{ marginTop: 8, gap: 8 }}>
                <input type="number" style={{ width: 100 }} value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)} placeholder={t("book.page")} />
                <span className="muted" style={{ fontSize: 12 }}>/ {book.page_count || "?"}</span>
                <button className="btn sm" onClick={savePage}>{t("common.save")}</button>
                <span className="muted" style={{ fontSize: 12 }}>%{progress}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {book.description && (
        <div className="blk" style={{ marginTop: 18 }}>
          <b className="t">{t("book.desc")}</b>{book.description}
        </div>
      )}

      <div className="tabs">
        <button className={tab === "summary" ? "on" : ""} onClick={() => setTab("summary")}>{t("book.tabSummary")} ({summaries.length})</button>
        <button className={tab === "note" ? "on" : ""} onClick={() => setTab("note")}>{t("book.tabNotes")} ({notes.filter((n) => n.type === "note").length})</button>
        <button className={tab === "quote" ? "on" : ""} onClick={() => setTab("quote")}>{t("book.tabQuotes")} ({notes.filter((n) => n.type === "quote").length})</button>
      </div>

      {shown.length === 0 && <div className="empty" style={{ padding: 24 }}>{tab === "summary" ? t("book.emptySummary") : tab === "note" ? t("book.emptyNote") : t("book.emptyQuote")}</div>}
      {shown.map((n) => (
        <div key={n.id} className={"note" + (n.type === "quote" ? " quote" : "")}>
          {n.title && <b style={{ display: "block", marginBottom: 6 }}>{n.title}</b>}
          <p>{n.content}</p>
          <div className="nfoot">
            <span>{n.author_name} · {n.created_at?.slice(0, 10)}{n.page_no ? ` · s.${n.page_no}` : ""}</span>
            {(n.user_id === user?.id || user?.role === "admin") && (
              <button className="btn gh sm" onClick={() => removeNote(n.id)}>{t("common.delete")}</button>
            )}
          </div>
        </div>
      ))}

      <div className="card" style={{ marginTop: 14 }}>
        <h4>{tab === "summary" ? t("book.addSummary") : tab === "note" ? t("book.addNote") : t("book.addQuote")}</h4>
        <textarea rows={4} value={noteText} onChange={(e) => setNoteText(e.target.value)}
          placeholder={tab === "quote" ? t("book.quotePh") : t("book.notePh")} />
        <div className="row" style={{ marginTop: 10, gap: 10 }}>
          <input type="number" style={{ width: 120 }} value={notePage}
            onChange={(e) => setNotePage(e.target.value)} placeholder={t("book.pageNo")} />
          <button className="btn sm" onClick={addNote}>{t("common.save")}</button>
        </div>
      </div>

      {loanOpen && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setLoanOpen(false)}>
          <div className="modal">
            <h3>{t("book.lendTitle")}</h3>
            <p className="muted" style={{ fontSize: 13 }}>{t("book.lendWho", { title: book.title })}</p>
            <label>{t("book.person")}</label>
            <select value={loanTo} onChange={(e) => setLoanTo(e.target.value)}>
              <option value="">{t("book.choose")}</option>
              {members.filter((m) => m.id !== user?.id).map((m) => (
                <option key={m.id} value={m.id}>{m.name} {t("book.famTag")}</option>
              ))}
              <option value="other">{t("book.outside")}</option>
            </select>
            {loanTo === "other" && (
              <>
                <label>{t("book.name")}</label>
                <input value={loanName} onChange={(e) => setLoanName(e.target.value)} placeholder={t("book.namePh")} />
              </>
            )}
            <div className="actions">
              <button className="btn" disabled={!loanTo || (loanTo === "other" && !loanName.trim())} onClick={lend}>{t("book.lend")}</button>
              <button className="btn gh" onClick={() => setLoanOpen(false)}>{t("common.cancel")}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
// ref: 34d9db4f7e067d560bb4af3e711898eb⁠​‍⁠​⁠‌​⁠‌‍‌⁠‌‍⁠‌​⁠⁠‌⁠⁠‍​​‌‍‌⁠⁠‌‌‌‌‍​​‍⁠‍⁠‌​‍‍⁠⁠​⁠⁠‍‌⁠​‌​‌‍​‍‌‍​⁠‍‍⁠
