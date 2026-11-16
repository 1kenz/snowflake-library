import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { get, post, put, Book } from "../api";
import { Cover } from "../components/Cover";
import { useI18n } from "../i18n";

const empty = {
  title: "", author: "", publisher: "", publish_year: "", isbn: "", page_count: "",
  language: "tr", description: "", genre: "", audience: "", series_name: "", series_index: "",
  status: "to_read", is_wishlist: 0, is_private: 0, cover_path: "", tags: "" as string,
};

export default function BookForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const location = useLocation();
  const prefill = (location.state as any)?.prefill;
  const [f, setF] = useState<any>({ ...empty });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [isbnBusy, setIsbnBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      get<Book>(`/books/${id}`).then((b) =>
        setF({
          ...empty, ...b,
          publish_year: b.publish_year ?? "", page_count: b.page_count ?? "",
          series_index: b.series_index ?? "", tags: b.tags.map((t) => t.name).join(", "),
        })
      ).catch((e) => setErr(e.message));
    } else if (prefill) {
      setF({ ...empty, ...prefill, tags: (prefill.tags || []).join(", ") });
    }
  }, [id]);

  function set(k: string, v: any) { setF((p: any) => ({ ...p, [k]: v })); }

  async function lookupIsbn() {
    if (!f.isbn) return;
    setIsbnBusy(true); setErr("");
    try {
      const r = await get(`/lookup/isbn/${encodeURIComponent(f.isbn)}`);
      let cover_path = f.cover_path;
      if (r.cover_url && !cover_path) {
        try { cover_path = (await post("/books/cover/from-url", { url: r.cover_url })).cover_path; } catch {}
      }
      setF((p: any) => ({
        ...p,
        title: r.title || p.title, author: r.author || p.author, publisher: r.publisher || p.publisher,
        publish_year: r.publish_year ?? p.publish_year, page_count: r.page_count ?? p.page_count,
        language: r.language || p.language, description: r.description || p.description,
        tags: p.tags || (r.categories || []).slice(0, 3).join(", "), cover_path,
      }));
    } catch (e: any) { setErr(e.message); }
    finally { setIsbnBusy(false); }
  }

  async function uploadCover(file: File) {
    const fd = new FormData();
    fd.append("cover", file);
    try {
      const r = await post("/books/cover/upload", fd);
      set("cover_path", r.cover_path);
    } catch (e: any) { setErr(e.message); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const body = {
      ...f,
      publish_year: f.publish_year ? Number(f.publish_year) : null,
      page_count: f.page_count ? Number(f.page_count) : null,
      series_index: f.series_index ? Number(f.series_index) : null,
      tags: String(f.tags).split(",").map((s: string) => s.trim()).filter(Boolean),
    };
    try {
      if (id) { await put(`/books/${id}`, body); navigate(`/book/${id}`); }
      else { const r = await post("/books", body); navigate(`/book/${r.id}`); }
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 640 }}>
      <h2>{id ? t("form.editTitle") : t("form.addTitle")}</h2>

      <div style={{ display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <Cover title={f.title || "?"} path={f.cover_path} width={120} height={176} fontSize={12} />
          <input ref={fileRef} type="file" accept="image/*" hidden
            onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])} />
          <button type="button" className="btn gh sm" style={{ width: "100%", marginTop: 8 }}
            onClick={() => fileRef.current?.click()}>{t("form.cover")}</button>
        </div>
        <div style={{ flex: 1, minWidth: 260 }}>
          <label>ISBN</label>
          <div className="row" style={{ gap: 8 }}>
            <input value={f.isbn} onChange={(e) => set("isbn", e.target.value)} placeholder="9789750718531" />
            <button type="button" className="btn gh sm" onClick={lookupIsbn} disabled={isbnBusy}>
              {isbnBusy ? "…" : t("form.find")}
            </button>
          </div>
          <label>{t("form.title")}</label>
          <input required value={f.title} onChange={(e) => set("title", e.target.value)} />
          <label>{t("form.author")}</label>
          <input value={f.author} onChange={(e) => set("author", e.target.value)} />
        </div>
      </div>

      <div className="form2">
        <div><label>{t("form.publisher")}</label><input value={f.publisher} onChange={(e) => set("publisher", e.target.value)} /></div>
        <div><label>{t("form.year")}</label><input type="number" value={f.publish_year} onChange={(e) => set("publish_year", e.target.value)} /></div>
        <div><label>{t("form.pages")}</label><input type="number" value={f.page_count} onChange={(e) => set("page_count", e.target.value)} /></div>
        <div><label>{t("form.lang")}</label>
          <select value={f.language} onChange={(e) => set("language", e.target.value)}>
            <option value="tr">{t("form.langTr")}</option><option value="en">{t("form.langEn")}</option>
            <option value="de">{t("form.langDe")}</option><option value="fr">{t("form.langFr")}</option><option value="">{t("form.langOther")}</option>
          </select>
        </div>
        <div><label>{t("form.series")}</label><input value={f.series_name} onChange={(e) => set("series_name", e.target.value)} /></div>
        <div><label>{t("form.seriesIdx")}</label><input type="number" value={f.series_index} onChange={(e) => set("series_index", e.target.value)} /></div>
        <div><label>{t("form.status")}</label>
          <select value={f.status} onChange={(e) => set("status", e.target.value)}>
            <option value="to_read">{t("status.to_read")}</option><option value="reading">{t("status.reading")}</option>
            <option value="finished">{t("status.finished")}</option><option value="abandoned">{t("status.abandoned")}</option>
          </select>
        </div>
        <div><label>{t("form.genre")}</label><input value={f.genre} onChange={(e) => set("genre", e.target.value)} placeholder={t("form.genrePh")} /></div>
      </div>

      <label>{t("form.tags")}</label>
      <input value={f.tags} onChange={(e) => set("tags", e.target.value)} placeholder={t("form.tagsPh")} />
      <label>{t("form.desc")}</label>
      <textarea rows={4} value={f.description} onChange={(e) => set("description", e.target.value)} />
      <label>{t("form.audience")}</label>
      <input value={f.audience} onChange={(e) => set("audience", e.target.value)} placeholder={t("form.audiencePh")} />

      <div className="row" style={{ justifyContent: "flex-start", gap: 18, marginTop: 14 }}>
        <label style={{ margin: 0, display: "flex", alignItems: "center", gap: 6, textTransform: "none" }}>
          <input type="checkbox" style={{ width: "auto" }} checked={!!f.is_wishlist}
            onChange={(e) => set("is_wishlist", e.target.checked ? 1 : 0)} /> {t("form.wishlist")}
        </label>
        <label style={{ margin: 0, display: "flex", alignItems: "center", gap: 6, textTransform: "none" }}>
          <input type="checkbox" style={{ width: "auto" }} checked={!!f.is_private}
            onChange={(e) => set("is_private", e.target.checked ? 1 : 0)} /> {t("form.private")}
        </label>
      </div>

      {err && <div className="err">{err}</div>}
      <div className="actions">
        <button className="btn" disabled={busy}>{busy ? t("form.saving") : id ? t("form.update") : t("common.save")}</button>
        <button type="button" className="btn gh" onClick={() => navigate(-1)}>{t("common.cancel")}</button>
      </div>
    </form>
  );
}
// ref: 5d6435d56bb3ff4df3feb3eae6f44b9e⁠​‍⁠‌‌⁠‌‌‍‌​​⁠‌‌⁠‌‌‌‌‍‍⁠‍⁠​⁠⁠⁠⁠⁠‌​⁠‌⁠⁠​⁠⁠⁠⁠‍‍⁠​⁠⁠‍‍‍⁠‍‌‍⁠⁠‌​‌​‍⁠‍‌⁠‍
